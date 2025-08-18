const express = require('express');
const router = express.Router();
const equipmentController = require('../controllers/equipmentController');
const { authenticate, authorize } = require('../middleware/auth');

// Protected routes - require authentication
router.use(authenticate);

// Admin only routes - Equipment management is admin-only functionality
router.use(authorize('admin'));

// Equipment CRUD routes
router.post('/', equipmentController.create);
router.get('/', equipmentController.getAll);
router.get('/stats', equipmentController.getStats);
router.get('/maintenance-due', equipmentController.getMaintenanceDue);
router.get('/check-code/:code', equipmentController.checkCode);
router.get('/check-serial/:serial', equipmentController.checkSerial);
router.get('/:id', equipmentController.getById);
router.put('/:id', equipmentController.update);
router.delete('/:id', equipmentController.delete);
router.post('/:id/use', equipmentController.incrementUsage);

module.exports = router;