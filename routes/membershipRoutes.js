const express = require('express');
const router = express.Router();
const membershipController = require('../controllers/membershipController');
const { authenticate, authorize } = require('../middleware/auth');

// ===== PUBLIC ROUTES =====
// GET /api/memberships - Get all memberships
router.get('/', membershipController.getAllMemberships);

// GET /api/memberships/:id - Get membership by ID
router.get('/:id', membershipController.getMembershipById);

// ===== ADMIN ROUTES =====
// POST /api/memberships - Create membership (Admin only)
router.post('/', 
    authenticate, 
    authorize('admin'),
    membershipController.createMembership
);

// PUT /api/memberships/:id - Update membership (Admin only)
router.put('/:id', 
    authenticate, 
    authorize('admin'),
    membershipController.updateMembership
);

// DELETE /api/memberships/:id - Delete membership (Admin only)
router.delete('/:id', 
    authenticate, 
    authorize('admin'),
    membershipController.deleteMembership
);

// ===== MEMBER ROUTES =====
// POST /api/memberships/:id/purchase - Purchase membership (Members only)
router.post('/:id/purchase', 
    authenticate, 
    authorize('member'),
    membershipController.purchaseMembership
);

module.exports = router;