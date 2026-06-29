
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database', 'serenemind.db');
const db = new sqlite3.Database(dbPath);

const tablesToClear = [
    'Appointments',
    'Patient_Reports',
    'Sessions',
    'Chat_Sessions',
    'Mood_Logs',
    'Assessments',
    'User_Escalation_Status',
    'Users'
];

console.log('Clearing all patient-related data...');

db.serialize(() => {
    tablesToClear.forEach(table => {
        db.run(`DELETE FROM ${table}`, (err) => {
            if (err) {
                console.error(`Error clearing ${table}:`, err.message);
            } else {
                console.log(`✅ Cleared ${table}`);
            }
        });
    });
});

db.close(() => {
    console.log('Database connection closed.');
});
