const path = require('path');
const bcrypt = require('bcryptjs');
const { createClient } = require('@libsql/client');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const dbPath = path.resolve(__dirname, 'serenemind.db');
const tursoUrl = process.env.TURSO_DATABASE_URL ? process.env.TURSO_DATABASE_URL.trim() : '';
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN ? process.env.TURSO_AUTH_TOKEN.trim() : '';

const clientConfig = tursoUrl
    ? { url: tursoUrl, authToken: tursoAuthToken }
    : { url: `file:${dbPath.replace(/\\/g, '/')}` };

console.log(`[Database] Initializing connection to ${tursoUrl ? 'Turso Cloud (' + tursoUrl.split('@').pop() + ')' : 'Local SQLite (' + dbPath + ')'}`);

const client = createClient(clientConfig);

// Helper to normalize parameter passing between sqlite3 and libsql
function normalizeArgs(sql, params, callback) {
    let cb = callback;
    let p = params;

    if (typeof params === 'function') {
        cb = params;
        p = [];
    } else if (params === undefined || params === null) {
        p = [];
    } else if (!Array.isArray(params) && typeof params === 'object') {
        p = params;
    } else if (!Array.isArray(params)) {
        p = [params];
    }

    return { sql, params: p, callback: cb || (() => {}) };
}

// Convert BigInts to Numbers in returned row objects for json serializability
function sanitizeValue(val) {
    if (typeof val === 'bigint') {
        return Number(val);
    }
    return val;
}

function sanitizeRow(row) {
    if (!row || typeof row !== 'object') return row;
    const clean = {};
    for (const key of Object.keys(row)) {
        clean[key] = sanitizeValue(row[key]);
    }
    return clean;
}

// Global initialization promise to prevent cold-start race conditions
let initPromise = null;

// Compatibility wrapper matching sqlite3 Database API
const db = {
    client,
    isTurso: Boolean(tursoUrl),

    async ready() {
        if (initPromise) await initPromise;
    },

    run(sql, params, callback) {
        const { sql: querySql, params: queryParams, callback: cb } = normalizeArgs(sql, params, callback);
        const executeQuery = () => {
            client.execute({ sql: querySql, args: queryParams })
                .then(result => {
                    const context = {
                        lastID: result.lastInsertRowid ? Number(result.lastInsertRowid) : 0,
                        changes: result.rowsAffected || 0
                    };
                    cb.call(context, null);
                })
                .catch(err => {
                    cb.call({ lastID: 0, changes: 0 }, err);
                });
        };

        if (initPromise) {
            initPromise.then(executeQuery).catch(executeQuery);
        } else {
            executeQuery();
        }
        return this;
    },

    get(sql, params, callback) {
        const { sql: querySql, params: queryParams, callback: cb } = normalizeArgs(sql, params, callback);
        const executeQuery = () => {
            client.execute({ sql: querySql, args: queryParams })
                .then(result => {
                    const row = result.rows && result.rows.length > 0 ? sanitizeRow(result.rows[0]) : null;
                    cb(null, row);
                })
                .catch(err => {
                    cb(err, null);
                });
        };

        if (initPromise) {
            initPromise.then(executeQuery).catch(executeQuery);
        } else {
            executeQuery();
        }
        return this;
    },

    all(sql, params, callback) {
        const { sql: querySql, params: queryParams, callback: cb } = normalizeArgs(sql, params, callback);
        const executeQuery = () => {
            client.execute({ sql: querySql, args: queryParams })
                .then(result => {
                    const rows = (result.rows || []).map(sanitizeRow);
                    cb(null, rows);
                })
                .catch(err => {
                    cb(err, null);
                });
        };

        if (initPromise) {
            initPromise.then(executeQuery).catch(executeQuery);
        } else {
            executeQuery();
        }
        return this;
    },

    exec(sql, callback) {
        const cb = callback || (() => {});
        const executeQuery = () => {
            client.executeMultiple(sql)
                .then(() => cb(null))
                .catch(err => cb(err));
        };

        if (initPromise) {
            initPromise.then(executeQuery).catch(executeQuery);
        } else {
            executeQuery();
        }
        return this;
    },

    serialize(callback) {
        if (typeof callback === 'function') {
            callback();
        }
        return this;
    },

    // Modern Promise-based utilities
    async execute(sql, args = []) {
        if (initPromise) await initPromise;
        return client.execute({ sql, args });
    },

    async queryGet(sql, args = []) {
        if (initPromise) await initPromise;
        const res = await client.execute({ sql, args });
        return res.rows && res.rows.length > 0 ? sanitizeRow(res.rows[0]) : null;
    },

    async queryAll(sql, args = []) {
        if (initPromise) await initPromise;
        const res = await client.execute({ sql, args });
        return (res.rows || []).map(sanitizeRow);
    },

    async queryRun(sql, args = []) {
        if (initPromise) await initPromise;
        const res = await client.execute({ sql, args });
        return {
            lastID: res.lastInsertRowid ? Number(res.lastInsertRowid) : 0,
            changes: res.rowsAffected || 0
        };
    }
};

