const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/sqlite');
const { verifyToken } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_serenemind_key_change_in_prod';

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
            user: { id: this.lastID, username, email, role: 'patient', needsAssessment: true }
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
                    role: 'patient',
                    needsAssessment: !assessment // true if no assessment found
                }
            });
        });
    });
});

// Register Doctor
router.post('/doctor/register', async (req, res) => {
    const { fullName, email, password, specialization, licenseNumber } = req.body;

    if (!fullName || !email || !password) {
        return res.status(400).json({ error: 'Please provide full name, email, and password' });
    }

    try {
        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(password, salt);

        const result = await runStatement(
            `INSERT INTO Doctors (full_name, email, password_hash, specialization, license_number) VALUES (?, ?, ?, ?, ?)`,
            [fullName, email, passwordHash, specialization || '', licenseNumber || '']
        );

        const token = jwt.sign(
            { id: result.lastID, fullName, email, role: 'doctor' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Doctor account created successfully',
            token,
            user: {
                id: result.lastID,
                fullName,
                email,
                specialization: specialization || '',
                licenseNumber: licenseNumber || '',
                role: 'doctor',
                needsAssessment: false
            }
        });
    } catch (err) {
        if (err.message && err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'A doctor account with this email already exists' });
        }

        console.error('Doctor registration error:', err);
        res.status(500).json({ error: 'Doctor registration failed' });
    }
});

// Login Doctor
router.post('/doctor/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Please provide email and password' });
    }

    try {
        const doctor = await getRow(`SELECT * FROM Doctors WHERE email = ?`, [email]);
        if (!doctor) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isValidPassword = bcrypt.compareSync(password, doctor.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: doctor.id, fullName: doctor.full_name, email: doctor.email, role: 'doctor' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Doctor login successful',
            token,
            user: {
                id: doctor.id,
                fullName: doctor.full_name,
                email: doctor.email,
                specialization: doctor.specialization || '',
                licenseNumber: doctor.license_number || '',
                role: 'doctor',
                needsAssessment: false
            }
        });
    } catch (err) {
        console.error('Doctor login error:', err);
        res.status(500).json({ error: 'Doctor login failed' });
    }
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

// Submit Clinical Assessment (21 questions)
router.post('/assessment', verifyToken, (req, res) => {
    const userId = req.user.id;
    const { 
        answers, 
        depressionScore, 
        anxietyScore, 
        stressScore, 
        totalScore, 
        mainConcerns, 
        selfHarmRisk 
    } = req.body; 

    if (!answers || !Array.isArray(answers) || answers.length !== 21) {
        return res.status(400).json({ error: 'Invalid assessment format. Expected 21 answers.' });
    }

    const sql = `
        INSERT INTO Assessments (
            user_id, answers, depression_score, anxiety_score, stress_score, 
            total_score, main_concern, self_harm_risk
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
        userId, 
        JSON.stringify(answers), 
        depressionScore, 
        anxietyScore, 
        stressScore, 
        totalScore, 
        mainConcerns, 
        selfHarmRisk ? 1 : 0
    ];

    db.run(sql, params, function(err) {
        if (err) {
            console.error('Assessment insert error:', err);
            if (err.message.includes('UNIQUE')) {
                 return res.status(400).json({ error: 'Assessment already completed.' });
            }
            return res.status(500).json({ error: 'Failed to save assessment.' });
        }
        res.status(201).json({ message: 'Assessment saved successfully' });
    });
});

module.exports = router;
