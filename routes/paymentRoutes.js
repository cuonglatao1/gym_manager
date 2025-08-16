const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');
const { validatePayment, validatePaymentProcess } = require('../middleware/validation');

// Public routes (none for payments)

// Protected routes - require authentication
router.use(authenticate);

// Member routes - can view their own payment history and create payments
router.get('/history', paymentController.getPaymentHistory);
router.post('/', validatePayment, paymentController.createPayment);

// Admin/Staff routes
router.get('/', authorize('admin', 'staff'), paymentController.getAllPayments);
router.get('/revenue', authorize('admin', 'staff'), paymentController.getRevenueStats);
router.get('/overdue', authorize('admin', 'staff'), paymentController.getOverduePayments);
router.get('/:id', authorize('admin', 'staff'), paymentController.getPaymentById);
router.post('/:id/process', authorize('admin', 'staff'), validatePaymentProcess, paymentController.processPayment);
router.post('/:id/remind', authorize('admin', 'staff'), paymentController.sendPaymentReminder);
router.delete('/:id', authorize('admin', 'staff'), paymentController.cancelPayment);

module.exports = router;