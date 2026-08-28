const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize the database structure explicitly
require('./database/sqlite');

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const dashboardRoutes = require('./routes/dashboard');
const doctorRoutes = require('./routes/doctor');
const reportsRoutes = require('./routes/reports');
const appointmentsRoutes = require('./routes/appointments');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
}));
app.use(express.json());

// URL Normalization Middleware for Vercel Serverless rewrites
app.use((req, res, next) => {
    // If Vercel rewrites to /api/index.js or /index.js, extract original path
    if (req.url.startsWith('/api/index.js') || req.url.startsWith('/index.js') || req.url.startsWith('/api?')) {
        const queryPath = req.query ? req.query['0'] || req.query['path'] : null;
        if (queryPath) {
            req.url = '/' + (Array.isArray(queryPath) ? queryPath.join('/') : queryPath);
        } else if (req.headers['x-matched-path']) {
            req.url = req.headers['x-matched-path'];
        }
    }
    
    // Log incoming request
    console.log(`[API] ${req.method} ${req.url} (original: ${req.originalUrl || req.url})`);
    next();
});

// Basic health check
app.get(['/', '/api', '/health-check'], (req, res) => {
    res.json({ 
        message: 'SereneMind API is running', 
        version: '1.0.0', 
        timestamp: new Date().toISOString() 
    });
});

// Unified API Router (handles all sub-routes)
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/chat', chatRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/doctor', doctorRoutes);
apiRouter.use('/reports', reportsRoutes);
apiRouter.use('/appointments', appointmentsRoutes);
apiRouter.use('/health', healthRoutes);

// Mount at both /api and root / to support all rewrite modes
app.use('/api', apiRouter);
app.use('/', apiRouter);

// 404 handler for undefined routes
app.use((req, res) => {
    console.warn(`[404] Route not found: ${req.method} ${req.url} (original: ${req.originalUrl})`);
    res.status(404).json({ 
        error: 'Route not found',
        method: req.method,
        path: req.url,
        originalUrl: req.originalUrl
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

if (process.env.VERCEL !== '1' && require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;
