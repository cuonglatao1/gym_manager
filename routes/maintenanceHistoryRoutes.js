const express = require('express');
const router = express.Router();
const maintenanceHistoryController = require('../controllers/maintenanceHistoryController');
const { authenticate, authorize } = require('../middleware/auth');

// Protected routes - require authentication
router.use(authenticate);

// Admin only routes - Maintenance history management is admin-only functionality
router.use(authorize('admin'));

// Maintenance history routes
router.post('/', maintenanceHistoryController.create);
router.get('/', maintenanceHistoryController.getAll);
router.get('/stats', maintenanceHistoryController.getStats);
router.get('/cost-analysis', maintenanceHistoryController.getCostAnalysis);
router.get('/reliability', maintenanceHistoryController.getReliability);
router.get('/equipment/:equipmentId', maintenanceHistoryController.getByEquipment);
router.get('/performer/:userId', maintenanceHistoryController.getByPerformer);
router.get('/:id', maintenanceHistoryController.getById);
router.put('/:id', maintenanceHistoryController.update);
router.delete('/:id', maintenanceHistoryController.delete);

// Analytics and reporting
router.get('/analytics/efficiency', maintenanceHistoryController.getEfficiencyAnalysis);
router.get('/analytics/cost-trends', maintenanceHistoryController.getCostTrends);
router.get('/analytics/equipment-performance', maintenanceHistoryController.getEquipmentPerformance);

// Export functionality
router.get('/export/csv', maintenanceHistoryController.exportCSV);
router.get('/export/pdf', maintenanceHistoryController.exportPDF);

module.exports = router;