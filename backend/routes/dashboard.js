const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const db = require('../database/sqlite');

router.get('/stats', verifyToken, async (req, res) => {
    const userId = req.user.id;
    
    try {
        // Aggregate statistics using Promise wrappers
        const getStats = () => new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    COUNT(id) as totalMessages,
                    COUNT(CASE WHEN risk_level = 'HIGH' THEN 1 END) as crisisAlerts
                FROM Sessions 
                WHERE user_id = ?
            `;
            db.get(sql, [userId], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        const stats = await getStats();
        
        // Calculate dynamic mock mood trend based on messaging volume for MVP
        // In a true production app, this would query Mood_Logs Table
        const messageCount = stats.totalMessages || 0;
        const totalSessions = Math.ceil(messageCount / 4); // Session count assumption for dashboard
        
        // Return structured analytics
        res.json({
            totalSessions,
            totalMessages: messageCount,
            crisisAlerts: stats.crisisAlerts || 0,
            moodScore: 7.5,
            trendData: [
                { name: 'Mon', mood: 6 },
                { name: 'Tue', mood: 5 },
                { name: 'Wed', mood: Math.min(10, 7 + (messageCount % 3)) },
                { name: 'Thu', mood: 8 },
                { name: 'Fri', mood: Math.max(1, 6 - (stats.crisisAlerts % 4)) },
                { name: 'Sat', mood: 9 },
                { name: 'Sun', mood: 8 }
            ]
        });

    } catch (err) {
        console.error('Stats query error:', err);
        res.status(500).json({ error: 'Failed to retrieve analytics' });
    }
});

module.exports = router;
