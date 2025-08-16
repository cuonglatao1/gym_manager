// routes/classRoutes.js
const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { authenticate, authorize } = require('../middleware/auth');
const { 
    validate, 
    validateId, 
    classTypeSchemas, 
    classSchemas, 
    classScheduleSchemas 
} = require('../middleware/validation');

// ===== CLASS TYPE ROUTES (Public) =====
// GET /api/classes/types - Get all class types
router.get('/types', classController.getClassTypes);

// GET /api/classes/types/:id - Get class type details
router.get('/types/:id', validateId, classController.getClassTypeById);

// ===== CLASS ROUTES =====
// GET /api/classes - Get all classes (filter by type, trainer, status)
router.get('/', classController.getAllClasses);

// ===== CLASS SCHEDULE ROUTES (must come before /:id) =====
// GET /api/classes/schedules - Get class schedules (filter by date, class, trainer)
router.get('/schedules', classController.getClassSchedules);

// GET /api/classes/schedules/:id - Get schedule details
router.get('/schedules/:id', validateId, classController.getScheduleById);

// GET /api/classes/enrollments - Get all enrollments (Admin & Trainer) - MUST BE BEFORE /:id
router.get('/enrollments', 
    authenticate, 
    authorize('admin', 'trainer'),
    classController.getAllEnrollments
);

// ===== CHECK-IN MANAGEMENT ROUTES (must come before /:id) =====
// GET /api/classes/checkins - Get check-ins (Admin & Trainer)
router.get('/checkins', 
    authenticate, 
    authorize('admin', 'trainer'),
    classController.getAllCheckIns
);

// ===== MEMBER CLASS HISTORY ROUTES (must come before /:id) =====
// GET /api/classes/members/:id/history - Get member's class history (Admin & Trainer & Self)
router.get('/members/:id/history', 
    authenticate,
    validateId,
    classController.getMemberClassHistory
);

// GET /api/classes/members/:id/stats - Get member's class statistics (Admin & Trainer & Self)
router.get('/members/:id/stats', 
    authenticate,
    validateId,
    classController.getMemberClassStats
);

// ===== PROTECTED ROUTES - Admin & Trainer =====
// POST /api/classes/types - Create class type (Admin only)
router.post('/types', 
    authenticate, 
    authorize('admin'),
    validate(classTypeSchemas.create),
    classController.createClassType
);

// PUT /api/classes/types/:id - Update class type (Admin only)
router.put('/types/:id', 
    authenticate, 
    authorize('admin'),
    validateId,
    validate(classTypeSchemas.update),
    classController.updateClassType
);

// DELETE /api/classes/types/:id - Delete class type (Admin only)
router.delete('/types/:id', 
    authenticate, 
    authorize('admin'),
    validateId,
    classController.deleteClassType
);

// POST /api/classes - Create new class (Admin only)
router.post('/', 
    authenticate, 
    authorize('admin'),
    validate(classSchemas.create),
    classController.createClass
);

// ===== USER-SPECIFIC ROUTES (must come before generic /:id routes) =====
// GET /api/classes/my/schedules - Get my upcoming classes (Member)
router.get('/my/schedules', 
    authenticate,
    classController.getMyUpcomingClasses
);

// GET /api/classes/my/history - Get my class history (Member)
router.get('/my/history', 
    authenticate,
    classController.getMyClassHistory
);

// GET /api/classes/trainer/schedules - Get trainer's schedules
router.get('/trainer/schedules', 
    authenticate, 
    authorize('trainer', 'admin'),
    classController.getTrainerSchedules
);

// ===== SCHEDULE MANAGEMENT ROUTES (Admin & Trainer) =====
// IMPORTANT: These must come before /:id routes to avoid conflicts

// GET /api/classes/:id/schedules - Get schedules for a specific class
router.get('/:id/schedules', 
    authenticate, 
    authorize('admin', 'trainer'),
    validateId,
    classController.getClassSchedulesByClassId
);

// PUT /api/classes/:id - Update class (Admin & Class Trainer)
router.put('/:id', 
    authenticate, 
    authorize('admin', 'trainer'),
    validateId,
    validate(classSchemas.update),
    classController.updateClass
);

// DELETE /api/classes/:id - Delete class (Admin only)
router.delete('/:id', 
    authenticate, 
    authorize('admin'),
    validateId,
    classController.deleteClass
);

