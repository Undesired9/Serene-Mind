const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attach user payload to the request object
        next();
    } catch {
        res.status(403).json({ error: 'Invalid or expired token.' });
    }
};

const requireDoctor = (req, res, next) => {
    if (!req.user || req.user.role !== 'doctor') {
        return res.status(403).json({ error: 'Doctor access is required.' });
    }

    next();
};

const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access is required.' });
    }

    next();
};

module.exports = { verifyToken, requireDoctor, requireAdmin };
