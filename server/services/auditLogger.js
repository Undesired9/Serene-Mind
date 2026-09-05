const db = require('../database/sqlite');

/**
 * Event types supported by the audit logging engine:
 * LOGIN, INTAKE_COMPLETED, PHQ9_COMPLETED, GAD7_COMPLETED, SAFETY_SCREEN_COMPLETED,
 * RISK_EVALUATED, RISK_CHANGED, ESCALATION_CREATED, CLINICIAN_VIEWED_PATIENT,
 * APPOINTMENT_CREATED, APPOINTMENT_UPDATED, REPORT_GENERATED, REPORT_EXPORTED,
 * ADMIN_LOGIN, ADMIN_LOGIN_FAILED, DOCTOR_REGISTERED, DOCTOR_APPROVED, DOCTOR_REJECTED
 */

const logAuditEvent = (eventType, userId, actorId = null, actorRole = 'SYSTEM', details = {}, ipAddress = null) => {
    const detailsStr = typeof details === 'string' ? details : JSON.stringify(details);
    const actor = actorId || userId;

    const sql = `INSERT INTO Audit_Logs (event_type, user_id, actor_id, actor_role, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [eventType, userId, actor, actorRole, detailsStr, ipAddress], (err) => {
        if (err) {
            console.error(`[AUDIT_LOG_ERROR] Failed to record event ${eventType}:`, err.message);
        } else {
            console.log(`[AUDIT_LOG] [${eventType}] User: ${userId} | Actor: ${actor} (${actorRole})`);
        }
    });
};

const getAuditLogs = (userId = null, limit = 50) => {
    return new Promise((resolve, reject) => {
        let sql = `SELECT * FROM Audit_Logs`;
        const params = [];

        if (userId) {
            sql += ` WHERE user_id = ?`;
            params.push(userId);
        }

        sql += ` ORDER BY created_at DESC LIMIT ?`;
        params.push(limit);

        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
};

module.exports = {
    logAuditEvent,
    getAuditLogs
};
