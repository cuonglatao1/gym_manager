const express = require('express');
const router = express.Router();
const maintenanceScheduleController = require('../controllers/maintenanceScheduleController');
const { authenticate, authorize } = require('../middleware/auth');

// Protected routes - require authentication
router.use(authenticate);

// Admin only routes - Maintenance schedule management is admin-only functionality
router.use(authorize('admin'));

// Maintenance schedule routes
router.post('/', maintenanceScheduleController.create);
router.get('/', maintenanceScheduleController.getAll);
router.get('/overdue', maintenanceScheduleController.getOverdue);
router.get('/upcoming', maintenanceScheduleController.getUpcoming);
router.get('/equipment/:equipmentId', maintenanceScheduleController.getByEquipment);
router.get('/:id', maintenanceScheduleController.getById);
router.put('/:id', maintenanceScheduleController.update);
router.delete('/:id', maintenanceScheduleController.delete);

// Schedule management actions
router.post('/:id/generate-task', maintenanceScheduleController.generateTask);
router.post('/:id/complete', maintenanceScheduleController.completeAndReschedule);
router.post('/:id/activate', maintenanceScheduleController.activate);
router.post('/:id/deactivate', maintenanceScheduleController.deactivate);

// Bulk operations
router.post('/equipment/:equipmentId/regenerate', maintenanceScheduleController.regenerateForEquipment);
router.post('/bulk/generate-tasks', maintenanceScheduleController.bulkGenerateTasks);

module.exports = router;