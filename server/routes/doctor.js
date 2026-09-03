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

// Shared SQL block to select a patient summary with latest risk evaluation
const PATIENT_SUMMARY_SQL = (whereClause) => `
    SELECT
        u.id, u.username, u.email, u.created_at,
        pi.full_legal_name, pi.presenting_problem, pi.symptom_severity, pi.care_status,
        a.depression_score as phq9_score, a.anxiety_score as gad7_score, a.total_score,
        a.main_concern, a.self_harm_risk, a.timestamp as assessment_date,
        re.risk_level, re.risk_score, re.triggered_signals, re.action_taken,
        re.manual_override_tier, re.override_reason,
        re.created_at as risk_evaluated_at,
        (SELECT COUNT(*) FROM Sessions WHERE user_id = u.id) as total_sessions,
        (SELECT AVG(mood_score) FROM Mood_Logs WHERE user_id = u.id) as avg_mood
    FROM Users u
    LEFT JOIN Patient_Intake pi ON u.id = pi.user_id
    LEFT JOIN Assessments    a  ON u.id = a.user_id
    LEFT JOIN Risk_Evaluations re ON u.id = re.user_id AND re.id = (
        SELECT MAX(id) FROM Risk_Evaluations WHERE user_id = u.id
    )
    ${whereClause}
`;

const buildPatientObj = (row) => {
    const phq = row.phq9_score || 0;
    const gad = row.gad7_score || 0;
    const isSelfHarm = !!row.self_harm_risk;
    const effectiveTier = row.manual_override_tier
        || row.risk_level
        || (isSelfHarm ? 'CRITICAL' : (phq >= 15 || gad >= 15 ? 'HIGH' : (phq >= 10 || gad >= 10 ? 'MODERATE' : 'LOW')));

    return {
        ...row,
        full_name:    row.full_legal_name || row.username,
        risk_level:   effectiveTier,
        is_overridden: !!row.manual_override_tier,
        severity:     row.total_score != null ? getSeverity(row.total_score) : null,
        crisis_risk:  isSelfHarm || effectiveTier === 'CRITICAL',
        avg_mood:     row.avg_mood ? Math.round(row.avg_mood * 10) / 10 : null,
        signals:      row.triggered_signals ? JSON.parse(row.triggered_signals) : [],
        care_status:  row.care_status || 'ACTIVE'
    };
};

/**
 * GET /api/doctor/patients
 * Returns the authenticated doctor's assigned patients (scoped caseload)
 * plus an `unassigned` pool of patients with no active assignment — for claiming.
 *
 * Privacy fix: no longer returns ALL patients to any authenticated doctor.
 */
router.get('/patients', verifyToken, requireDoctor, async (req, res) => {
    const doctorId = req.user.id;

    try {
        // ─ 1. Assigned caseload (privacy-scoped) ─────────────────────────────────────
        const assignedSql = PATIENT_SUMMARY_SQL(`
            INNER JOIN Patient_Doctor_Assignments pda
                ON u.id = pda.patient_id AND pda.doctor_id = ${doctorId} AND pda.status = 'ACTIVE'
            ORDER BY
                CASE
                    WHEN re.risk_level = 'CRITICAL' THEN 1
                    WHEN a.self_harm_risk = 1       THEN 2
                    WHEN re.risk_level = 'HIGH'     THEN 3
                    WHEN re.risk_level = 'MODERATE' THEN 4
                    ELSE 5
                END,
                a.total_score DESC, u.created_at DESC
        `);

        const assignedRows = await db.queryAll(assignedSql, []);
        const assigned = assignedRows.map(buildPatientObj);

        // Categorize into clinical queues
        const queues = { criticalAttention: [], highPriority: [], monitoring: [], stable: [] };
        assigned.forEach(p => {
            if (p.crisis_risk)                       queues.criticalAttention.push(p);
            else if (p.risk_level === 'HIGH')        queues.highPriority.push(p);
            else if (p.risk_level === 'MODERATE')    queues.monitoring.push(p);
            else                                      queues.stable.push(p);
        });

        // ─ 2. Unassigned pool (patients with no active assignment from any doctor) ───
        const unassignedSql = PATIENT_SUMMARY_SQL(`
            WHERE u.id NOT IN (
                SELECT patient_id FROM Patient_Doctor_Assignments WHERE status = 'ACTIVE'
            )
            ORDER BY re.risk_score DESC NULLS LAST, u.created_at DESC
        `);

        const unassignedRows = await db.queryAll(unassignedSql, []);
        const unassigned = unassignedRows.map(buildPatientObj);

        logAuditEvent('CLINICIAN_VIEWED_PATIENT_LIST', null, doctorId, 'CLINICIAN', {
            assignedCount: assigned.length,
            unassignedCount: unassigned.length
        });

        return res.json({
            assigned,
            unassigned,
            queues,
            ...queues,  // legacy flat keys for existing frontend
            all: assigned
        });
    } catch (err) {
        console.error('Error fetching patients:', err);
        return res.status(500).json({ error: 'Failed to fetch patients list' });
    }
});

