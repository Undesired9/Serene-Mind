const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to SQLite database
const dbPath = path.resolve(__dirname, 'serenemind.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Initialize Tables
        db.serialize(() => {
            // Users Table
            db.run(`CREATE TABLE IF NOT EXISTS Users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Chat Sessions Table
            db.run(`CREATE TABLE IF NOT EXISTS Chat_Sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
            )`);

            // Sessions / Chat Logs
            db.run(`CREATE TABLE IF NOT EXISTS Sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                sender TEXT NOT NULL, -- 'user' or 'ai'
                content TEXT NOT NULL,
                risk_level TEXT, -- 'LOW', 'MEDIUM', 'HIGH'
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                session_id INTEGER,
                FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
                FOREIGN KEY (session_id) REFERENCES Chat_Sessions(id) ON DELETE CASCADE
            )`);

            // Add session_id column for backwards compatibility with existing databases
            db.run(`ALTER TABLE Sessions ADD COLUMN session_id INTEGER REFERENCES Chat_Sessions(id) ON DELETE CASCADE`, (err) => {
                // Ignore error if column already exists
            });

            // Mood Logs for Dashboard Analytics
            db.run(`CREATE TABLE IF NOT EXISTS Mood_Logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                mood_score INTEGER NOT NULL, -- 1 to 10
                notes TEXT,
                date DATE DEFAULT CURRENT_DATE,
                FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
            )`);

            // Clinical Assessments (DASS-21 style / 21 questions)
            db.run(`CREATE TABLE IF NOT EXISTS Assessments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                answers TEXT NOT NULL,
                depression_score INTEGER NOT NULL,
                anxiety_score INTEGER NOT NULL,
                stress_score INTEGER NOT NULL,
                total_score INTEGER NOT NULL,
                main_concern TEXT,
                self_harm_risk BOOLEAN NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
            )`);

            // Patient Reports Database (AI Generated, Doctor Reviewed)
            db.run(`CREATE TABLE IF NOT EXISTS Patient_Reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                report_title TEXT NOT NULL,
                report_content TEXT NOT NULL,
                doctor_comments TEXT,
                is_reviewed BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES Users(id) ON DELETE CASCADE
            )`);
        });
    }
});

module.exports = db;
