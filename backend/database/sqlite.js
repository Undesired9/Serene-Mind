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

            // Multi-Signal Risk Evaluations
            db.run(`CREATE TABLE IF NOT EXISTS Risk_Evaluations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                risk_level TEXT NOT NULL, -- LOW, MODERATE, HIGH, CRITICAL
                risk_score INTEGER NOT NULL DEFAULT 0,
                triggered_signals TEXT, -- JSON array of signals
                assessment_ref_id INTEGER,
                conversation_ref_id INTEGER,
                action_taken TEXT,
                clinician_review_status TEXT DEFAULT 'PENDING', -- PENDING, REVIEWED, ESCALATED
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
            )`);

            // Structured Clinical Interventions
            db.run(`CREATE TABLE IF NOT EXISTS Interventions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL, -- GROUNDING, BOX_BREATHING, COGNITIVE_REFRAMING, SLEEP_HYGIENE
                title TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'ASSIGNED', -- ASSIGNED, COMPLETED, SKIPPED
                patient_rating INTEGER, -- 1-5 effectiveness
                patient_feedback TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
            )`);

            // Dedicated Safety & Crisis Screenings
            db.run(`CREATE TABLE IF NOT EXISTS Safety_Screenings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                trigger_source TEXT NOT NULL, -- INTAKE, ASSESSMENT, CHAT_CONVERSATION
                self_harm_flag BOOLEAN DEFAULT 0,
                suicide_ideation_flag BOOLEAN DEFAULT 0,
                crisis_details TEXT,
                escalation_status TEXT DEFAULT 'NONE', -- NONE, NOTIFIED, ESCALATED
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
            )`);

            // Clinician Care Plans
            db.run(`CREATE TABLE IF NOT EXISTS Care_Plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                clinician_id INTEGER NOT NULL,
                primary_diagnosis_notes TEXT,
                goals TEXT,
                recommended_interventions TEXT,
                follow_up_date DATE,
                status TEXT DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED, REVISED
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES Users(id) ON DELETE CASCADE,
                FOREIGN KEY (clinician_id) REFERENCES Doctors(id) ON DELETE CASCADE
            )`);

            // Centralized Immutable Audit Logs
            db.run(`CREATE TABLE IF NOT EXISTS Audit_Logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                user_id INTEGER,
                actor_id INTEGER,
                actor_role TEXT, -- PATIENT, CLINICIAN, SYSTEM
                details TEXT,
                ip_address TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Performance Indexes for Non-Functional Requirement: Low Latency & High Scalability
            db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON Sessions(user_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON Sessions(session_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_mood_logs_user_date ON Mood_Logs(user_id, date)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON Assessments(user_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_patient_intake_user_id ON Patient_Intake(user_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_risk_evals_user_id ON Risk_Evaluations(user_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_appointments_patient ON Appointments(patient_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON Appointments(doctor_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON Audit_Logs(user_id)`);
        });
    }
});

module.exports = db;