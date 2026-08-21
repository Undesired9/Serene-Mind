const express = require('express');
const router = express.Router();
const db = require('../database/sqlite');
const { verifyToken, requireDoctor } = require('../middleware/auth');
const { logAuditEvent } = require('../services/auditLogger');

const getSeverity = (score = 0) => {
    if (score <= 9) return 'Minimal';
    if (score <= 19) return 'Mild';
    if (score <= 34) return 'Moderate';
    return 'Severe';
};

// GET /api/doctor/patients - Fetch all patients and their latest risk status categorized by triage queues
router.get('/patients', verifyToken, requireDoctor, (req, res) => {
    const sql = `
        SELECT 
            u.id, u.username, u.email, u.created_at,
            pi.full_legal_name, pi.presenting_problem, pi.symptom_severity,
            a.depression_score as phq9_score, a.anxiety_score as gad7_score, a.total_score, 
            a.main_concern, a.self_harm_risk, a.timestamp as assessment_date,
            re.risk_level, re.risk_score, re.triggered_signals, re.action_taken, re.created_at as risk_evaluated_at,
            (SELECT COUNT(*) FROM Sessions WHERE user_id = u.id) as total_sessions,
            (SELECT AVG(mood_score) FROM Mood_Logs WHERE user_id = u.id) as avg_mood
        FROM Users u
        LEFT JOIN Patient_Intake pi ON u.id = pi.user_id
        LEFT JOIN Assessments a ON u.id = a.user_id
        LEFT JOIN Risk_Evaluations re ON u.id = re.user_id AND re.id = (
            SELECT MAX(id) FROM Risk_Evaluations WHERE user_id = u.id
        )
        ORDER BY 
            CASE 
                WHEN re.risk_level = 'CRITICAL' THEN 1
                WHEN a.self_harm_risk = 1 THEN 2
                WHEN re.risk_level = 'HIGH' THEN 3
                WHEN re.risk_level = 'MODERATE' THEN 4
                ELSE 5
            END,
            a.total_score DESC, u.created_at DESC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching patients:', err);
            return res.status(500).json({ error: 'Failed to fetch patients list' });
        }
        
        // Categorize into prioritized clinical queues
        const categorized = {
            criticalAttention: [],
            highPriority: [],
            monitoring: [],
            stable: [],
            all: []
        };

        rows.forEach(row => {
            const phq = row.phq9_score || 0;
            const gad = row.gad7_score || 0;
            const isSelfHarm = !!row.self_harm_risk;
            const calculatedLevel = row.risk_level || (isSelfHarm ? 'CRITICAL' : (phq >= 15 || gad >= 15 ? 'HIGH' : (phq >= 10 || gad >= 10 ? 'MODERATE' : 'LOW')));

            const patientObj = {
                ...row,
                full_name: row.full_legal_name || row.username,
                risk_level: calculatedLevel,
                severity: row.total_score != null ? getSeverity(row.total_score) : null,
                crisis_risk: isSelfHarm || calculatedLevel === 'CRITICAL',
                avg_mood: row.avg_mood ? Math.round(row.avg_mood * 10) / 10 : null,
                signals: row.triggered_signals ? JSON.parse(row.triggered_signals) : []
            };

            categorized.all.push(patientObj);

            if (calculatedLevel === 'CRITICAL' || isSelfHarm) {
                categorized.criticalAttention.push(patientObj);
            } else if (calculatedLevel === 'HIGH') {
                categorized.highPriority.push(patientObj);
            } else if (calculatedLevel === 'MODERATE') {
                categorized.monitoring.push(patientObj);
            } else {
                categorized.stable.push(patientObj);
            }
        });

        res.json(categorized.all);
    });
});

// GET /api/doctor/patients/:id - Detailed patient profile with longitudinal timeline & care plan
router.get('/patients/:id', verifyToken, requireDoctor, (req, res) => {
    const patientId = req.params.id;
    const clinicianId = req.user.id;

    // Log audit event for compliance
    logAuditEvent('CLINICIAN_VIEWED_PATIENT', patientId, clinicianId, 'CLINICIAN', { patientId });

    db.get(`SELECT id, username, email, created_at FROM Users WHERE id = ?`, [patientId], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error fetching user' });
        if (!user) return res.status(404).json({ error: 'Patient not found' });

        db.get(`SELECT * FROM Assessments WHERE user_id = ?`, [patientId], (err, assessment) => {
            if (err) return res.status(500).json({ error: 'Database error fetching assessment' });

            db.get(`SELECT * FROM Patient_Intake WHERE user_id = ?`, [patientId], (err, intake) => {
                if (err) return res.status(500).json({ error: 'Database error fetching intake' });

                db.all(`SELECT id, mood_score, notes, date FROM Mood_Logs WHERE user_id = ? ORDER BY date DESC LIMIT 30`, [patientId], (err, mood_logs) => {
                    if (err) return res.status(500).json({ error: 'Database error fetching mood logs' });

                    db.all(`SELECT * FROM Risk_Evaluations WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`, [patientId], (err, riskEvaluations) => {
                        if (err) return res.status(500).json({ error: 'Database error fetching risk evaluations' });

                        db.all(`SELECT * FROM Care_Plans WHERE patient_id = ? ORDER BY updated_at DESC`, [patientId], (err, carePlans) => {
                            if (err) return res.status(500).json({ error: 'Database error fetching care plans' });

                            db.all(`SELECT * FROM Appointments WHERE patient_id = ? ORDER BY appointment_datetime DESC`, [patientId], (err, appointments) => {
                                if (err) return res.status(500).json({ error: 'Database error fetching appointments' });

                                res.json({
                                    user,
                                    intake: intake || null,
                                    assessment: assessment ? {
                                        ...assessment,
                                        phq9_score: assessment.depression_score,
                                        gad7_score: assessment.anxiety_score,
                                        severity: getSeverity(assessment.total_score),
                                        crisis_risk: !!assessment.self_harm_risk
                                    } : null,
                                    mood_logs: mood_logs || [],
                                    risk_evaluations: riskEvaluations || [],
                                    care_plans: carePlans || [],
                                    appointments: appointments || []
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// POST /api/doctor/patients/:id/care-plan - Create or update a care plan
router.post('/patients/:id/care-plan', verifyToken, requireDoctor, (req, res) => {
    const patientId = req.params.id;
    const clinicianId = req.user.id;
    const { primary_diagnosis_notes, goals, recommended_interventions, follow_up_date, status = 'ACTIVE' } = req.body;

    const sql = `INSERT INTO Care_Plans (patient_id, clinician_id, primary_diagnosis_notes, goals, recommended_interventions, follow_up_date, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [patientId, clinicianId, primary_diagnosis_notes, goals, recommended_interventions, follow_up_date, status], function(err) {
        if (err) {
            console.error('Error saving care plan:', err);
            return res.status(500).json({ error: 'Failed to save care plan.' });
        }

        logAuditEvent('CARE_PLAN_CREATED', patientId, clinicianId, 'CLINICIAN', { carePlanId: this.lastID });
        res.status(201).json({ message: 'Care plan created successfully', carePlanId: this.lastID });
    });
});

module.exports = router;
