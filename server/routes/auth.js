const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/sqlite');
const { verifyToken } = require('../middleware/auth');
const { logAuditEvent } = require('../services/auditLogger');
const { evaluateMultiSignalRisk } = require('../services/riskEngine');

const { JWT_SECRET } = require('../config');

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

const allRows = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
    });
});

const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;
const LICENSE_PATTERN = /^[A-Za-z0-9/-][A-Za-z0-9/ -]*$/;
const PERSON_NAME_PATTERN = /^[A-Za-z][A-Za-z\s.'-]{1,79}$/;
const PHONE_PATTERN = /^\+?[0-9\s()-]{7,18}$/;
const GENERIC_TEXT_PATTERN = /^[A-Za-z0-9\s,.'()/-]{2,80}$/;
const NATIONAL_ID_PATTERN = /^[A-Za-z0-9/-]{4,30}$/;

const normalizeEmail = (value = '') => value.trim().toLowerCase();
const normalizeUsername = (value = '') => value.trim();
const normalizeIdentifier = (value = '') => value.trim();

const validateUsername = (value, label = 'Username') => {
    if (!value) return `${label} is required`;
    if (value.length < 3 || value.length > 24) return `${label} must be 3-24 characters long`;
    if (!USERNAME_PATTERN.test(value)) {
        return `${label} can only contain letters, numbers, dots, underscores, and hyphens`;
    }
    return '';
};

const validateEmail = (value) => {
    if (!value) return 'Email is required';
    if (value.length > 254) return 'Email is too long';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
    return '';
};

const validatePassword = (value) => {
    if (!value) return 'Password is required';
    if (value.length < 8 || value.length > 64) return 'Password must be 8-64 characters long';
    if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) {
        return 'Password must include uppercase, lowercase, and a number';
    }
    return '';
};

const validateFullName = (value) => {
    if (!value) return 'Full name is required';
    if (value.length < 2 || value.length > 80) return 'Full name must be 2-80 characters long';
    return '';
};

const validateLicenseNumber = (value) => {
    if (!value) return '';
    if (value.length > 40) return 'License number is too long';
    if (!LICENSE_PATTERN.test(value)) {
        return 'License number can only contain letters, numbers, spaces, slashes, and hyphens';
    }
    return '';
};

const validateRegisterPayload = ({ username, email, password, confirmPassword, fullName, licenseNumber, isDoctor = false }) => {
    if (isDoctor) {
        const fullNameError = validateFullName(fullName);
        if (fullNameError) return fullNameError;
    }

    const usernameError = validateUsername(username);
    if (usernameError) return usernameError;

    const emailError = validateEmail(email);
    if (emailError) return emailError;

    const passwordError = validatePassword(password);
    if (passwordError) return passwordError;

    if (!confirmPassword) return 'Please confirm your password';
    if (password !== confirmPassword) return 'Passwords do not match';

    if (isDoctor) {
        const licenseError = validateLicenseNumber(licenseNumber);
        if (licenseError) return licenseError;
    }

    return '';
};

const validateLoginPayload = ({ identifier, password }) => {
    if (!identifier) return 'Please provide username or email and password';
    if (identifier.length < 3 || identifier.length > 254) {
        return 'Username or email must be 3-254 characters long';
    }
    if (!password) return 'Please provide username or email and password';
    if (password.length > 64) return 'Password is too long';
    return '';
};

const normalizeText = (value = '') => String(value).trim();

const validateIntakePayload = (payload) => {
    const fullLegalName = normalizeText(payload.fullLegalName);
    const dateOfBirth = payload.dateOfBirth;
    const genderSex = normalizeText(payload.genderSex);
    const phoneNumber = normalizeText(payload.phoneNumber);
    const emergencyContactName = normalizeText(payload.emergencyContactName);
    const emergencyContactPhone = normalizeText(payload.emergencyContactPhone);
    const emergencyContactAltPhone = normalizeText(payload.emergencyContactAltPhone);
    const emergencyContactRelationship = normalizeText(payload.emergencyContactRelationship);
    const presentingProblem = normalizeText(payload.presentingProblem);

    // Required Fields
    if (!fullLegalName || fullLegalName.length < 2) {
        return 'Full legal name is required (at least 2 characters)';
    }
    if (!PERSON_NAME_PATTERN.test(fullLegalName)) {
        return 'Please enter a valid full legal name';
    }

    if (!dateOfBirth) {
        return 'Date of birth is required';
    }
    const dob = new Date(dateOfBirth);
    const now = new Date();
    const age = now.getFullYear() - dob.getFullYear() - (
        now.getMonth() < dob.getMonth() ||
        (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate()) ? 1 : 0
    );
    if (Number.isNaN(dob.getTime()) || dateOfBirth > new Date().toISOString().split('T')[0] || age < 5 || age > 120) {
        return 'Please enter a valid date of birth (age 5-120)';
    }

    if (!genderSex) {
        return 'Please select your gender';
    }

    if (!phoneNumber || !PHONE_PATTERN.test(phoneNumber)) {
        return 'Please enter a valid primary phone number';
    }

    if (!emergencyContactName || !PERSON_NAME_PATTERN.test(emergencyContactName)) {
        return 'Please enter an emergency contact name';
    }

    if (!emergencyContactPhone || !PHONE_PATTERN.test(emergencyContactPhone)) {
        return 'Please enter a valid emergency contact phone number';
    }

    if (!presentingProblem || presentingProblem.length < 3) {
        return 'Please describe what brings you in or your primary concerns';
    }

    // Optional Fields (validated only if present)
    if (emergencyContactAltPhone && !PHONE_PATTERN.test(emergencyContactAltPhone)) {
        return 'Please enter a valid alternative contact phone number';
    }
    if (emergencyContactRelationship && !GENERIC_TEXT_PATTERN.test(emergencyContactRelationship)) {
        return 'Please enter a valid emergency contact relationship';
    }

    return '';
};

// Register User
router.post('/register', async (req, res) => {
    const username = normalizeUsername(req.body.username);
    const email = normalizeEmail(req.body.email);
    const password = req.body.password || '';
    const confirmPassword = req.body.confirmPassword || '';
    const validationError = validateRegisterPayload({ username, email, password, confirmPassword });

    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    try {
        const existingUser = await getRow(
            `SELECT id FROM Users WHERE lower(username) = lower(?) OR lower(email) = lower(?)`,
            [username, email]
        );

        if (existingUser) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(password, salt);
        const result = await runStatement(
            `INSERT INTO Users (username, email, password_hash) VALUES (?, ?, ?)`,
            [username, email, passwordHash]
        );

        const token = jwt.sign({ id: result.lastID, username, role: 'patient' }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            message: 'User created successfully',
            token,
            user: { id: result.lastID, username, email, role: 'patient', needsIntake: true, needsAssessment: true }
        });
    } catch (err) {
        if (err.message && err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        return res.status(500).json({ error: 'Database error: registration failed' });
    }
});

// Login User
router.post('/login', async (req, res) => {
    const identifier = normalizeIdentifier(req.body.identifier || req.body.email || req.body.username);
    const password = req.body.password || '';
    const validationError = validateLoginPayload({ identifier, password });

    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    try {
        const user = await getRow(
            `SELECT * FROM Users WHERE lower(email) = lower(?) OR lower(username) = lower(?)`,
            [identifier, identifier]
        );

        if (!user) {
            return res.status(401).json({ error: 'Invalid username/email or password' });
        }

        const isValidPassword = bcrypt.compareSync(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid username/email or password' });
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: 'patient' }, JWT_SECRET, { expiresIn: '7d' });
        const intake = await getRow(`SELECT id FROM Patient_Intake WHERE user_id = ?`, [user.id]);
        const assessment = await getRow(`SELECT id FROM Assessments WHERE user_id = ?`, [user.id]);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: 'patient',
                needsIntake: !intake,
                needsAssessment: !assessment
            }
        });
    } catch (err) {
        return res.status(500).json({ error: 'Database query error' });
    }
});

