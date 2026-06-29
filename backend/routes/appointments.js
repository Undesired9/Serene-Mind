const express = require('express');
const router = express.Router();
const db = require('../database/sqlite');
const { verifyToken, requireDoctor } = require('../middleware/auth');

// Helper to get all doctors
const getAllDoctors = () => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT id, full_name, email, specialization FROM Doctors`, [], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
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

// GET: Get available slots for a doctor
router.get('/doctors/:doctorId/availability', verifyToken, async (req, res) => {
    const { doctorId } = req.params;
    try {
        // Get booked slots first
        const bookedSlots = await new Promise((resolve, reject) => {
            db.all(
                `SELECT appointment_datetime FROM Appointments WHERE doctor_id = ? AND status = 'SCHEDULED'`,
                [doctorId],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows.map(r => new Date(r.appointment_datetime).getTime()));
                }
            );
        });

        // Generate sample slots and filter out booked ones
        const sampleSlots = generateSampleAvailability(doctorId);
        const availableSlots = sampleSlots.filter(slot => {
            const slotTime = new Date(slot.start_datetime).getTime();
            return !bookedSlots.includes(slotTime);
        });

        res.json(availableSlots);
    } catch (err) {
        console.error('Failed to get availability:', err);
        res.status(500).json({ error: 'Failed to get availability' });
    }
});

// POST: Book an appointment
router.post('/book', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { doctorId, appointmentDatetime, notes } = req.body;

    if (!doctorId || !appointmentDatetime) {
        return res.status(400).json({ error: 'Doctor ID and appointment datetime are required' });
    }

    try {
        // Get user's escalation status to get risk tier
        const escalationStatus = await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM User_Escalation_Status WHERE user_id = ?`, [userId], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });

        // Create appointment
        const result = await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO Appointments (patient_id, doctor_id, appointment_datetime, risk_tier, notes) VALUES (?, ?, ?, ?, ?)`,
                [userId, doctorId, appointmentDatetime, escalationStatus?.current_risk_tier || 'ELEVATED', notes || ''],
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
});

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
                `UPDATE Appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [status, appointmentId],
                function(err) {
                    if (err) return reject(err);
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