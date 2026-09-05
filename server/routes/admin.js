const express = require('express');
const router = express.Router();
const db = require('../database/sqlite');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { logAuditEvent } = require('../services/auditLogger');

// All admin routes require a valid JWT with role 'admin'
router.use(verifyToken, requireAdmin);

const getRow = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
    });
});

const runStatement = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
        if (err) return reject(err);
        resolve(this);
    });
});

const allRows = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
    });
});

// GET /admin/stats — platform overview metrics
router.get('/stats', async (req, res) => {
    try {
        const [totalDoctors, pendingDoctors, approvedDoctors, rejectedDoctors, totalPatients, totalAppointments, atRiskPatients] = await Promise.all([
            getRow(`SELECT COUNT(*) AS count FROM Doctors`),
            getRow(`SELECT COUNT(*) AS count FROM Doctors WHERE COALESCE(approval_status, 'APPROVED') = 'PENDING'`),
            getRow(`SELECT COUNT(*) AS count FROM Doctors WHERE COALESCE(approval_status, 'APPROVED') = 'APPROVED'`),
            getRow(`SELECT COUNT(*) AS count FROM Doctors WHERE COALESCE(approval_status, 'APPROVED') = 'REJECTED'`),
            getRow(`SELECT COUNT(*) AS count FROM Users`),
            getRow(`SELECT COUNT(*) AS count FROM Appointments`),
            getRow(
                `SELECT COUNT(DISTINCT user_id) AS count FROM User_Escalation_Status WHERE current_risk_tier NOT IN ('ROUTINE', 'LOW')`
            )
        ]);

        res.json({
            totalDoctors: Number(totalDoctors.count || 0),
            pendingDoctors: Number(pendingDoctors.count || 0),
            approvedDoctors: Number(approvedDoctors.count || 0),
            rejectedDoctors: Number(rejectedDoctors.count || 0),
            totalPatients: Number(totalPatients.count || 0),
            totalAppointments: Number(totalAppointments.count || 0),
            atRiskPatients: Number(atRiskPatients.count || 0)
        });
    } catch (err) {
        console.error('Admin stats error:', err);
        res.status(500).json({ error: 'Failed to load admin statistics' });
    }
});

// GET /admin/doctors — list all doctors with optional status filter
router.get('/doctors', async (req, res) => {
    const { status } = req.query;

    if (status !== undefined && !['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status filter. Use PENDING, APPROVED, or REJECTED.' });
    }

    try {
        const sql = status
            ? `SELECT id, username, full_name, email, specialization, license_number,
                      approval_status, rejection_reason, reviewed_at, created_at
               FROM Doctors
               WHERE COALESCE(approval_status, 'APPROVED') = ?
               ORDER BY created_at DESC`
            : `SELECT id, username, full_name, email, specialization, license_number,
                      approval_status, rejection_reason, reviewed_at, created_at
               FROM Doctors
               ORDER BY created_at DESC`;

        const doctors = await allRows(sql, status ? [status] : []);
        res.json(doctors);
    } catch (err) {
        console.error('Admin doctors list error:', err);
        res.status(500).json({ error: 'Failed to load doctors' });
    }
});

// GET /admin/doctors/:id — full doctor row
router.get('/doctors/:id', async (req, res) => {
    const doctorId = parseInt(req.params.id, 10);

    if (!doctorId || isNaN(doctorId) || doctorId <= 0) {
        return res.status(400).json({ error: 'Valid Doctor ID is required' });
    }

    try {
        const doctor = await getRow(`SELECT * FROM Doctors WHERE id = ?`, [doctorId]);

        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        res.json(doctor);
    } catch (err) {
        console.error('Admin doctor detail error:', err);
        res.status(500).json({ error: 'Failed to load doctor' });
    }
});

// POST /admin/doctors/:id/approve — approve a pending doctor
router.post('/doctors/:id/approve', async (req, res) => {
    const doctorId = parseInt(req.params.id, 10);
    const adminId = req.user.id;

    if (!doctorId || isNaN(doctorId) || doctorId <= 0) {
        return res.status(400).json({ error: 'Valid Doctor ID is required' });
    }

    try {
        const doctor = await getRow(`SELECT * FROM Doctors WHERE id = ?`, [doctorId]);

        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        if ((doctor.approval_status || 'APPROVED') !== 'PENDING') {
            return res.status(400).json({ error: 'Doctor is not pending approval.' });
        }

        await runStatement(
            `UPDATE Doctors SET approval_status = 'APPROVED', rejection_reason = NULL,
                reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ? WHERE id = ?`,
            [adminId, doctorId]
        );

        logAuditEvent('DOCTOR_APPROVED', doctorId, adminId, 'admin', { action: 'Doctor approved by admin' });

        const updatedDoctor = await getRow(`SELECT * FROM Doctors WHERE id = ?`, [doctorId]);
        res.json({ message: 'Doctor approved.', doctor: updatedDoctor });
    } catch (err) {
        console.error('Admin doctor approve error:', err);
        res.status(500).json({ error: 'Failed to approve doctor' });
    }
});

// POST /admin/doctors/:id/reject — reject a pending doctor with a reason
router.post('/doctors/:id/reject', async (req, res) => {
    const doctorId = parseInt(req.params.id, 10);
    const adminId = req.user.id;
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';

    if (!doctorId || isNaN(doctorId) || doctorId <= 0) {
        return res.status(400).json({ error: 'Valid Doctor ID is required' });
    }

    if (!reason) {
        return res.status(400).json({ error: 'A rejection reason is required.' });
    }

    if (reason.length > 500) {
        return res.status(400).json({ error: 'Rejection reason must be 500 characters or fewer.' });
    }

    try {
        const doctor = await getRow(`SELECT * FROM Doctors WHERE id = ?`, [doctorId]);

        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        if ((doctor.approval_status || 'APPROVED') !== 'PENDING') {
            return res.status(400).json({ error: 'Doctor is not pending approval.' });
        }

        await runStatement(
            `UPDATE Doctors SET approval_status = 'REJECTED', rejection_reason = ?,
                reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ? WHERE id = ?`,
            [reason, adminId, doctorId]
        );

        logAuditEvent('DOCTOR_REJECTED', doctorId, adminId, 'admin', { action: 'Doctor rejected by admin', reason });

        const updatedDoctor = await getRow(`SELECT * FROM Doctors WHERE id = ?`, [doctorId]);
        res.json({ message: 'Doctor rejected.', doctor: updatedDoctor });
    } catch (err) {
        console.error('Admin doctor reject error:', err);
        res.status(500).json({ error: 'Failed to reject doctor' });
    }
});

module.exports = router;