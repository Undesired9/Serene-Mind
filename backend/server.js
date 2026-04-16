const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize the database structure explicitly
require('./database/sqlite');

const authRoutes = require('./routes/auth');
const doctorAuthRoutes = require('./routes/doctorAuth');
const chatRoutes = require('./routes/chat');
const dashboardRoutes = require('./routes/dashboard');
const doctorRoutes = require('./routes/doctor');

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
app.use('/api/doctor-auth', doctorAuthRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/doctor', doctorRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
