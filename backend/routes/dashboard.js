const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const db = require('../database/sqlite');

// Helper wrapper for db queries
const runQuery = (sql, params) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
        if (err) reject(err);
        resolve(this);
    });
});

const getQuery = (sql, params) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) reject(err);
        resolve(row);
    });
});

const allQuery = (sql, params) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        resolve(rows);
    });
});

// POST /mood & /checkin: Log today's mood
const handleMoodLog = async (req, res) => {
    const userId = req.user.id;
    let { mood_score, notes } = req.body;

    mood_score = parseInt(mood_score, 10);

    if (isNaN(mood_score) || mood_score < 1 || mood_score > 10) {
        return res.status(400).json({ error: 'Valid mood score (1-10) is required.' });
    }

    const sanitizedNotes = String(notes || '').trim().slice(0, 500);

    try {
        await runQuery(
            `INSERT INTO Mood_Logs (user_id, mood_score, notes, date) VALUES (?, ?, ?, CURRENT_DATE)`,
            [userId, mood_score, sanitizedNotes]
        );
        res.json({ message: 'Mood logged successfully.' });
    } catch (err) {
        console.error('Mood logging error:', err);
        res.status(500).json({ error: 'Failed to log mood.' });
    }
};

router.post('/mood', verifyToken, handleMoodLog);
router.post('/checkin', verifyToken, handleMoodLog);

// GET /stats: Return true dashboard analytics
router.get('/stats', verifyToken, async (req, res) => {
    const userId = req.user.id;
    
    try {
        // Get total sessions/messages
        const sessionsStats = await getQuery(`
            SELECT 
                COUNT(*) as totalMessages,
                COUNT(CASE WHEN risk_level = 'HIGH' THEN 1 END) as crisisAlerts
            FROM Sessions 
            WHERE user_id = ?
        `, [userId]);

        // Get total unique days logged for streak computation
        const uniqueDaysChat = await getQuery(`
            SELECT COUNT(DISTINCT date(timestamp)) as days 
            FROM Sessions 
            WHERE user_id = ? AND sender = 'user'
        `, [userId]);

        // Get mood trend for standard 7-day chart view + aggregate score
        const moodLogs = await allQuery(`
            SELECT date, AVG(mood_score) as avg_mood 
            FROM Mood_Logs 
            WHERE user_id = ?
            GROUP BY date
            ORDER BY date ASC
            LIMIT 14
        `, [userId]);
        
        let avgScoreTotal = 0;
        let trendData = [];
        
        if (moodLogs && moodLogs.length > 0) {
            avgScoreTotal = moodLogs.reduce((acc, row) => acc + row.avg_mood, 0) / moodLogs.length;
            
            // Format dates simply for Recharts (e.g. MM/DD)
            trendData = moodLogs.map(log => {
                const d = new Date(log.date);
                return {
                    name: `${d.getMonth() + 1}/${d.getDate()}`,
                    mood: parseFloat(log.avg_mood.toFixed(1))
                };
            });
        }
        
        const messageCount = sessionsStats.totalMessages || 0;
        const totalSessions = Math.ceil(messageCount / 4); 

        res.json({
            totalSessions,
            totalMessages: messageCount,
            crisisAlerts: sessionsStats.crisisAlerts || 0,
            moodScore: avgScoreTotal > 0 ? avgScoreTotal.toFixed(1) : 0,
            trendData: trendData,
            activeDays: uniqueDaysChat.days || 0
        });

    } catch (err) {
        console.error('Stats query error:', err);
        res.status(500).json({ error: 'Failed to retrieve analytics' });
    }
});

// GET /reports: Generate dynamic reports/notifications based on app usage
router.get('/reports', verifyToken, async (req, res) => {
    const userId = req.user.id;
    let reports = [];

    try {
        // 1. Check if user logged their first mood
        const moodCount = await getQuery(`SELECT COUNT(*) as c FROM Mood_Logs WHERE user_id = ?`, [userId]);
        if (moodCount.c === 0) {
            reports.push({
                id: 'r_mood', title: 'Welcome to Tracking', unread: true, type: 'milestone',
                description: 'You haven\'t logged a mood yet. Start tracking daily to reveal insights.',
                date: 'Just now'
            });
        } else {
             reports.push({
                id: 'r_mood_insight', title: 'Mood Insights Processing', unread: false, type: 'summary',
                description: `You have logged ${moodCount.c} moods so far. Keep it up!`, date: 'Recent'
            });
        }

        // 2. Check messaging milestones
        const sessionCount = await getQuery(`SELECT COUNT(*) as c FROM Sessions WHERE user_id = ? AND sender = 'user'`, [userId]);
        if (sessionCount.c >= 10) {
            reports.push({
                id: 'r_milestone_10', title: 'Milestone Reached', unread: false, type: 'milestone',
                description: 'Congratulations on sending 10 messages! You are taking real steps toward wellness.',
                date: 'Recently'
            });
        }

        // 3. Crisis Alerts Report
        const crisisCount = await getQuery(`SELECT COUNT(*) as c FROM Sessions WHERE user_id = ? AND risk_level = 'HIGH'`, [userId]);
        if (crisisCount.c > 0) {
            reports.push({
                id: 'r_crisis', title: 'Coping Strategies Suggestion', unread: true, type: 'suggestion',
                description: 'Based on recent high-stress signals, we strongly recommend reaching out to a professional therapist or using grounding exercises.',
                date: 'Urgent'
            });
        }

        // Return standard structure expected by front-end
        res.json(reports);
    } catch (err) {
        console.error('Reports generation error:', err);
        res.status(500).json({ error: 'Failed to generate reports' });
    }
});

module.exports = router;
