// controllers/classController.js
const classService = require('../services/classService');
const asyncHandler = require('../middleware/asyncHandler');
const { ValidationError, NotFoundError, ConflictError } = require('../middleware/errorHandler');

const classController = {
    // ===== CLASS TYPE CONTROLLERS =====
    
    // GET /api/classes/types
    getClassTypes: asyncHandler(async (req, res) => {
        const { isActive } = req.query;
        
        const classTypes = await classService.getAllClassTypes(isActive);

        res.json({
            success: true,
            data: classTypes
        });
    }),

    // GET /api/classes/types/:id
    getClassTypeById: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const classType = await classService.getClassTypeById(id);

        res.json({
            success: true,
            data: classType
        });
    }),

    // POST /api/classes/types (Admin only)
    createClassType: asyncHandler(async (req, res) => {
        const {
            name,
            description,
            duration,
            maxParticipants,
            equipment,
            difficulty,
            color
        } = req.body;

        // Check if name already exists
        const nameExists = await classService.checkClassTypeNameExists(name);
        if (nameExists) {
            throw new ConflictError('Tên loại lớp đã tồn tại');
        }

        const classType = await classService.createClassType({
            name,
            description,
            duration,
            maxParticipants,
            equipment,
            difficulty,
            color
        });

        res.status(201).json({
            success: true,
            message: 'Tạo loại lớp thành công',
            data: classType
        });
    }),

    // PUT /api/classes/types/:id (Admin only)
    updateClassType: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updateData = req.body;

        // Check if name exists (exclude current)
        if (updateData.name) {
            const nameExists = await classService.checkClassTypeNameExists(updateData.name, id);
            if (nameExists) {
                throw new ConflictError('Tên loại lớp đã được sử dụng');
            }
        }

        const classType = await classService.updateClassType(id, updateData);

        res.json({
            success: true,
            message: 'Cập nhật loại lớp thành công',
            data: classType
        });
    }),

    // DELETE /api/classes/types/:id (Admin only)
    deleteClassType: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const result = await classService.deleteClassType(id);

        res.json({
            success: true,
            message: result.message
        });
    }),

    // ===== CLASS CONTROLLERS =====

    // GET /api/classes
    getAllClasses: asyncHandler(async (req, res) => {
        const {
            page = 1,
            limit = 10,
            classTypeId,
            trainerId,
            isActive,
            search
        } = req.query;

        const result = await classService.getAllClasses({
            page,
            limit,
            classTypeId,
            trainerId,
            isActive,
            search
        });

        res.json({
            success: true,
            data: result
        });
    }),

    // GET /api/classes/:id
    getClassById: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const classInfo = await classService.getClassById(id);

        res.json({
            success: true,
            data: classInfo
        });
    }),

    // POST /api/classes (Admin & Trainer)
    createClass: asyncHandler(async (req, res) => {
        const {
            classTypeId,
            name,
            description,
            trainerId,
            duration,
            maxParticipants,
            price,
            room,
            recurring,
            recurringPattern
        } = req.body;

        // If user is trainer, they can only create classes for themselves
        if (req.user.role === 'trainer' && trainerId && trainerId !== req.user.userId) {
            throw new ValidationError('Trainer chỉ có thể tạo lớp cho chính mình');
        }

        // If trainer creates class without specifying trainerId, use their own ID
        const finalTrainerId = req.user.role === 'trainer' ? req.user.userId : trainerId;

        const classInfo = await classService.createClass({
            classTypeId,
            name,
            description,
            trainerId: finalTrainerId,
            duration,
            maxParticipants,
            price,
            room,
            recurring,
            recurringPattern
        });

        res.status(201).json({
            success: true,
            message: 'Tạo lớp học thành công',
            data: classInfo
        });
    }),

    // PUT /api/classes/:id (Admin & Class Trainer)
    updateClass: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updateData = req.body;

        // Check if user can update this class
        if (req.user.role === 'trainer') {
            const classInfo = await classService.getClassById(id);
            if (classInfo.trainerId !== req.user.userId) {
                throw new ValidationError('Chỉ có thể sửa lớp của chính mình');
            }
        }

        const classInfo = await classService.updateClass(id, updateData);

        res.json({
            success: true,
            message: 'Cập nhật lớp học thành công',
            data: classInfo
        });
    }),

    // DELETE /api/classes/:id (Admin only)
    deleteClass: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const result = await classService.deleteClass(id);

        res.json({
            success: true,
            message: result.message
        });
    }),

    // ===== CLASS SCHEDULE CONTROLLERS =====

    // GET /api/classes/schedules
    getClassSchedules: asyncHandler(async (req, res) => {
        const {
            page = 1,
            limit = 10,
            date,
            startDate,
            endDate,
            classId,
            trainerId,
            status
        } = req.query;

        const result = await classService.getClassSchedules({
            page,
            limit,
            date,
            startDate,
            endDate,
            classId,
            trainerId,
            status
        });

        res.json({
            success: true,
            data: result
        });
    }),

    // GET /api/classes/schedules/:id
    getScheduleById: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const schedule = await classService.getScheduleById(id);

        res.json({
            success: true,
            data: schedule
        });
    }),

    // POST /api/classes/:id/schedules (Admin & Trainer)
    createClassSchedule: asyncHandler(async (req, res) => {
        const { id: classId } = req.params;
        const {
            date,
            startTime,
            endTime,
            trainerId,
            maxParticipants,
            room,
            notes
        } = req.body;

        // Check permissions
        if (req.user.role === 'trainer') {
            const classInfo = await classService.getClassById(classId);
            if (classInfo.trainerId !== req.user.userId && trainerId !== req.user.userId) {
                throw new ValidationError('Trainer chỉ có thể tạo lịch cho lớp của mình');
            }
        }

        const schedule = await classService.createClassSchedule({
            classId,
            date,
            startTime,
            endTime,
            trainerId: trainerId || req.user.userId,
            maxParticipants,
            room,
            notes
        });

        res.status(201).json({
            success: true,
            message: 'Tạo lịch lớp thành công',
            data: schedule
        });
    }),

    // PUT /api/classes/schedules/:id (Admin & Trainer)
    updateClassSchedule: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updateData = req.body;

        // Check permissions
        if (req.user.role === 'trainer') {
            const schedule = await classService.getScheduleById(id);
            if (schedule.trainerId !== req.user.userId) {
                throw new ValidationError('Chỉ có thể sửa lịch của mình');
            }
        }

        const schedule = await classService.updateClassSchedule(id, updateData);

        res.json({
            success: true,
            message: 'Cập nhật lịch lớp thành công',
            data: schedule
        });
    }),

    // DELETE /api/classes/schedules/:id (Admin & Trainer)
    cancelClassSchedule: asyncHandler(async (req, res) => {
        const { id } = req.params;

        // Check permissions
        if (req.user.role === 'trainer') {
            const schedule = await classService.getScheduleById(id);
            if (schedule.trainerId !== req.user.userId) {
                throw new ValidationError('Chỉ có thể hủy lịch của mình');
            }
        }

        const result = await classService.cancelClassSchedule(id);

        res.json({
            success: true,
            message: result.message
        });
    }),

    // ===== ENROLLMENT CONTROLLERS =====

    // POST /api/classes/schedules/:id/enroll
    enrollInClass: asyncHandler(async (req, res) => {
        const { id: scheduleId } = req.params;
        
        console.log('🔍 Enroll Controller Debug:');
        console.log('📋 req.user:', req.user);
        console.log('🆔 scheduleId:', scheduleId);
        
        const userId = req.user.userId || req.user.id;
        console.log('👤 Using userId:', userId);
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Không tìm thấy thông tin người dùng trong token'
            });
        }

        const enrollment = await classService.enrollInClass(scheduleId, userId);

        res.status(201).json({
            success: true,
            message: 'Đăng ký lớp thành công',
            data: enrollment
        });
    }),

    // DELETE /api/classes/schedules/:id/enroll
    cancelEnrollment: asyncHandler(async (req, res) => {
        const { id: scheduleId } = req.params;
        const userId = req.user.userId;

        const result = await classService.cancelEnrollment(scheduleId, userId);

        res.json({
            success: true,
            message: result.message
        });
    }),

    // POST /api/classes/schedules/:id/checkin
    checkInToClass: asyncHandler(async (req, res) => {
        const { id: scheduleId } = req.params;
        const userId = req.user.userId;

        const result = await classService.checkInToClass(scheduleId, userId);

        res.json({
            success: true,
            message: 'Check-in thành công',
            data: result
        });
    }),

    // POST /api/classes/schedules/:id/checkout
    checkOutFromClass: asyncHandler(async (req, res) => {
        const { id: scheduleId } = req.params;
        const userId = req.user.userId;

        const result = await classService.checkOutFromClass(scheduleId, userId);

        res.json({
            success: true,
            message: 'Check-out thành công',
            data: result
        });
    }),

    // GET /api/classes/schedules/:id/enrollments (Admin & Trainer)
    getClassEnrollments: asyncHandler(async (req, res) => {
        const { id: scheduleId } = req.params;

        const enrollments = await classService.getClassEnrollments(scheduleId);

        res.json({
            success: true,
            data: enrollments
        });
    }),

    // ===== ANALYTICS CONTROLLERS =====

    // GET /api/classes/analytics/popular (Admin)
    getPopularClasses: asyncHandler(async (req, res) => {
        const { limit = 10 } = req.query;

        const popularClasses = await classService.getPopularClasses(limit);

        res.json({
            success: true,
            data: popularClasses
        });
    }),

    // GET /api/classes/analytics/revenue (Admin)
    getClassRevenue: asyncHandler(async (req, res) => {
        const { startDate, endDate } = req.query;

        const revenue = await classService.getClassRevenue(startDate, endDate);

        res.json({
            success: true,
            data: revenue
        });
    }),

    // GET /api/classes/analytics/attendance (Admin)
    getAttendanceStats: asyncHandler(async (req, res) => {
        const { startDate, endDate } = req.query;

        const stats = await classService.getAttendanceStats(startDate, endDate);

        res.json({
            success: true,
            data: stats
        });
    }),

    // ===== USER-SPECIFIC CONTROLLERS =====

    // GET /api/classes/my/schedules (Member)
    getMyUpcomingClasses: asyncHandler(async (req, res) => {
        const userId = req.user.userId;
        const { limit = 10 } = req.query;

        const classes = await classService.getUserUpcomingClasses(userId, limit);

        res.json({
            success: true,
            data: classes
        });
    }),

    // GET /api/classes/my/history (Member)
    getMyClassHistory: asyncHandler(async (req, res) => {
        const userId = req.user.userId;
        const { page = 1, limit = 10 } = req.query;

        const history = await classService.getUserClassHistory(userId, { page, limit });

        res.json({
            success: true,
            data: history
        });
    }),

    // GET /api/classes/trainer/schedules (Trainer)
    getTrainerSchedules: asyncHandler(async (req, res) => {
        const trainerId = req.user.userId;
        const { 
            page = 1, 
            limit = 10, 
            startDate, 
            endDate, 
            status 
        } = req.query;

        const schedules = await classService.getTrainerSchedules(trainerId, {
            page,
            limit,
            startDate,
            endDate,
            status
        });

        res.json({
            success: true,
            data: schedules
        });
    })
};

module.exports = classController;