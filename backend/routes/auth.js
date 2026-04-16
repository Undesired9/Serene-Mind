const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/sqlite');
const { verifyToken } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_serenemind_key_change_in_prod';

// Register User
router.post('/register', (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Please provide all required fields' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const sql = `INSERT INTO Users (username, email, password_hash) VALUES (?, ?, ?)`;
    db.run(sql, [username, email, passwordHash], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ error: 'Username or email already exists' });
            }
            return res.status(500).json({ error: 'Database error: registration failed' });
        }
        
        // Auto login on register, explicitly setting needsAssessment to true
        const token = jwt.sign({ id: this.lastID, username, role: 'patient' }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            message: 'User created successfully',
            token,
            user: { id: this.lastID, username, email, needsAssessment: true, role: 'patient' }
        });
    });
});

// Login User
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Please provide email and password' });
    }

    const sql = `SELECT * FROM Users WHERE email = ?`;
    db.get(sql, [email], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database query error' });
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isValidPassword = bcrypt.compareSync(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: 'patient' }, JWT_SECRET, { expiresIn: '7d' });
        
        // Check if user has completed the assessment
        db.get(`SELECT id FROM Assessments WHERE user_id = ?`, [user.id], (err, assessment) => {
            if (err) return res.status(500).json({ error: 'Database query error during assessment check' });
            
            res.json({
                message: 'Login successful',
                token,
                user: { 
                    id: user.id, 
                    username: user.username, 
                    email: user.email,
                    needsAssessment: !assessment, // true if no assessment found
                    role: 'patient'
                }
            });
        });
    });
});

// Delete User Account (Data Autonomy/Privacy)
router.delete('/account', verifyToken, (req, res) => {
    const userId = req.user.id;
    
    // SQLite with ON DELETE CASCADE applied to Sessions and Mood_Logs 
    // will auto-delete related rows when the user is deleted here.
    const sql = `DELETE FROM Users WHERE id = ?`;
    
    db.run(sql, [userId], function(err) {
        if (err) {
            console.error('Account deletion error:', err);
            return res.status(500).json({ error: 'Failed to delete account. Please try again later.' });
        }
        res.json({ message: 'Account and all associated personal data have been permanently deleted.' });
    });
});

// Submit PHQ-9 Assessment
router.post('/assessment', verifyToken, (req, res) => {
    const userId = req.user.id;
    const { answers } = req.body; 
    // answers should be an array of length 10. (9 PHQ questions + 1 functional impact question)

    if (!answers || !Array.isArray(answers) || answers.length !== 10) {
        return res.status(400).json({ error: 'Invalid assessment format. Expected 10 answers.' });
    }

    // Score the first 9 questions (0 to 3 scale mapped to 0 to 27)
    let totalScore = 0;
    for (let i = 0; i < 9; i++) {
        totalScore += parseInt(answers[i] || 0);
    }
    
    // Determine severity based on standard PHQ-9 cutpoints
    let severity = 'None-minimal';
    if (totalScore >= 5 && totalScore <= 9) severity = 'Mild';
    else if (totalScore >= 10 && totalScore <= 14) severity = 'Moderate';
    else if (totalScore >= 15 && totalScore <= 19) severity = 'Moderately severe';
    else if (totalScore >= 20) severity = 'Severe';

    // Question 9 checks for self-harm/suicide risk (answers[8] because 0-indexed)
    const crisisRisk = parseInt(answers[8] || 0) > 0;

    const sql = `
        INSERT INTO Assessments (
            user_id, q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, 
            total_score, severity, crisis_risk
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
        userId, ...answers, totalScore, severity, crisisRisk
    ];

    db.run(sql, params, function(err) {
        if (err) {
            console.error('Assessment insert error:', err);
            // If UNIQUE constraint fails, they already took it.
            if (err.message.includes('UNIQUE')) {
                 return res.status(400).json({ error: 'Assessment already completed.' });
            }
            return res.status(500).json({ error: 'Failed to save assessment.' });
        }
        res.status(201).json({ message: 'Assessment saved successfully', severity, crisisRisk });
    });
});

module.exports = router;
