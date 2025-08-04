
// routes/member.routes.js
const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const membershipController = require('../controllers/membershipController');
const { authenticate, authorize } = require('../middleware/auth');

// ===== MEMBER ROUTES =====
// Public routes (for registration)
router.post('/register', memberController.register);

// Protected routes - Admin and Trainer can manage members
router.get('/', authenticate, authorize('admin', 'trainer'), memberController.getAll);
router.get('/:id', authenticate, authorize('admin', 'trainer'), memberController.getById);
router.put('/:id', authenticate, authorize('admin', 'trainer'), memberController.update);
router.post('/:id/membership', authenticate, authorize('admin', 'trainer'), memberController.purchaseMembership);

// ===== MEMBERSHIP ROUTES =====
// Public routes - anyone can view memberships
router.get('/memberships/all', membershipController.getAll);
router.get('/memberships/:id', membershipController.getById);

// Protected routes - Only admin can manage memberships
router.post('/memberships', authenticate, authorize('admin'), membershipController.create);
router.put('/memberships/:id', authenticate, authorize('admin'), membershipController.update);
router.delete('/memberships/:id', authenticate, authorize('admin'), membershipController.delete);
router.get('/memberships/:id/statistics', authenticate, authorize('admin'), membershipController.getStatistics);

module.exports = router;