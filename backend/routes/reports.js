const express = require('express');
const router = express.Router();
const db = require('../database/sqlite');
const { verifyToken } = require('../middleware/auth');

// POST /api/reports - Create a new patient report (Doctor only)
router.post('/', verifyToken, (req, res) => {
    const { patient_id, report_title, report_content, status } = req.body;
    const doctor_id = req.user.id; // Assuming verifyToken adds user to req and it's a doctor

    if (!patient_id || !report_title || !report_content) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const sql = `INSERT INTO Patient_Reports (patient_id, doctor_id, report_title, report_content, status) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [patient_id, doctor_id, report_title, report_content, status || 'pending'], function(err) {
        if (err) {
            console.error('Error creating report:', err);
            return res.status(500).json({ error: 'Database error creating report' });
        }
        res.status(201).json({ message: 'Report created successfully', report_id: this.lastID });
    });
});

// GET /api/reports/patient/:patient_id - Get all reports for a specific patient
router.get('/patient/:patient_id', verifyToken, (req, res) => {
    const patient_id = req.params.patient_id;

    const sql = `
        SELECT r.id, r.patient_id, r.doctor_id, r.report_title, r.report_content, r.status, r.created_at, d.username as doctor_name 
        FROM Patient_Reports r
        JOIN Doctors d ON r.doctor_id = d.id
        WHERE r.patient_id = ?
        ORDER BY r.created_at DESC
    `;
    
    db.all(sql, [patient_id], (err, rows) => {
        if (err) {
            console.error('Error fetching reports:', err);
            return res.status(500).json({ error: 'Database error fetching reports' });
        }
        res.json(rows);
    });
});

// GET /api/reports/doctor - Get all reports created by the logged-in doctor
router.get('/doctor', verifyToken, (req, res) => {
    const doctor_id = req.user.id;

    const sql = `
        SELECT r.id, r.patient_id, r.doctor_id, r.report_title, r.report_content, r.status, r.created_at, u.username as patient_name 
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

// GET /api/reports/:id - Get a specific report by ID
router.get('/:id', verifyToken, (req, res) => {
    const report_id = req.params.id;

    const sql = `
        SELECT r.id, r.patient_id, r.doctor_id, r.report_title, r.report_content, r.status, r.created_at, 
               u.username as patient_name, d.username as doctor_name
        FROM Patient_Reports r
        JOIN Users u ON r.patient_id = u.id
        JOIN Doctors d ON r.doctor_id = d.id
        WHERE r.id = ?
    `;
    
    db.get(sql, [report_id], (err, row) => {
        if (err) {
            console.error('Error fetching report:', err);
            return res.status(500).json({ error: 'Database error fetching report' });
        }
        if (!row) return res.status(404).json({ error: 'Report not found' });
        
        res.json(row);
    });
});

// PUT /api/reports/:id - Update an existing report
router.put('/:id', verifyToken, (req, res) => {
    const report_id = req.params.id;
    const { report_title, report_content, status } = req.body;
    const doctor_id = req.user.id; // Assuming only the doctor who created it can update it

    // Check if the report belongs to the doctor (optional authorization step)
    const updateSql = `UPDATE Patient_Reports SET report_title = ?, report_content = ?, status = ? WHERE id = ? AND doctor_id = ?`;

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
router.delete('/:id', verifyToken, (req, res) => {
    const report_id = req.params.id;
    const doctor_id = req.user.id; // Only the doctor who created it can delete

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
