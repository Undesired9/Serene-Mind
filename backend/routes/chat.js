const express = require('express');
const router = express.Router();
const { handleChat } = require('../services/aiService');
const { verifyToken } = require('../middleware/auth');
const db = require('../database/sqlite');

// GET: Fetch last 50 chat history for dashboard hydration
router.get('/history', verifyToken, (req, res) => {
    const userId = req.user.id;
    
    const sql = `
        SELECT * FROM Sessions 
        WHERE user_id = ? 
        ORDER BY timestamp ASC 
        LIMIT 50
    `;
    
    db.all(sql, [userId], (err, rows) => {
        if (err) {
            console.error('History fetch error:', err);
            return res.status(500).json({ error: 'Failed to retrieve chat history.' });
        }
        res.json(rows);
    });
});

// POST: Add new message and get AI response
router.post('/', verifyToken, async (req, res) => {
    const { message, history } = req.body;
    const userId = req.user.id;
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        // 1. Instantly save the user's message to the SQL DB
        await new Promise((resolve, reject) => {
            db.run(`INSERT INTO Sessions (user_id, sender, content) VALUES (?, 'user', ?)`, 
            [userId, message], 
            function(err) {
                if (err) reject(err);
                resolve();
            });
        });

        // 2. Process via AI service (NLP mock with Crisis bounds)
        const responseData = await handleChat(message, history);
        
        // 3. Save AI's response to SQL DB
        await new Promise((resolve, reject) => {
            db.run(`INSERT INTO Sessions (user_id, sender, content, risk_level) VALUES (?, 'ai', ?, ?)`, 
            [userId, responseData.reply, responseData.riskLevel], 
            function(err) {
                if (err) reject(err);
                resolve();
            });
        });

        // 4. Return the AI response payload back to the client interface
        res.json(responseData);
    } catch (error) {
        console.error('Chat routing error:', error);
        res.status(500).json({ error: 'An error occurred while communicating with the AI Therapist' });
    }
});

// DELETE: Ensure data autonomy by clearing history
router.delete('/history', verifyToken, (req, res) => {
    const userId = req.user.id;
    
    db.run(`DELETE FROM Sessions WHERE user_id = ?`, [userId], function(err) {
        if (err) {
            console.error('Delete history error:', err);
            return res.status(500).json({ error: 'Failed to delete chat history.' });
        }
        res.json({ message: 'History successfully cleared.' });
    });
});

module.exports = router;