router.get('/intake', verifyToken, async (req, res) => {
    try {
        const intake = await getRow(`SELECT * FROM Patient_Intake WHERE user_id = ?`, [req.user.id]);
        res.json({ intake: intake || null });
    } catch (err) {
        console.error('Intake fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch intake form.' });
    }
});

router.post('/intake', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const {
        fullLegalName,
        preferredName,
        dateOfBirth,
        genderSex,
        nationalId,
        maritalStatus,
        occupation,
        educationLevel,
        address,
        phoneNumber,
        emailAddress,
        emergencyContactName,
        emergencyContactRelationship,
        emergencyContactPhone,
        emergencyContactAltPhone,
        emergencyContactAddress,
        referralSource,
        referringProvider,
        referralReason,
        presentingProblem,
        symptomDuration,
        symptomSeverity,
        seekingHelpReason,
        treatmentGoals,
        previousPsychiatricDiagnoses,
        previousCounseling,
        psychiatricHospitalizations,
        selfHarmHistory,
        suicideAttempts,
        violenceHistory,
        currentMentalHealthProviders,
        currentMedicalConditions,
        previousIllnessesOrSurgeries,
        neurologicalConditions,
        currentMedications,
        allergies,
        primaryCarePhysicianDetails,
        alcoholUse,
        tobaccoUse,
        recreationalDrugUse,
        prescriptionMisuse,
        addictionTreatmentHistory,
        familyMentalHealthConditions,
        familySubstanceAbuse,
        familySuicideHistory,
        familyMedicalConditions,
        livingSituation,
        familyStructure,
        relationshipStatus,
        employmentStatus,
        financialStressors,
        socialSupportSystem,
        religiousCulturalConsiderations
    } = req.body;

    try {
        const user = await getRow(`SELECT email FROM Users WHERE id = ?`, [userId]);
        if (!user) {
            return res.status(404).json({ error: 'User account not found.' });
        }

        const validationError = validateIntakePayload(req.body, user.email);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        const fields = {
            full_legal_name: normalizeText(fullLegalName),
            preferred_name: normalizeText(preferredName),
            date_of_birth: dateOfBirth,
            gender_sex: normalizeText(genderSex),
            national_id: normalizeText(nationalId),
            marital_status: normalizeText(maritalStatus),
            occupation: normalizeText(occupation),
            education_level: normalizeText(educationLevel),
            address: normalizeText(address),
            phone_number: normalizeText(phoneNumber),
            email_address: normalizeEmail(emailAddress),
            emergency_contact_name: normalizeText(emergencyContactName),
            emergency_contact_relationship: normalizeText(emergencyContactRelationship),
            emergency_contact_phone: normalizeText(emergencyContactPhone),
            emergency_contact_alt_phone: normalizeText(emergencyContactAltPhone),
            emergency_contact_address: normalizeText(emergencyContactAddress),
            referral_source: normalizeText(referralSource),
            referring_provider: normalizeText(referringProvider),
            referral_reason: normalizeText(referralReason),
            presenting_problem: normalizeText(presentingProblem),
            symptom_duration: normalizeText(symptomDuration),
            symptom_severity: normalizeText(symptomSeverity),
            seeking_help_reason: normalizeText(seekingHelpReason),
            treatment_goals: normalizeText(treatmentGoals),
            previous_psychiatric_diagnoses: normalizeText(previousPsychiatricDiagnoses),
            previous_counseling: normalizeText(previousCounseling),
            psychiatric_hospitalizations: normalizeText(psychiatricHospitalizations),
            self_harm_history: normalizeText(selfHarmHistory),
            suicide_attempts: normalizeText(suicideAttempts),
            violence_history: normalizeText(violenceHistory),
            current_mental_health_providers: normalizeText(currentMentalHealthProviders),
            current_medical_conditions: normalizeText(currentMedicalConditions),
            previous_illnesses_or_surgeries: normalizeText(previousIllnessesOrSurgeries),
            neurological_conditions: normalizeText(neurologicalConditions),
            current_medications: normalizeText(currentMedications),
            allergies: normalizeText(allergies),
            primary_care_physician_details: normalizeText(primaryCarePhysicianDetails),
            alcohol_use: normalizeText(alcoholUse),
            tobacco_use: normalizeText(tobaccoUse),
            recreational_drug_use: normalizeText(recreationalDrugUse),
            prescription_misuse: normalizeText(prescriptionMisuse),
            addiction_treatment_history: normalizeText(addictionTreatmentHistory),
            family_mental_health_conditions: normalizeText(familyMentalHealthConditions),
            family_substance_abuse: normalizeText(familySubstanceAbuse),
            family_suicide_history: normalizeText(familySuicideHistory),
            family_medical_conditions: normalizeText(familyMedicalConditions),
            living_situation: normalizeText(livingSituation),
            family_structure: normalizeText(familyStructure),
            relationship_status: normalizeText(relationshipStatus),
            employment_status: normalizeText(employmentStatus),
            financial_stressors: normalizeText(financialStressors),
            social_support_system: normalizeText(socialSupportSystem),
            religious_cultural_considerations: normalizeText(religiousCulturalConsiderations)
        };

        const columns = ['user_id', ...Object.keys(fields)];
        const insertValues = [userId, ...Object.values(fields)];
        const placeholders = columns.map(() => '?').join(', ');
        const updateAssignments = Object.keys(fields)
            .map((column) => `${column} = excluded.${column}`)
            .join(', ');

        await runStatement(
            `
                INSERT INTO Patient_Intake (${columns.join(', ')})
                VALUES (${placeholders})
                ON CONFLICT(user_id) DO UPDATE SET
                    ${updateAssignments},
                    updated_at = CURRENT_TIMESTAMP
            `,
            insertValues
        );

        logAuditEvent('INTAKE_COMPLETED', userId, userId, 'PATIENT', { presentingProblem: fields.presenting_problem });

        res.status(201).json({ message: 'Intake form saved successfully.' });
    } catch (err) {
        console.error('Intake save error:', err);
        res.status(500).json({ error: 'Failed to save intake form.' });
    }
});