// GET /api/doctor/patients/:id - Detailed patient profile (only own assigned patients)
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

                                db.all(`SELECT id, sender, content, risk_level, risk_score, timestamp, session_id FROM Sessions WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50`, [patientId], (err, sessions) => {
                                    if (err) return res.status(500).json({ error: 'Database error fetching sessions' });

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
                                        appointments: appointments || [],
                                        sessions: sessions || []
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

/**
 * POST /api/doctor/patients/:id/assign
 * Claim an unassigned patient into this doctor's caseload.
 * Upserts the Patient_Doctor_Assignments record (set status ACTIVE).
 */
router.post('/patients/:id/assign', verifyToken, requireDoctor, async (req, res) => {
    const patientId = req.params.id;
    const doctorId  = req.user.id;

    try {
        // Verify patient exists
        const patient = await db.queryGet(`SELECT id FROM Users WHERE id = ?`, [patientId]);
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        // Upsert: if already existed (maybe DISCHARGED), reactivate
        await db.queryRun(
            `INSERT INTO Patient_Doctor_Assignments (patient_id, doctor_id, status, assigned_by)
             VALUES (?, ?, 'ACTIVE', 'DOCTOR')
             ON CONFLICT(patient_id, doctor_id) DO UPDATE SET status = 'ACTIVE', assigned_at = CURRENT_TIMESTAMP`,
            [patientId, doctorId]
        );

        logAuditEvent('PATIENT_ASSIGNED', patientId, doctorId, 'CLINICIAN', { doctorId });
        return res.json({ message: 'Patient assigned to your caseload successfully' });
    } catch (err) {
        console.error('Assign patient error:', err);
        return res.status(500).json({ error: 'Failed to assign patient' });
    }
});

/**
 * POST /api/doctor/risk-override/:evalId
 * Doctor manually overrides the automated risk tier for a risk evaluation record.
 * This does NOT replace the deterministic engine — it layers a human decision on top.
 */
router.post('/risk-override/:evalId', verifyToken, requireDoctor, async (req, res) => {
    const evalId   = req.params.evalId;
    const doctorId = req.user.id;
    const { override_tier, override_reason } = req.body;

    const VALID_TIERS = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
    if (!override_tier || !VALID_TIERS.includes(override_tier.toUpperCase())) {
        return res.status(400).json({ error: `override_tier must be one of: ${VALID_TIERS.join(', ')}` });
    }
    if (!override_reason || override_reason.trim().length < 5) {
        return res.status(400).json({ error: 'override_reason is required (min 5 characters)' });
    }

    try {
        const result = await db.queryRun(
            `UPDATE Risk_Evaluations
             SET manual_override_tier = ?, override_reason = ?,
                 overridden_by_doctor_id = ?, overridden_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [override_tier.toUpperCase(), override_reason.trim(), doctorId, evalId]
        );

        if (result.changes === 0) return res.status(404).json({ error: 'Risk evaluation not found' });

        logAuditEvent('RISK_OVERRIDE', null, doctorId, 'CLINICIAN', {
            evalId, override_tier, override_reason: override_reason.trim()
        });
        return res.json({ message: 'Risk tier override saved', override_tier, override_reason });
    } catch (err) {
        console.error('Risk override error:', err);
        return res.status(500).json({ error: 'Failed to save risk override' });
    }
});

/**
 * PUT /api/doctor/patients/:id/care-status
 * Update a patient's care_status in Patient_Intake (ACTIVE, STEPPING_DOWN, DISCHARGED).
 */
router.put('/patients/:id/care-status', verifyToken, requireDoctor, async (req, res) => {
    const patientId = req.params.id;
    const doctorId  = req.user.id;
    const { care_status, reason } = req.body;

    const VALID_STATUSES = ['ACTIVE', 'STEPPING_DOWN', 'DISCHARGED', 'ON_HOLD'];
    if (!care_status || !VALID_STATUSES.includes(care_status.toUpperCase())) {
        return res.status(400).json({ error: `care_status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    try {
        const result = await db.queryRun(
            `UPDATE Patient_Intake SET care_status = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
            [care_status.toUpperCase(), patientId]
        );

        if (result.changes === 0) {
            // No intake record yet — insert minimal one to hold the status
            await db.queryRun(
                `INSERT OR IGNORE INTO Patient_Intake (user_id, care_status) VALUES (?, ?)`,
                [patientId, care_status.toUpperCase()]
            );
        }

        // If discharging, deactivate the assignment
        if (care_status.toUpperCase() === 'DISCHARGED') {
            await db.queryRun(
                `UPDATE Patient_Doctor_Assignments SET status = 'DISCHARGED' WHERE patient_id = ? AND doctor_id = ?`,
                [patientId, doctorId]
            );
        }

        logAuditEvent('CARE_STATUS_UPDATED', patientId, doctorId, 'CLINICIAN', { care_status, reason });
        return res.json({ message: `Patient care status updated to ${care_status.toUpperCase()}` });
    } catch (err) {
        console.error('Care status update error:', err);
        return res.status(500).json({ error: 'Failed to update care status' });
    }
});

// POST /api/doctor/patients/:id/care-plan - Create or update a care plan (with SOAP fields)
router.post('/patients/:id/care-plan', verifyToken, requireDoctor, (req, res) => {
    const patientId = req.params.id;
    const clinicianId = req.user.id;
    const {
        primary_diagnosis_notes, goals, recommended_interventions, follow_up_date, status = 'ACTIVE',
        soap_subjective, soap_objective, soap_assessment, soap_plan
    } = req.body;

    const sql = `INSERT INTO Care_Plans
        (patient_id, clinician_id, primary_diagnosis_notes, goals, recommended_interventions,
         follow_up_date, status, soap_subjective, soap_objective, soap_assessment, soap_plan)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [
        patientId, clinicianId, primary_diagnosis_notes, goals, recommended_interventions,
        follow_up_date, status, soap_subjective, soap_objective, soap_assessment, soap_plan
    ], function(err) {
        if (err) {
            console.error('Error saving care plan:', err);
            return res.status(500).json({ error: 'Failed to save care plan.' });
        }

        logAuditEvent('CARE_PLAN_CREATED', patientId, clinicianId, 'CLINICIAN', { carePlanId: this.lastID });
        res.status(201).json({ message: 'Care plan created successfully', carePlanId: this.lastID });
    });
});

module.exports = router;
