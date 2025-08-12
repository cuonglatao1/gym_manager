// routes/member.routes.js - Simplified
const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const membershipController = require('../controllers/membershipController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateId, memberSchemas, membershipSchemas } = require('../middleware/validation');

// ===== MEMBER ROUTES =====

// Public
router.post('/register', 
    validate(memberSchemas.register), 
    memberController.register
);

// Protected - Admin & Trainer
router.get('/', 
    authenticate, 
    authorize('admin', 'trainer'),
    memberController.getAll
);

// Simple test endpoint first
router.get('/search-test', (req, res) => {
    console.log('=== SEARCH TEST ENDPOINT ===');
    console.log('Query params:', req.query);
    res.json({
        success: true,
        message: 'Search test endpoint working',
        query: req.query
    });
});

router.get('/search',
    authenticate,
    authorize('admin', 'trainer'),
    memberController.searchMembers
);

router.get('/statistics',
    authenticate,
    authorize('admin'),
    memberController.getStatistics
);

router.get('/:id', 
    authenticate, 
    authorize('admin', 'trainer'),
    validateId,
    memberController.getById
);

router.put('/:id', 
    authenticate, 
    authorize('admin', 'trainer'),
    validateId,
    validate(memberSchemas.update),
    memberController.update
);

// POST /api/members/my/membership - Member tự mua gói membership
router.post('/my/membership', 
    authenticate,
    validate(memberSchemas.purchaseMembership),
    memberController.purchaseMyMembership
);

router.post('/:id/membership', 
    authenticate, 
    authorize('admin', 'trainer'),
    validateId,
    validate(memberSchemas.purchaseMembership),
    memberController.purchaseMembership
);

router.delete('/:id', 
    authenticate, 
    authorize('admin'),
    validateId,
    memberController.deleteMember
);

router.delete('/:id/membership', 
    authenticate, 
    authorize('admin'),
    validateId,
    memberController.cancelMembership
);

// ===== MEMBERSHIP ROUTES =====

// Public
router.get('/memberships/all', membershipController.getAll);
router.get('/memberships/:id', validateId, membershipController.getById);

// Admin only
router.post('/memberships', 
    authenticate, 
    authorize('admin'),
    validate(membershipSchemas.create),
    membershipController.create
);

router.put('/memberships/:id', 
    authenticate, 
    authorize('admin'),
    validateId,
    validate(membershipSchemas.update),
    membershipController.update
);

router.delete('/memberships/:id', 
    authenticate, 
    authorize('admin'),
    validateId,
    membershipController.delete
);

router.get('/memberships/:id/statistics', 
    authenticate, 
    authorize('admin'),
    validateId,
    membershipController.getStatistics
);

module.exports = router;