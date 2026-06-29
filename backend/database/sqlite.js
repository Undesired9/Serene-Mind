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

            // Doctors Table
            db.run(`CREATE TABLE IF NOT EXISTS Doctors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                specialization TEXT,
                license_number TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Keep existing doctor tables compatible with the current schema.
            db.run(`ALTER TABLE Doctors ADD COLUMN full_name TEXT`, () => {});
            db.run(`ALTER TABLE Doctors ADD COLUMN specialization TEXT`, () => {});
            db.run(`ALTER TABLE Doctors ADD COLUMN license_number TEXT`, () => {});
            db.run(`ALTER TABLE Doctors ADD COLUMN created_at DATETIME`, () => {});

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
                sender TEXT NOT NULL,
                content TEXT NOT NULL,
                risk_level TEXT,
                risk_score INTEGER,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                session_id INTEGER,
                FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
                FOREIGN KEY (session_id) REFERENCES Chat_Sessions(id) ON DELETE CASCADE
            )`);

            // Add session_id and risk_score columns for backwards compatibility with existing databases
            db.run(`ALTER TABLE Sessions ADD COLUMN session_id INTEGER REFERENCES Chat_Sessions(id) ON DELETE CASCADE`, () => {});
            db.run(`ALTER TABLE Sessions ADD COLUMN risk_score INTEGER`, () => {});

            // Mood Logs for Dashboard Analytics
            db.run(`CREATE TABLE IF NOT EXISTS Mood_Logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                mood_score INTEGER NOT NULL,
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
                doctor_id INTEGER,
                report_title TEXT NOT NULL,
                report_content TEXT NOT NULL,
                doctor_comments TEXT,
                status TEXT DEFAULT 'draft',
                is_reviewed BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES Users(id) ON DELETE CASCADE,
                FOREIGN KEY (doctor_id) REFERENCES Doctors(id) ON DELETE SET NULL
            )`);

            // Keep existing databases compatible with the latest doctor/report schema.
            db.run(`ALTER TABLE Patient_Reports ADD COLUMN doctor_id INTEGER`, () => {});
            db.run(`ALTER TABLE Patient_Reports ADD COLUMN status TEXT DEFAULT 'draft'`, () => {});
            db.run(`ALTER TABLE Patient_Reports ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`, () => {});

            // User Escalation Status (tracks if chat is locked, current risk tier, etc.)
            db.run(`CREATE TABLE IF NOT EXISTS User_Escalation_Status (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                current_risk_score INTEGER DEFAULT 0,
                current_risk_tier TEXT DEFAULT 'ROUTINE',
                is_chat_locked BOOLEAN DEFAULT 0,
                last_escalation_timestamp DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
            )`);

            // Appointments Table (for mandatory booking)
            db.run(`CREATE TABLE IF NOT EXISTS Appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                doctor_id INTEGER NOT NULL,
                appointment_datetime DATETIME NOT NULL,
                status TEXT DEFAULT 'SCHEDULED',
                risk_tier TEXT NOT NULL,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES Users(id) ON DELETE CASCADE,
                FOREIGN KEY (doctor_id) REFERENCES Doctors(id) ON DELETE CASCADE
            )`);

            // Doctor Availability Table (to track available time slots)
            db.run(`CREATE TABLE IF NOT EXISTS Doctor_Availability (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doctor_id INTEGER NOT NULL,
                start_datetime DATETIME NOT NULL,
                end_datetime DATETIME NOT NULL,
                is_available BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (doctor_id) REFERENCES Doctors(id) ON DELETE CASCADE
            )`);
        });
    }
});

module.exports = db;