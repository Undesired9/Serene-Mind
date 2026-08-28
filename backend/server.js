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

// Bulletproof URL Normalization for Vercel Serverless & Local
app.use((req, res, next) => {
    let rawPath = req.url || '/';

    // 1. Extract from Vercel headers if available
    const vercelPath = req.headers['x-matched-path'] || req.headers['x-now-route-matches'];
    if (vercelPath && !vercelPath.includes('index.js') && !vercelPath.includes('[...')) {
        rawPath = vercelPath;
    } 
    // 2. Extract from query parameters if Vercel rewrite passed path as query
    else if (req.query) {
        if (req.query.path) {
            const p = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
            rawPath = '/' + p;
        } else if (req.query['0']) {
            rawPath = '/' + req.query['0'];
        }
    }

    // Strip query strings
    rawPath = rawPath.split('?')[0];

    // Clean up Vercel function names from path
    rawPath = rawPath.replace('/api/index.js', '')
                     .replace('/api/[...path]', '')
                     .replace('/index.js', '')
                     .replace('/[...path]', '');

    // Strip /api prefix so all routes match /auth, /chat, etc.
    if (rawPath.startsWith('/api/')) {
        rawPath = rawPath.slice(4);
    } else if (rawPath === '/api') {
        rawPath = '/';
    }

    if (!rawPath.startsWith('/')) {
        rawPath = '/' + rawPath;
    }

    req.url = rawPath;
    next();
});

// Health check
app.get(['/', '/health-check', '/ping'], (req, res) => {
    res.json({ 
        message: 'SereneMind API is running', 
        version: '1.0.0', 
        status: 'HEALTHY',
        timestamp: new Date().toISOString() 
    });
});

// Mount all core routes
app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/doctor', doctorRoutes);
app.use('/reports', reportsRoutes);
app.use('/appointments', appointmentsRoutes);
app.use('/health', healthRoutes);

// Fallback: Also mount with /api in case middleware was bypassed
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/health', healthRoutes);

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
