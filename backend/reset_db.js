const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database', 'serenemind.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) return console.error(err);
    
    db.serialize(() => {
        db.run('DROP TABLE IF EXISTS Assessments', (err) => {
            if (err) console.error(err);
            else console.log("Dropped Assessments table.");
        });
        
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
        )`, (err) => {
            if (err) console.error(err);
            else console.log("Created Assessments table.");
        });
    });
});
