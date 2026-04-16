const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/sqlite');
const { verifyToken } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_serenemind_key_change_in_prod';

// Register Doctor
router.post('/register', (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Please provide all required fields' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const sql = `INSERT INTO Doctors (username, email, password_hash) VALUES (?, ?, ?)`;
    db.run(sql, [username, email, passwordHash], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ error: 'Username or email already exists' });
            }
            return res.status(500).json({ error: 'Database error: registration failed' });
        }
        
        // Auto login on register, bypass assessment
        const token = jwt.sign({ id: this.lastID, username, role: 'doctor' }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            message: 'Doctor created successfully',
            token,
            user: { id: this.lastID, username, email, needsAssessment: false, role: 'doctor' }
        });
    });
});

// Login Doctor
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Please provide email and password' });
    }

    const sql = `SELECT * FROM Doctors WHERE email = ?`;
    db.get(sql, [email], (err, doctor) => {
        if (err) return res.status(500).json({ error: 'Database query error' });
        
        if (!doctor) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isValidPassword = bcrypt.compareSync(password, doctor.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: doctor.id, username: doctor.username, role: 'doctor' }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({
            message: 'Login successful',
            token,
            user: { 
                id: doctor.id, 
                username: doctor.username, 
                email: doctor.email,
                needsAssessment: false,
                role: 'doctor'
            }
        });
    });
});

module.exports = router;
