const db = require('../database/sqlite');
const { logAuditEvent } = require('./auditLogger');

const CRISIS_KEYWORDS = [
    'suicide', 'kill myself', 'end my life', 'hurt myself', 'die', 'self-harm',
    'want to die', 'no reason to live', "can't go on", 'give up', 'hang myself', 'overdose'
];

const HIGH_DISTRESS_KEYWORDS = [
    'panic attack', 'terrified', 'paralyzed', 'unbearable', 'severe depression', 'hopeless', 'worthless'
];

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const keywordPattern = (keyword) => {
    // Multi-word phrases keep full word-boundary anchors. Single words accept common
    // affixes (e.g. "suicide" → "suicidal", "die" → "dies"/"dying") to avoid false negatives.
    const core = escapeRegExp(keyword);
    return keyword.includes(' ')
        ? new RegExp(`\\b${core}\\b`, 'i')
        : new RegExp(`\\b${core}[a-z]*`, 'i');
};

/**
 * Computes the linear regression slope of a user's mood scores over the last `days` entries.
 * A slope < WORSENING_SLOPE_THRESHOLD indicates a consistent downward trend.
 *
 * Returns the slope per entry (not per day — entries may not be daily).
 * A value of -0.15 or less is considered a worsening trend worth surfacing.
 */
const WORSENING_SLOPE_THRESHOLD = -0.15;

const computeMoodSlope = async (userId, limit = 14) => {
    const rows = await new Promise((resolve) => {
        db.all(
            `SELECT mood_score FROM Mood_Logs WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT ?`,
            [userId, limit],
            (err, rows) => resolve(rows || [])
        );
    });

    if (rows.length < 4) return { slope: 0, worseningTrend: false };

    // Reverse so index 0 = oldest
    const values = rows.map(r => r.mood_score).reverse();
    const n = values.length;
    const sumX  = n * (n - 1) / 2;
    const sumX2 = n * (n - 1) * (2 * n - 1) / 6;
    const sumY  = values.reduce((a, v) => a + v, 0);
    const sumXY = values.reduce((a, v, i) => a + i * v, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return {
        slope: Number(slope.toFixed(4)),
        worseningTrend: slope < WORSENING_SLOPE_THRESHOLD
    };
};

/**
 * Multi-Signal Risk Assessment:
 * Synthesizes PHQ-9 (0-27), GAD-7 (0-21), dedicated safety item, conversational cues, and mood trend.
 */
const evaluateMultiSignalRisk = async (userId, incomingSignal = {}) => {
    let score = 0;
    const triggeredSignals = [];
    let safetyFlag = false;
    let hasConversationalCrisis = false;

    // 1. Check conversational / immediate message text if present
    if (incomingSignal.messageText) {
        const text = incomingSignal.messageText.toLowerCase();

        const hasCrisis = CRISIS_KEYWORDS.some(k => keywordPattern(k).test(text));
        if (hasCrisis) {
            score += 90;
            safetyFlag = true;
            hasConversationalCrisis = true;
            triggeredSignals.push({ type: 'CONVERSATIONAL_CRISIS_KEYWORD', signal: 'Explicit crisis or self-harm keywords' });
        }

        const highDistress = HIGH_DISTRESS_KEYWORDS.filter(k => keywordPattern(k).test(text));
        if (highDistress.length > 0) {
            score += highDistress.length * 15;
            triggeredSignals.push({ type: 'HIGH_DISTRESS_KEYWORDS', signal: `Distress indicators: ${highDistress.join(', ')}` });
        }
    }

    // 1b. LLM defense-in-depth secondary signal (stripped before display; never locks chat alone)
    if (incomingSignal.llmRiskFlag) {
        score += 20;
        triggeredSignals.push({
            type:   'LLM_RISK_FLAG',
            signal: `AI companion detected possible risk: ${incomingSignal.llmRiskFlag}`
        });
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
            score += 40;
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

    // 4. Worsening trend detection via linear regression over last 14 mood entries
    const { slope, worseningTrend } = await computeMoodSlope(userId);
    if (worseningTrend) {
        score += 15;
        triggeredSignals.push({
            type:   'WORSENING_TREND',
            signal: `Mood declining (slope ${slope}/entry over last 14 logs) — may need proactive outreach`
        });
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
        isCrisis: hasConversationalCrisis,
        worseningTrend: worseningTrend ?? false
    };
};

module.exports = {
    evaluateMultiSignalRisk,
    computeMoodSlope,
    CRISIS_KEYWORDS
};