// GET /api/classes/:id/pricing - Get class pricing for current user (Members only)
router.get('/:id/pricing', 
    authenticate, 
    authorize('member'),
    validateId,
    classController.getClassPricing
);

// POST /api/classes/:id/payment - Create payment for class (Members only)
router.post('/:id/payment', 
    authenticate, 
    authorize('member'),
    validateId,
    classController.createClassPayment
);

// GET /api/classes/:id - Get class details (must come after specific /:id/xxx routes)
router.get('/:id', validateId, classController.getClassById);

// POST /api/classes/:id/schedules - Create class schedule (Admin & Trainer)
router.post('/:id/schedules', 
    authenticate, 
    authorize('admin', 'trainer'),
    validateId,
    validate(classScheduleSchemas.create),
    classController.createClassSchedule
);

// PUT /api/classes/schedules/:id - Update schedule (Admin & Trainer)
router.put('/schedules/:id', 
    authenticate, 
    authorize('admin', 'trainer'),
    validateId,
    validate(classScheduleSchemas.update),
    classController.updateClassSchedule
);

// DELETE /api/classes/schedules/:id - Cancel schedule (Admin & Trainer)
router.delete('/schedules/:id', 
    authenticate, 
    authorize('admin', 'trainer'),
    validateId,
    classController.cancelClassSchedule
);

// ===== CLASS ENROLLMENT ROUTES =====
// POST /api/classes/schedules/:id/enroll - Enroll in class (Member, Trainer, Admin)
router.post('/schedules/:id/enroll', 
    authenticate,
    validateId,
    classController.enrollInClass
);

// DELETE /api/classes/schedules/:id/enroll - Cancel enrollment
router.delete('/schedules/:id/enroll', 
    authenticate,
    validateId,
    classController.cancelEnrollment
);

// DELETE /api/classes/enrollments/:id - Cancel enrollment by enrollment ID
router.delete('/enrollments/:id', 
    authenticate,
    validateId,
    classController.cancelEnrollmentById
);

// POST /api/classes/schedules/:id/checkin - Check in to class (Member, Trainer, Admin)
router.post('/schedules/:id/checkin', 
    authenticate,
    validateId,
    classController.checkInToClass
);

// POST /api/classes/schedules/:id/checkout - Check out from class (Member, Trainer, Admin)
router.post('/schedules/:id/checkout', 
    authenticate,
    validateId,
    classController.checkOutFromClass
);

// ===== MEMBER CHECK-IN ROUTES =====
// GET /api/classes/my/checkins - Get my check-ins (Member)
router.get('/my/checkins', 
    authenticate,
    classController.getMyCheckIns
);

// GET /api/classes/my/today-schedules - Get my schedules for today (Member)
router.get('/my/today-schedules', 
    authenticate,
    classController.getMyTodaySchedules
);

// POST /api/classes/my/quick-checkin - Quick check-in by scanning QR or entering code (Member)
router.post('/my/quick-checkin', 
    authenticate,
    classController.quickCheckIn
);

// GET /api/classes/schedules/:id/enrollments - Get class enrollments (Admin & Trainer)
router.get('/schedules/:id/enrollments', 
    authenticate, 
    authorize('admin', 'trainer'),
    validateId,
    classController.getClassEnrollments
);

// GET /api/classes/checkins/:date - Get check-ins by date (Admin & Trainer)
router.get('/checkins/:date', 
    authenticate, 
    authorize('admin', 'trainer'),
    classController.getCheckInsByDate
);

// GET /api/classes/schedules/:id/checkins - Get check-ins for specific schedule (Admin & Trainer)
router.get('/schedules/:id/checkins', 
    authenticate, 
    authorize('admin', 'trainer'),
    validateId,
    classController.getScheduleCheckIns
);

// ===== ANALYTICS & REPORTS =====
// GET /api/classes/analytics/popular - Get popular classes
router.get('/analytics/popular', 
    authenticate, 
    authorize('admin'),
    classController.getPopularClasses
);

// GET /api/classes/analytics/revenue - Get class revenue
router.get('/analytics/revenue', 
    authenticate, 
    authorize('admin'),
    classController.getClassRevenue
);

// GET /api/classes/analytics/attendance - Get attendance statistics
router.get('/analytics/attendance', 
    authenticate, 
    authorize('admin'),
    classController.getAttendanceStats
);

module.exports = router;