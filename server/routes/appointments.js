const express = require('express');
const router = express.Router();
const db = require('../database/sqlite');
const { verifyToken, requireDoctor } = require('../middleware/auth');

// Helper to get all approved doctors (patients can only book with approved clinicians)
const getAllDoctors = () => {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT id, full_name, email, specialization, approval_status
             FROM Doctors
             WHERE COALESCE(approval_status, 'APPROVED') = 'APPROVED'
             ORDER BY full_name ASC`,
            [],
            (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            }
        );
    });
};

// Helper to generate sample availability slots (for demo purposes)
const generateSampleAvailability = (doctorId) => {
    const slots = [];
    const now = new Date();
    for (let i = 1; i <= 7; i++) {
        const date = new Date(now);
        date.setDate(now.getDate() + i);
        for (let hour = 9; hour <= 17; hour += 2) {
            const start = new Date(date);
            start.setHours(hour, 0, 0, 0);
            const end = new Date(date);
            end.setHours(hour + 1, 0, 0, 0);
            slots.push({
                doctor_id: doctorId,
                start_datetime: start.toISOString(),
                end_datetime: end.toISOString()
            });
        }
    }
    return slots;
};

// GET: Get all doctors (for booking)
router.get('/doctors', verifyToken, async (req, res) => {
    try {
        const doctors = await getAllDoctors();
        res.json(doctors);
    } catch (err) {
        console.error('Failed to get doctors:', err);
        res.status(500).json({ error: 'Failed to get doctors' });
    }
});

// GET: Get doctor availability slots (only for approved clinicians)
router.get('/doctors/:doctorId/availability', verifyToken, async (req, res) => {
    const { doctorId } = req.params;
    try {
        // Only approved clinicians are bookable; PENDING/REJECTED (and legacy NULL)
        // doctors are not shown as available to patients.
        const doctor = await new Promise((resolve) => {
            db.get(
                `SELECT id FROM Doctors WHERE id = ? AND COALESCE(approval_status, 'APPROVED') = 'APPROVED'`,
                [doctorId],
                (err, row) => resolve(row)
            );
        });

        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found or unavailable' });
        }

        const slots = generateSampleAvailability(doctorId);
        res.json(slots);
    } catch (err) {
        console.error('Failed to get availability:', err);
        res.status(500).json({ error: 'Failed to get availability' });
    }
});

// GET: Alias for mobile consistency
router.get('/', verifyToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const appointments = await new Promise((resolve, reject) => {
            db.all(
                `SELECT a.*, d.full_name as doctor_name 
                 FROM Appointments a 
                 JOIN Doctors d ON a.doctor_id = d.id 
                 WHERE a.patient_id = ? 
                 ORDER BY a.appointment_datetime DESC`,
                [userId],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
        res.json(appointments);
    } catch (err) {
        console.error('Failed to get appointments:', err);
        res.status(500).json({ error: 'Failed to get appointments' });
    }
});

// POST: Book an appointment (with strict validation)
const handleBooking = async (req, res) => {
    const userId = req.user.id;
    const doctorId = parseInt(req.body.doctorId || req.body.doctor_id, 10);
    const rawDatetime = req.body.appointmentDatetime || req.body.appointment_date;
    const rawNotes = req.body.notes || '';

    // 1. Validate Doctor ID
    if (!doctorId || isNaN(doctorId) || doctorId <= 0) {
        return res.status(400).json({ error: 'Valid Doctor ID is required' });
    }

    // 2. Validate Datetime
    if (!rawDatetime) {
        return res.status(400).json({ error: 'Appointment date and time are required' });
    }

    const apptDate = new Date(rawDatetime);
    if (isNaN(apptDate.getTime())) {
        return res.status(400).json({ error: 'Enter a valid appointment date and time format (YYYY-MM-DD HH:MM)' });
    }

    if (apptDate.getTime() < Date.now() - 60000) {
        return res.status(400).json({ error: 'Appointment time must be in the future' });
    }

    // 3. Sanitize and trim notes
    const notes = String(rawNotes).trim().slice(0, 500);

    try {
        // Verify doctor exists AND is approved (patients can only book approved clinicians)
        const doctor = await new Promise((resolve) => {
            db.get(
                `SELECT id FROM Doctors WHERE id = ? AND COALESCE(approval_status, 'APPROVED') = 'APPROVED'`,
                [doctorId],
                (err, row) => resolve(row)
            );
        });

        if (!doctor) {
            return res.status(404).json({ error: 'Selected clinician does not exist' });
        }

        const formattedDatetime = apptDate.toISOString();

        // Double-booking guard: reject overlapping 1-hour slots for the same doctor
        const conflict = await new Promise((resolve, reject) => {
            db.get(
                `SELECT COUNT(*) as count FROM Appointments
                 WHERE doctor_id = ? AND status = 'SCHEDULED'
                   AND datetime(appointment_datetime)
                       BETWEEN datetime(?, '-59 minutes') AND datetime(?, '+59 minutes')`,
                [doctorId, formattedDatetime, formattedDatetime],
                (err, row) => {
                    if (err) return reject(err);
                    resolve(row);
                }
            );
        });
        if (conflict && conflict.count > 0) {
            return res.status(409).json({ error: 'This time slot is already booked. Please choose another time.' });
        }

        // Get user's escalation status to get risk tier
        const escalationStatus = await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM User_Escalation_Status WHERE user_id = ?`, [userId], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });

        // Derive risk tier from the latest clinical evaluation (canonical tiers:
        // LOW/MODERATE/HIGH/CRITICAL) falling back to a conservative MODERATE.
        const latestRisk = await new Promise((resolve, reject) => {
            db.get(
                `SELECT risk_level FROM Risk_Evaluations WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
                [userId],
                (err, row) => {
                    if (err) return reject(err);
                    resolve(row);
                }
            );
        });
        const riskTier = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'].includes(latestRisk?.risk_level)
            ? latestRisk.risk_level
            : (escalationStatus?.current_risk_tier && ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'].includes(escalationStatus.current_risk_tier)
                ? escalationStatus.current_risk_tier
                : 'MODERATE');

        // Create appointment
        const result = await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO Appointments (patient_id, doctor_id, appointment_datetime, risk_tier, notes) VALUES (?, ?, ?, ?, ?)`,
                [userId, doctorId, formattedDatetime, riskTier, notes],
                function(err) {
                    if (err) return reject(err);
                    resolve(this);
                }
            );
        });

        // Unlock the user's chat after booking
        await new Promise((resolve, reject) => {
            db.run(
                `UPDATE User_Escalation_Status SET is_chat_locked = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
                [userId],
                function(err) {
                    if (err) return reject(err);
                    resolve();
                }
            );
        });

        // Get the created appointment
        const appointment = await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM Appointments WHERE id = ?`, [result.lastID], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });

        res.status(201).json({ message: 'Appointment booked successfully', appointment });
    } catch (err) {
        console.error('Failed to book appointment:', err);
        res.status(500).json({ error: 'Failed to book appointment' });
    }
};

