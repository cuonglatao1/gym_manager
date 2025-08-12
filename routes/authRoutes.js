const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

// Protected routes
router.get('/me', authenticate, authController.getProfile);
router.put('/update-profile', authenticate, authController.updateProfile);

// Admin only routes
router.delete('/users/:id', 
    authenticate, 
    require('../middleware/validation').validateId,
    require('../middleware/auth').authorize('admin'),
    authController.deleteUser
);

module.exports = router;