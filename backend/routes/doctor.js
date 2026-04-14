const express = require('express');
const router = express.Router();
const db = require('../database/sqlite');
const { verifyToken } = require('../middleware/auth');

// GET /api/doctor/patients - Fetch all patients and their latest assessments
router.get('/patients', verifyToken, (req, res) => {
    // For MVP, returning all users with their latest assessments
    const sql = `
        SELECT 
            u.id, u.username, u.email, u.created_at,
            a.total_score, a.severity, a.crisis_risk, a.timestamp as assessment_date,
            (SELECT COUNT(*) FROM Sessions WHERE user_id = u.id) as total_sessions,
            (SELECT AVG(mood_score) FROM Mood_Logs WHERE user_id = u.id) as avg_mood
        FROM Users u
        LEFT JOIN Assessments a ON u.id = a.user_id
        ORDER BY a.crisis_risk DESC, a.total_score DESC, u.created_at DESC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching patients:', err);
            return res.status(500).json({ error: 'Failed to fetch patients list' });
        }
        
        // Sanitize / format data
        const patients = rows.map(row => ({
            ...row,
            crisis_risk: !!row.crisis_risk,
            avg_mood: row.avg_mood ? Math.round(row.avg_mood * 10) / 10 : null
        }));

        res.json(patients);
    });
});

// GET /api/doctor/patients/:id - Fetch detailed patient data (assessments, mood, sessions overview)
router.get('/patients/:id', verifyToken, (req, res) => {
    const patientId = req.params.id;

    // Fetch user basic info
    db.get(`SELECT id, username, email, created_at FROM Users WHERE id = ?`, [patientId], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error fetching user' });
        if (!user) return res.status(404).json({ error: 'Patient not found' });

        // Fetch PHQ-9 Assessment
        db.get(`SELECT * FROM Assessments WHERE user_id = ?`, [patientId], (err, assessment) => {
            if (err) return res.status(500).json({ error: 'Database error fetching assessment' });

            // Fetch recent mood logs (last 30 entries)
            db.all(`SELECT id, mood_score, notes, date FROM Mood_Logs WHERE user_id = ? ORDER BY date DESC LIMIT 30`, [patientId], (err, mood_logs) => {
                if (err) return res.status(500).json({ error: 'Database error fetching mood logs' });

                // Fetch recent chat sessions overview to show risk levels (excluding content for privacy, except maybe risk tags)
                db.all(`SELECT id, sender, risk_level, timestamp FROM Sessions WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50`, [patientId], (err, sessions) => {
                    if (err) return res.status(500).json({ error: 'Database error fetching sessions' });

                    res.json({
                        user,
                        assessment: assessment || null,
                        mood_logs: mood_logs || [],
                        sessions: sessions || []
                    });
                });
            });
        });
    });
});

module.exports = router;