router.post('/book', verifyToken, handleBooking);
router.post('/', verifyToken, handleBooking);

// GET: Get user's appointments
router.get('/my-appointments', verifyToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const appointments = await new Promise((resolve, reject) => {
            db.all(
                `SELECT a.*, d.full_name as doctor_name 
                 FROM Appointments a 
                 JOIN Doctors d ON a.doctor_id = d.id 
                 WHERE a.patient_id = ? 
                 ORDER BY a.appointment_datetime DESC`,
                [userId],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
        res.json(appointments);
    } catch (err) {
        console.error('Failed to get appointments:', err);
        res.status(500).json({ error: 'Failed to get appointments' });
    }
});

// GET: Get doctor's appointments (for doctor dashboard)
router.get('/doctor-appointments', verifyToken, requireDoctor, async (req, res) => {
    const doctorId = req.user.id;
    try {
        const appointments = await new Promise((resolve, reject) => {
            db.all(
                `SELECT a.*, u.username as patient_name, u.email as patient_email 
                 FROM Appointments a 
                 JOIN Users u ON a.patient_id = u.id 
                 WHERE a.doctor_id = ? 
                 ORDER BY a.appointment_datetime ASC`,
                [doctorId],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
        res.json(appointments);
    } catch (err) {
        console.error('Failed to get doctor appointments:', err);
        res.status(500).json({ error: 'Failed to get doctor appointments' });
    }
});

// PUT: Update appointment status (for doctors)
router.put('/:appointmentId/status', verifyToken, requireDoctor, async (req, res) => {
    const { appointmentId } = req.params;
    const { status } = req.body;

    if (!['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        await new Promise((resolve, reject) => {
            db.run(
                `UPDATE Appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND doctor_id = ?`,
                [status, appointmentId, req.user.id],
                function(err) {
                    if (err) return reject(err);
                    if (this.changes === 0) return reject(new Error('Appointment not found or access denied'));
                    resolve();
                }
            );
        });
        res.json({ message: 'Appointment status updated successfully' });
    } catch (err) {
        console.error('Failed to update appointment status:', err);
        res.status(500).json({ error: 'Failed to update appointment status' });
    }
});

module.exports = router;