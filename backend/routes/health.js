const express = require('express');
const router = express.Router();
const db = require('../database/sqlite');

// GET /api/health: System operational health check endpoint
router.get('/', (req, res) => {
    const startTime = Date.now();

    db.get(`SELECT 1 as is_alive`, [], (err, row) => {
        const responseTimeMs = Date.now() - startTime;

        if (err || !row) {
            return res.status(503).json({
                status: 'UNHEALTHY',
                database: 'DISCONNECTED',
                error: err ? err.message : 'Database ping failed',
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            status: 'HEALTHY',
            database: 'CONNECTED',
            uptimeSeconds: Math.floor(process.uptime()),
            memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            latencyMs: responseTimeMs,
            timestamp: new Date().toISOString()
        });
    });
});

module.exports = router;
