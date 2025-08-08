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

// GET /api/classes/:id - Get class details
router.get('/:id', validateId, classController.getClassById);

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

// POST /api/classes - Create new class (Admin & Trainer)
router.post('/', 
    authenticate, 
    authorize('admin', 'trainer'),
    validate(classSchemas.create),
    classController.createClass
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

// ===== CLASS SCHEDULE ROUTES =====
// GET /api/classes/schedules - Get class schedules (filter by date, class, trainer)
router.get('/schedules', classController.getClassSchedules);

// GET /api/classes/schedules/:id - Get schedule details
router.get('/schedules/:id', validateId, classController.getScheduleById);

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

// POST /api/classes/schedules/:id/checkin - Check in to class
router.post('/schedules/:id/checkin', 
    authenticate,
    validateId,
    classController.checkInToClass
);

// POST /api/classes/schedules/:id/checkout - Check out from class
router.post('/schedules/:id/checkout', 
    authenticate,
    validateId,
    classController.checkOutFromClass
);

// GET /api/classes/schedules/:id/enrollments - Get class enrollments (Admin & Trainer)
router.get('/schedules/:id/enrollments', 
    authenticate, 
    authorize('admin', 'trainer'),
    validateId,
    classController.getClassEnrollments
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

// ===== USER-SPECIFIC ROUTES =====
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

module.exports = router;