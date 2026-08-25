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

app.use(cors());
app.use(express.json());

// Basic health check
app.get('/', (req, res) => {
    res.json({ message: 'SereneMind API is running' });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/health', healthRoutes);

// 404 handler for undefined routes
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
