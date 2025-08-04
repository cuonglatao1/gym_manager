const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const memberRoutes = require('./memberRoutes');

// Setup routes
router.use('/auth', authRoutes);
router.use('/members', memberRoutes);

// Health check
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Gym Manager API is running',
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: '/api/auth',
            members: '/api/members',
            memberships: '/api/members/memberships'
        }
    });
});

module.exports = router;