// Automated Schema Initialization
const schemaStatements = [
    `CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS Doctors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        specialization TEXT,
        license_number TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS Admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS Chat_Sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS Sessions (
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
    )`,

    `CREATE TABLE IF NOT EXISTS Mood_Logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        mood_score INTEGER NOT NULL,
        notes TEXT,
        date DATE DEFAULT CURRENT_DATE,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS Assessments (
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
    )`,

    `CREATE TABLE IF NOT EXISTS Patient_Intake (
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
    )`,

    `CREATE TABLE IF NOT EXISTS Patient_Reports (
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
    )`,

    `CREATE TABLE IF NOT EXISTS User_Escalation_Status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        current_risk_score INTEGER DEFAULT 0,
        current_risk_tier TEXT DEFAULT 'ROUTINE',
        is_chat_locked BOOLEAN DEFAULT 0,
        last_escalation_timestamp DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS Appointments (
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
    )`,

    `CREATE TABLE IF NOT EXISTS Doctor_Availability (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doctor_id INTEGER NOT NULL,
        start_datetime DATETIME NOT NULL,
        end_datetime DATETIME NOT NULL,
        is_available BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (doctor_id) REFERENCES Doctors(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS Risk_Evaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        risk_level TEXT NOT NULL,
        risk_score INTEGER NOT NULL DEFAULT 0,
        triggered_signals TEXT,
        assessment_ref_id INTEGER,
        conversation_ref_id INTEGER,
        action_taken TEXT,
        clinician_review_status TEXT DEFAULT 'PENDING',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS Interventions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'ASSIGNED',
        patient_rating INTEGER,
        patient_feedback TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS Safety_Screenings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        trigger_source TEXT NOT NULL,
        self_harm_flag BOOLEAN DEFAULT 0,
        suicide_ideation_flag BOOLEAN DEFAULT 0,
        crisis_details TEXT,
        escalation_status TEXT DEFAULT 'NONE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS Care_Plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        clinician_id INTEGER NOT NULL,
        primary_diagnosis_notes TEXT,
        goals TEXT,
        recommended_interventions TEXT,
        follow_up_date DATE,
        status TEXT DEFAULT 'ACTIVE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY (clinician_id) REFERENCES Doctors(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS Audit_Logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        user_id INTEGER,
        actor_id INTEGER,
        actor_role TEXT,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON Sessions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON Sessions(session_id)`,
    `CREATE INDEX IF NOT EXISTS idx_mood_logs_user_date ON Mood_Logs(user_id, date)`,
    `CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON Assessments(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_patient_intake_user_id ON Patient_Intake(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_risk_evals_user_id ON Risk_Evaluations(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_appointments_patient ON Appointments(patient_id)`,
    `CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON Appointments(doctor_id)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON Audit_Logs(user_id)`,

    // ── Group 3: Doctor Portal — Patient Assignment ────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS Patient_Doctor_Assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        doctor_id  INTEGER NOT NULL,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'ACTIVE',
        assigned_by TEXT DEFAULT 'SYSTEM',
        UNIQUE(patient_id, doctor_id),
        FOREIGN KEY (patient_id) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id)  REFERENCES Doctors(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS Clinician_Messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_doctor_id   INTEGER NOT NULL,
        recipient_patient_id INTEGER,
        recipient_doctor_id  INTEGER,
        subject TEXT,
        body TEXT NOT NULL,
        is_read BOOLEAN DEFAULT 0,
        read_at DATETIME,
        priority TEXT DEFAULT 'NORMAL',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_doctor_id)    REFERENCES Doctors(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_patient_id) REFERENCES Users(id)   ON DELETE CASCADE,
        FOREIGN KEY (recipient_doctor_id)  REFERENCES Doctors(id)  ON DELETE CASCADE
    )`,

    `CREATE INDEX IF NOT EXISTS idx_pda_patient  ON Patient_Doctor_Assignments(patient_id)`,
    `CREATE INDEX IF NOT EXISTS idx_pda_doctor   ON Patient_Doctor_Assignments(doctor_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cm_recipient ON Clinician_Messages(recipient_patient_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cm_sender    ON Clinician_Messages(sender_doctor_id)`
];

async function seedDefaultDoctors() {
    try {
        const countRes = await client.execute("SELECT COUNT(*) as count FROM Doctors");
        const count = countRes.rows && countRes.rows.length > 0 ? Number(countRes.rows[0].count || 0) : 0;
        
        if (count === 0) {
            console.log('🌱 Seeding default clinicians into database...');
            const defaultPasswordHash = bcrypt.hashSync('Password123!', 10);

            const doctors = [
                {
                    username: 'dr.mitchell',
                    full_name: 'Dr. Sarah Mitchell, MD',
                    email: 'dr.mitchell@serenemind.org',
                    password_hash: defaultPasswordHash,
                    specialization: 'Clinical Psychologist & CBT Specialist',
                    license_number: 'PSY-89241-CA'
                },
                {
                    username: 'dr.wilson',
                    full_name: 'Dr. James Wilson, MD',
                    email: 'dr.wilson@serenemind.org',
                    password_hash: defaultPasswordHash,
                    specialization: 'Adult Psychiatry & Mood Disorders',
                    license_number: 'MED-77149-NY'
                },
                {
                    username: 'dr.vance',
                    full_name: 'Dr. Emily Vance, PsyD',
                    email: 'dr.vance@serenemind.org',
                    password_hash: defaultPasswordHash,
                    specialization: 'Trauma & Mindfulness-Based Therapy',
                    license_number: 'PSY-63201-TX'
                },
                {
                    username: 'dr.kim',
                    full_name: 'Dr. David Kim, MD',
                    email: 'dr.kim@serenemind.org',
                    password_hash: defaultPasswordHash,
                    specialization: 'Anxiety & Stress Management',
                    license_number: 'PSY-51203-IL'
                }
            ];

            for (const doc of doctors) {
                await client.execute({
                    sql: `INSERT OR IGNORE INTO Doctors (username, full_name, email, password_hash, specialization, license_number, approval_status) 
                          VALUES (?, ?, ?, ?, ?, ?, 'APPROVED')`,
                    args: [doc.username, doc.full_name, doc.email, doc.password_hash, doc.specialization, doc.license_number]
                });
            }
            console.log('✅ Default clinicians seeded successfully.');
        }
    } catch (err) {
        console.warn('⚠️ Clinician seeding note:', err.message);
    }
}

async function seedDefaultAdmin() {
    try {
        const countRes = await client.execute("SELECT COUNT(*) as count FROM Admins");
        const count = countRes.rows && countRes.rows.length > 0 ? Number(countRes.rows[0].count || 0) : 0;

        // Only seed if the Admins table is empty (guard preserved in both modes).
        if (count === 0) {
            const isProduction = process.env.NODE_ENV === 'production';
            const adminPassword = (process.env.ADMIN_PASSWORD || '').trim();

            // Production safety: NEVER fall back to the known default password. Seeding is
            // only allowed when an explicit (strong) ADMIN_PASSWORD is provided; otherwise
            // this is a misconfiguration and the admin account is simply not created.
            if (isProduction) {
                if (!adminPassword) {
                    console.error('⚠️ ADMIN SEED SKIPPED: NODE_ENV=production but ADMIN_PASSWORD is not set. Set ADMIN_PASSWORD (and optionally ADMIN_USERNAME/ADMIN_EMAIL) in the environment to create the initial admin.');
                    return;
                }
                if (adminPassword.length < 8) {
                    console.error('⚠️ ADMIN SEED SKIPPED: NODE_ENV=production but ADMIN_PASSWORD is shorter than 8 characters. Set a strong ADMIN_PASSWORD (at least 8 characters) in the environment to create the initial admin.');
                    return;
                }
            }

            console.log('🌱 Seeding default platform administrator...');
            const adminUsername = (process.env.ADMIN_USERNAME || 'admin').trim();
            const adminFullName = (process.env.ADMIN_FULL_NAME || 'Platform Administrator').trim();
            const adminEmail = (process.env.ADMIN_EMAIL || 'admin@serenemind.app').trim();
            // Dev/demo: documented default password 'Admin@12345' unless overridden.
            const passwordHash = bcrypt.hashSync(isProduction ? adminPassword : (adminPassword || 'Admin@12345'), 10);

            await client.execute({
                sql: `INSERT INTO Admins (username, full_name, email, password_hash) VALUES (?, ?, ?, ?)`,
                args: [adminUsername, adminFullName, adminEmail, passwordHash]
            });
            console.log('✅ Default platform administrator seeded successfully.');
        }
    } catch (err) {
        console.warn('⚠️ Admin seeding note:', err.message);
    }
}

/**
 * Safe ALTER TABLE migration — adds columns to existing tables without crashing if they already exist.
 * SQLite does not support IF NOT EXISTS for ADD COLUMN, so we catch the error and continue.
 */
const migrationStatements = [
    // Patient_Intake: care status for stepped care / discharge tracking
    { sql: `ALTER TABLE Patient_Intake ADD COLUMN care_status TEXT DEFAULT 'ACTIVE'`,           label: 'Patient_Intake.care_status' },
    // Risk_Evaluations: clinician manual override fields
    { sql: `ALTER TABLE Risk_Evaluations ADD COLUMN manual_override_tier TEXT`,                 label: 'Risk_Evaluations.manual_override_tier' },
    { sql: `ALTER TABLE Risk_Evaluations ADD COLUMN override_reason TEXT`,                      label: 'Risk_Evaluations.override_reason' },
    { sql: `ALTER TABLE Risk_Evaluations ADD COLUMN overridden_by_doctor_id INTEGER`,           label: 'Risk_Evaluations.overridden_by_doctor_id' },
    { sql: `ALTER TABLE Risk_Evaluations ADD COLUMN overridden_at DATETIME`,                    label: 'Risk_Evaluations.overridden_at' },
    // Care_Plans: patient acknowledgment + structured SOAP fields
    { sql: `ALTER TABLE Care_Plans ADD COLUMN viewed_at DATETIME`,                             label: 'Care_Plans.viewed_at' },
    { sql: `ALTER TABLE Care_Plans ADD COLUMN soap_subjective TEXT`,                           label: 'Care_Plans.soap_subjective' },
    { sql: `ALTER TABLE Care_Plans ADD COLUMN soap_objective TEXT`,                            label: 'Care_Plans.soap_objective' },
    { sql: `ALTER TABLE Care_Plans ADD COLUMN soap_assessment TEXT`,                           label: 'Care_Plans.soap_assessment' },
    { sql: `ALTER TABLE Care_Plans ADD COLUMN soap_plan TEXT`,                                 label: 'Care_Plans.soap_plan' },
    // Doctors: clinician approval workflow (admin panel). New registrations start PENDING;
    // existing/seeded rows are grandfathered APPROVED via the column default.
    { sql: `ALTER TABLE Doctors ADD COLUMN approval_status TEXT DEFAULT 'APPROVED'`,           label: 'Doctors.approval_status' },
    { sql: `ALTER TABLE Doctors ADD COLUMN rejection_reason TEXT`,                             label: 'Doctors.rejection_reason' },
    { sql: `ALTER TABLE Doctors ADD COLUMN reviewed_at DATETIME`,                              label: 'Doctors.reviewed_at' },
    { sql: `ALTER TABLE Doctors ADD COLUMN reviewed_by INTEGER`,                               label: 'Doctors.reviewed_by' }
];

async function runMigrations() {
    for (const { sql, label } of migrationStatements) {
        const [table, column] = label.split('.');
        try {
            // SQLite lacks ALTER TABLE ... ADD COLUMN IF NOT EXISTS, so check the
            // live schema first instead of relying on brittle error-message matching.
            const res = await client.execute(`PRAGMA table_info(${table})`);
            const alreadyPresent = (res.rows || []).some(r => r.name === column);
            if (alreadyPresent) continue;

            await client.execute(sql);
            console.log(`✅ Migration applied: ${label}`);
        } catch (err) {
            console.warn(`⚠️ Migration failed (${label}): ${err.message}`);
        }
    }
}

async function initializeDatabase() {
    try {
        for (const stmt of schemaStatements) {
            await client.execute(stmt);
        }
        await runMigrations();
        await seedDefaultDoctors();
        await seedDefaultAdmin();
        console.log('✅ SereneMind SQLite/Turso database schema initialized successfully.');
    } catch (err) {
        console.error('⚠️ Database schema initialization notice:', err.message);
    }
}

// Trigger schema setup with initPromise for race condition prevention
initPromise = initializeDatabase();

module.exports = db;