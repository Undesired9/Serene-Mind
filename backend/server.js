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
    credentials: true
}));
app.use(express.json());

// Basic health check
app.get(['/', '/api'], (req, res) => {
    res.json({ 
        message: 'SereneMind API is running', 
        version: '1.0.0', 
        timestamp: new Date().toISOString() 
    });
});

// Mount Routes with /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/health', healthRoutes);

// Also mount without /api prefix for flexible serverless rewrites
app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/doctor', doctorRoutes);
app.use('/reports', reportsRoutes);
app.use('/appointments', appointmentsRoutes);
app.use('/health', healthRoutes);

// 404 handler for undefined routes
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

if (process.env.VERCEL !== '1' && require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;