// Register Doctor
router.post('/doctor/register', async (req, res) => {
    const fullName = (req.body.fullName || '').trim();
    const username = normalizeUsername(req.body.username);
    const email = normalizeEmail(req.body.email);
    const password = req.body.password || '';
    const confirmPassword = req.body.confirmPassword || '';
    const specialization = (req.body.specialization || '').trim();
    const licenseNumber = (req.body.licenseNumber || '').trim();
    const validationError = validateRegisterPayload({
        username,
        email,
        password,
        confirmPassword,
        fullName,
        licenseNumber,
        isDoctor: true
    });

    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    try {
        const doctorColumns = await allRows(`PRAGMA table_info(Doctors)`);
        const hasUsernameColumn = doctorColumns.some(column => column.name === 'username');

        if (!hasUsernameColumn) {
            return res.status(500).json({ error: 'Doctor username support is unavailable. Please restart the server and try again.' });
        }

        const existingDoctor = await getRow(
            `SELECT id FROM Doctors WHERE lower(username) = lower(?) OR lower(email) = lower(?)`,
            [username, email]
        );

        if (existingDoctor) {
            return res.status(400).json({ error: 'Doctor username or email already exists' });
        }

        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(password, salt);

        const fields = ['username', 'full_name', 'email', 'password_hash', 'specialization', 'license_number'];
        const values = [username, fullName, email, passwordHash, specialization || '', licenseNumber || ''];

        const placeholders = fields.map(() => '?').join(', ');
        const result = await runStatement(
            `INSERT INTO Doctors (${fields.join(', ')}) VALUES (${placeholders})`,
            values
        );

        const token = jwt.sign(
            { id: result.lastID, username, fullName, email, role: 'doctor' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        logAuditEvent('DOCTOR_REGISTERED', result.lastID, result.lastID, 'CLINICIAN', { action: 'Doctor registered' });

        res.status(201).json({
            message: 'Doctor account created successfully',
            token,
            user: {
                id: result.lastID,
                username,
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
            return res.status(400).json({ error: 'Doctor username or email already exists' });
        }

        console.error('Doctor registration error:', err);
        res.status(500).json({ error: 'Doctor registration failed' });
    }
});

// Login Doctor
router.post('/doctor/login', async (req, res) => {
    const identifier = normalizeIdentifier(req.body.identifier || req.body.email || req.body.username);
    const password = req.body.password || '';
    const validationError = validateLoginPayload({ identifier, password });

    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    try {
        const doctorColumns = await allRows(`PRAGMA table_info(Doctors)`);
        const hasUsernameColumn = doctorColumns.some(column => column.name === 'username');
        const doctor = hasUsernameColumn
            ? await getRow(
                `SELECT * FROM Doctors WHERE lower(email) = lower(?) OR lower(username) = lower(?)`,
                [identifier, identifier]
            )
            : await getRow(`SELECT * FROM Doctors WHERE lower(email) = lower(?)`, [identifier]);

        if (!doctor) {
            return res.status(401).json({ error: 'Invalid username/email or password' });
        }

        const isValidPassword = bcrypt.compareSync(password, doctor.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid username/email or password' });
        }

        const token = jwt.sign(
            { id: doctor.id, username: doctor.username || '', fullName: doctor.full_name, email: doctor.email, role: 'doctor' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        logAuditEvent('LOGIN', doctor.id, doctor.id, 'CLINICIAN', { action: 'Doctor logged in' });

        res.json({
            message: 'Doctor login successful',
            token,
            user: {
                id: doctor.id,
                username: doctor.username || '',
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
    
    const sql = `DELETE FROM Users WHERE id = ?`;
    
    db.run(sql, [userId], function(err) {
        if (err) {
            console.error('Account deletion error:', err);
            return res.status(500).json({ error: 'Failed to delete account. Please try again later.' });
        }
        logAuditEvent('ACCOUNT_DELETED', userId, userId, 'PATIENT');
        res.json({ message: 'Account and all associated personal data have been permanently deleted.' });
    });
});

// Submit Clinical Assessment (PHQ-9 & GAD-7)
router.post('/assessment', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { 
        answers, 
        depressionScore, 
        anxietyScore, 
        stressScore, 
        totalScore, 
        phq9_score,
        gad7_score,
        mainConcerns, 
        selfHarmRisk 
    } = req.body; 

    const phq = typeof phq9_score === 'number' ? phq9_score : (typeof depressionScore === 'number' ? depressionScore : 0);
    const gad = typeof gad7_score === 'number' ? gad7_score : (typeof anxietyScore === 'number' ? anxietyScore : 0);
    const total = typeof totalScore === 'number' ? totalScore : (phq + gad);
    const ansArray = Array.isArray(answers) ? answers : [];

    const sql = `
        INSERT INTO Assessments (
            user_id, answers, depression_score, anxiety_score, stress_score, 
            total_score, main_concern, self_harm_risk
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            answers = excluded.answers,
            depression_score = excluded.depression_score,
            anxiety_score = excluded.anxiety_score,
            stress_score = excluded.stress_score,
            total_score = excluded.total_score,
            main_concern = excluded.main_concern,
            self_harm_risk = excluded.self_harm_risk,
            timestamp = CURRENT_TIMESTAMP
    `;

    const params = [
        userId, 
        JSON.stringify(ansArray), 
        phq, 
        gad, 
        stressScore || 0, 
        total, 
        mainConcerns || '', 
        selfHarmRisk ? 1 : 0
    ];

    db.run(sql, params, async function(err) {
        if (err) {
            console.error('Assessment insert error:', err);
            return res.status(500).json({ error: 'Failed to save assessment.' });
        }

        // Record Safety Screening
        if (selfHarmRisk) {
            db.run(`INSERT INTO Safety_Screenings (user_id, trigger_source, self_harm_flag, suicide_ideation_flag, crisis_details, escalation_status)
                    VALUES (?, 'ASSESSMENT', 1, 1, 'Self-harm or crisis flag active on screening questionnaire', 'ESCALATED')`, [userId]);
            logAuditEvent('SAFETY_SCREEN_COMPLETED', userId, userId, 'PATIENT', { flag: 'POSITIVE' });
        } else {
            logAuditEvent('SAFETY_SCREEN_COMPLETED', userId, userId, 'PATIENT', { flag: 'NEGATIVE' });
        }

        logAuditEvent('PHQ9_COMPLETED', userId, userId, 'PATIENT', { score: phq });
        logAuditEvent('GAD7_COMPLETED', userId, userId, 'PATIENT', { score: gad });

        // Trigger Multi-Signal Risk Engine
        const riskEvaluation = await evaluateMultiSignalRisk(userId);

        res.status(201).json({ 
            message: 'Assessment saved successfully',
            riskEvaluation,
            user: {
                id: userId,
                needsAssessment: false
            }
        });
    });
});

module.exports = router;
