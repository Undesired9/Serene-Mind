const express = require('express');
const router = express.Router();
const db = require('../database/sqlite');
const { verifyToken, requireDoctor } = require('../middleware/auth');

// POST /api/reports - Create a new patient report (Doctor only)
router.post('/', verifyToken, requireDoctor, async (req, res) => {
    const { patient_id, report_title, report_content, status } = req.body;
    const doctor_id = req.user.id;

    if (!patient_id || !report_title || !report_content) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // IDOR guard: only a doctor assigned to the patient may write a report
        const assignment = await db.queryGet(
            `SELECT id FROM Patient_Doctor_Assignments WHERE patient_id = ? AND doctor_id = ? AND status = 'ACTIVE'`,
            [patient_id, doctor_id]
        );
        if (!assignment) {
            return res.status(403).json({ error: 'Not authorized to create a report for this patient' });
        }

        const sql = `INSERT INTO Patient_Reports (patient_id, doctor_id, report_title, report_content, status) VALUES (?, ?, ?, ?, ?)`;
        const result = await db.queryRun(sql, [patient_id, doctor_id, report_title, report_content, status || 'pending']);
        res.status(201).json({ message: 'Report created successfully', report_id: result.lastID });
    } catch (err) {
        console.error('Error creating report:', err);
        return res.status(500).json({ error: 'Database error creating report' });
    }
});

// GET /api/reports/patient/:patient_id - Get all reports for a patient in the doctor's caseload
router.get('/patient/:patient_id', verifyToken, requireDoctor, async (req, res) => {
    const patient_id = req.params.patient_id;
    const doctor_id = req.user.id;

    try {
        // IDOR guard: only the assigned doctor may view this patient's reports
        const assignment = await db.queryGet(
            `SELECT id FROM Patient_Doctor_Assignments WHERE patient_id = ? AND doctor_id = ? AND status = 'ACTIVE'`,
            [patient_id, doctor_id]
        );
        if (!assignment) {
            return res.status(403).json({ error: 'Not authorized to view reports for this patient' });
        }

        const sql = `
            SELECT r.id, r.patient_id, r.doctor_id, r.report_title, r.report_content, r.status, r.created_at, r.updated_at, d.full_name as doctor_name 
            FROM Patient_Reports r
            LEFT JOIN Doctors d ON r.doctor_id = d.id
            WHERE r.patient_id = ?
            ORDER BY r.created_at DESC
        `;

        const rows = await db.queryAll(sql, [patient_id]);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching reports:', err);
        return res.status(500).json({ error: 'Database error fetching reports' });
    }
});

// GET /api/reports/doctor - Get all reports created by the logged-in doctor
router.get('/doctor', verifyToken, requireDoctor, (req, res) => {
    const doctor_id = req.user.id;

    const sql = `
        SELECT r.id, r.patient_id, r.doctor_id, r.report_title, r.report_content, r.status, r.created_at, r.updated_at, u.username as patient_name 
        FROM Patient_Reports r
        JOIN Users u ON r.patient_id = u.id
        WHERE r.doctor_id = ?
        ORDER BY r.created_at DESC
    `;
    
    db.all(sql, [doctor_id], (err, rows) => {
        if (err) {
            console.error('Error fetching doctor reports:', err);
            return res.status(500).json({ error: 'Database error fetching reports' });
        }
        res.json(rows);
    });
});

// GET /api/reports/:id - Get a specific report by ID (doctor must own it)
router.get('/:id', verifyToken, requireDoctor, (req, res) => {
    const report_id = req.params.id;
    const doctor_id = req.user.id;

    const sql = `
        SELECT r.id, r.patient_id, r.doctor_id, r.report_title, r.report_content, r.status, r.created_at, r.updated_at,
               u.username as patient_name, d.full_name as doctor_name
        FROM Patient_Reports r
        JOIN Users u ON r.patient_id = u.id
        LEFT JOIN Doctors d ON r.doctor_id = d.id
        WHERE r.id = ? AND r.doctor_id = ?
    `;
    
    db.get(sql, [report_id, doctor_id], (err, row) => {
        if (err) {
            console.error('Error fetching report:', err);
            return res.status(500).json({ error: 'Database error fetching report' });
        }
        if (!row) return res.status(404).json({ error: 'Report not found or not authorized' });
        
        res.json(row);
    });
});

// PUT /api/reports/:id - Update an existing report
router.put('/:id', verifyToken, requireDoctor, (req, res) => {
    const report_id = req.params.id;
    const { report_title, report_content, status } = req.body;
    const doctor_id = req.user.id;

    const updateSql = `
        UPDATE Patient_Reports
        SET report_title = ?, report_content = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND doctor_id = ?
    `;

    db.run(updateSql, [report_title, report_content, status, report_id, doctor_id], function(err) {
        if (err) {
            console.error('Error updating report:', err);
            return res.status(500).json({ error: 'Database error updating report' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Report not found or not authorized to update' });
        }
        res.json({ message: 'Report updated successfully' });
    });
});

// DELETE /api/reports/:id - Delete a report
router.delete('/:id', verifyToken, requireDoctor, (req, res) => {
    const report_id = req.params.id;
    const doctor_id = req.user.id;

    const deleteSql = `DELETE FROM Patient_Reports WHERE id = ? AND doctor_id = ?`;
    
    db.run(deleteSql, [report_id, doctor_id], function(err) {
        if (err) {
            console.error('Error deleting report:', err);
            return res.status(500).json({ error: 'Database error deleting report' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Report not found or not authorized to delete' });
        }
        res.json({ message: 'Report deleted successfully' });
    });
});

module.exports = router;
