const db = require('../database/sqlite');
const { logAuditEvent } = require('./auditLogger');

const CRISIS_KEYWORDS = [
    'suicide', 'kill myself', 'end my life', 'hurt myself', 'die', 'self-harm',
    'want to die', 'no reason to live', "can't go on", 'give up', 'hang myself', 'overdose'
];

const HIGH_DISTRESS_KEYWORDS = [
    'panic attack', 'terrified', 'paralyzed', 'unbearable', 'severe depression', 'hopeless', 'worthless'
];

/**
 * Multi-Signal Risk Assessment:
 * Synthesizes PHQ-9 (0-27), GAD-7 (0-21), dedicated safety item, conversational cues, and mood trend.
 */
const evaluateMultiSignalRisk = async (userId, incomingSignal = {}) => {
    let score = 0;
    const triggeredSignals = [];
    let safetyFlag = false;

    // 1. Check conversational / immediate message text if present
    if (incomingSignal.messageText) {
        const text = incomingSignal.messageText.toLowerCase();
        
        const hasCrisis = CRISIS_KEYWORDS.some(k => new RegExp(`\\b${k}\\b`, 'i').test(text));
        if (hasCrisis) {
            score += 90;
            safetyFlag = true;
            triggeredSignals.push({ type: 'CONVERSATIONAL_CRISIS_KEYWORD', signal: 'Explicit crisis or self-harm keywords' });
        }

        const highDistress = HIGH_DISTRESS_KEYWORDS.filter(k => new RegExp(`\\b${k}\\b`, 'i').test(text));
        if (highDistress.length > 0) {
            score += highDistress.length * 15;
            triggeredSignals.push({ type: 'HIGH_DISTRESS_KEYWORDS', signal: `Distress indicators: ${highDistress.join(', ')}` });
        }
    }

    // 2. Query latest assessment scores & safety item from Database
    const assessment = await new Promise((resolve) => {
        db.get(`SELECT * FROM Assessments WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1`, [userId], (err, row) => {
            resolve(row || null);
        });
    });

    if (assessment) {
        const phqScore = assessment.depression_score || 0;
        const gadScore = assessment.anxiety_score || 0;
        const selfHarmRisk = assessment.self_harm_risk;

        if (selfHarmRisk) {
            score += 85;
            safetyFlag = true;
            triggeredSignals.push({ type: 'SAFETY_SCREEN_POSITIVE', signal: 'PHQ-9 Item 9 / Safety screening indicated self-harm ideation' });
        }

        if (phqScore >= 20 || gadScore >= 15) {
            score += 45;
            triggeredSignals.push({ type: 'SEVERE_ASSESSMENT_SCORE', signal: `Severe depression/anxiety (PHQ-9: ${phqScore}, GAD-7: ${gadScore})` });
        } else if (phqScore >= 15 || gadScore >= 10) {
            score += 25;
            triggeredSignals.push({ type: 'MODERATE_ASSESSMENT_SCORE', signal: `Moderate symptoms (PHQ-9: ${phqScore}, GAD-7: ${gadScore})` });
        }
    }

    // 3. Query recent mood trend drift (last 5 entries)
    const recentMoods = await new Promise((resolve) => {
        db.all(`SELECT mood_score FROM Mood_Logs WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT 5`, [userId], (err, rows) => {
            resolve(rows || []);
        });
    });

    if (recentMoods.length >= 3) {
        const avgMood = recentMoods.reduce((a, b) => a + b.mood_score, 0) / recentMoods.length;
        if (avgMood <= 3.6) {
            score += 20;
            triggeredSignals.push({ type: 'LONGITUDINAL_MOOD_DECLINE', signal: `Consistently low mood trajectory (Avg: ${avgMood.toFixed(1)}/10)` });
        }
    }

    // Determine Risk Level
    let riskLevel = 'LOW';
    let actionTaken = 'CONTINUE_ROUTINE_MONITORING';

    if (safetyFlag || score >= 85) {
        riskLevel = 'CRITICAL';
        actionTaken = 'IMMEDIATE_SAFETY_PROTOCOL_AND_CLINICAL_ESCALATION';
    } else if (score >= 50) {
        riskLevel = 'HIGH';
        actionTaken = 'CLINICAL_REVIEW_QUEUE_AND_APPOINTMENT_RECOMMENDATION';
    } else if (score >= 25) {
        riskLevel = 'MODERATE';
        actionTaken = 'ENHANCED_MONITORING_AND_TARGETED_INTERVENTIONS';
    } else {
        riskLevel = 'LOW';
        actionTaken = 'WELLNESS_PLAN_AND_ROUTINE_AI_COMPANION';
    }

    // Persist Risk Evaluation Record in DB
    const evalSql = `INSERT INTO Risk_Evaluations (user_id, risk_level, risk_score, triggered_signals, action_taken, clinician_review_status)
                     VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.run(evalSql, [
        userId,
        riskLevel,
        score,
        JSON.stringify(triggeredSignals),
        actionTaken,
        riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? 'ESCALATED' : 'REVIEWED'
    ], function(err) {
        if (!err) {
            logAuditEvent('RISK_EVALUATED', userId, null, 'SYSTEM', {
                riskLevel,
                riskScore: score,
                signalsCount: triggeredSignals.length
            });
        }
    });

    return {
        riskLevel,
        riskScore: score,
        triggeredSignals,
        actionTaken,
        isCrisis: riskLevel === 'CRITICAL'
    };
};

module.exports = {
    evaluateMultiSignalRisk,
    CRISIS_KEYWORDS
};
