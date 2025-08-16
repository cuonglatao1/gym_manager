const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateInvoice, validateInvoiceStatus } = require('../middleware/validation');

// Public routes (none for invoices)

// Protected routes - require authentication
router.use(authenticate);

// Member routes - can view their own invoices
router.get('/member/:memberId', invoiceController.getMemberInvoices);

// Admin/Staff routes
router.post('/', authorize('admin', 'staff'), validateInvoice, invoiceController.createInvoice);
router.get('/', authorize('admin', 'staff'), invoiceController.getAllInvoices);
router.get('/stats', authorize('admin', 'staff'), invoiceController.getInvoiceStats);
router.get('/overdue', authorize('admin', 'staff'), invoiceController.getOverdueInvoices);
router.post('/membership', authorize('admin', 'staff'), invoiceController.generateMembershipInvoice);
router.post('/class', authorize('admin', 'staff'), invoiceController.generateClassInvoice);
router.get('/:id', invoiceController.getInvoiceById);
router.put('/:id/status', authorize('admin', 'staff'), validateInvoiceStatus, invoiceController.updateInvoiceStatus);
router.post('/:id/send', authorize('admin', 'staff'), invoiceController.sendInvoice);
router.delete('/:id', authorize('admin', 'staff'), invoiceController.cancelInvoice);

module.exports = router;