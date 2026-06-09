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
                username TEXT UNIQUE,
                full_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                specialization TEXT,
                license_number TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Keep existing doctor tables compatible with the current schema.
            db.run(`ALTER TABLE Doctors ADD COLUMN username TEXT`, () => {});
            db.run(`ALTER TABLE Doctors ADD COLUMN full_name TEXT`, () => {});
            db.run(`ALTER TABLE Doctors ADD COLUMN specialization TEXT`, () => {});
            db.run(`ALTER TABLE Doctors ADD COLUMN license_number TEXT`, () => {});
            db.run(`ALTER TABLE Doctors ADD COLUMN created_at DATETIME`, () => {});
            db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_doctors_username ON Doctors(username)`, () => {});

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

            // Patient intake form completed before the assessment flow.
            db.run(`CREATE TABLE IF NOT EXISTS Patient_Intake (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                full_legal_name TEXT,
                preferred_name TEXT,
                date_of_birth TEXT,
                gender_sex TEXT,
                national_id TEXT,
                marital_status TEXT,
                occupation TEXT,
                education_level TEXT,
                address TEXT,
                phone_number TEXT,
                email_address TEXT,
                emergency_contact_name TEXT,
                emergency_contact_relationship TEXT,
                emergency_contact_phone TEXT,
                emergency_contact_alt_phone TEXT,
                emergency_contact_address TEXT,
                referral_source TEXT,
                referring_provider TEXT,
                referral_reason TEXT,
                presenting_problem TEXT,
                symptom_duration TEXT,
                symptom_severity TEXT,
                seeking_help_reason TEXT,
                treatment_goals TEXT,
                previous_psychiatric_diagnoses TEXT,
                previous_counseling TEXT,
                psychiatric_hospitalizations TEXT,
                self_harm_history TEXT,
                suicide_attempts TEXT,
                violence_history TEXT,
                current_mental_health_providers TEXT,
                current_medical_conditions TEXT,
                previous_illnesses_or_surgeries TEXT,
                neurological_conditions TEXT,
                current_medications TEXT,
                allergies TEXT,
                primary_care_physician_details TEXT,
                alcohol_use TEXT,
                tobacco_use TEXT,
                recreational_drug_use TEXT,
                prescription_misuse TEXT,
                addiction_treatment_history TEXT,
                family_mental_health_conditions TEXT,
                family_substance_abuse TEXT,
                family_suicide_history TEXT,
                family_medical_conditions TEXT,
                living_situation TEXT,
                family_structure TEXT,
                relationship_status TEXT,
                employment_status TEXT,
                financial_stressors TEXT,
                social_support_system TEXT,
                religious_cultural_considerations TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
        });
    }
});

module.exports = db;
