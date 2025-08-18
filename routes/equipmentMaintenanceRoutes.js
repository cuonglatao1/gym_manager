const express = require('express');
const router = express.Router();
const equipmentMaintenanceController = require('../controllers/equipmentMaintenanceController');
const { authenticate, authorize } = require('../middleware/auth');

// Protected routes - require authentication
router.use(authenticate);

// Admin only routes - Equipment maintenance management is admin-only functionality
router.use(authorize('admin'));

// Equipment maintenance CRUD routes
router.post('/', equipmentMaintenanceController.create);
router.get('/', equipmentMaintenanceController.getAll);
router.get('/stats', equipmentMaintenanceController.getStats);
router.get('/overdue', equipmentMaintenanceController.getOverdue);
router.get('/upcoming', equipmentMaintenanceController.getUpcoming);
router.post('/recurring', equipmentMaintenanceController.createRecurring);
router.get('/:id', equipmentMaintenanceController.getById);
router.put('/:id', equipmentMaintenanceController.update);
router.delete('/:id', equipmentMaintenanceController.delete);
router.post('/:id/complete', equipmentMaintenanceController.complete);
router.post('/:id/start', equipmentMaintenanceController.start);
router.post('/:id/cancel', equipmentMaintenanceController.cancel);
router.post('/:id/generate-next', equipmentMaintenanceController.generateNext);

module.exports = router;