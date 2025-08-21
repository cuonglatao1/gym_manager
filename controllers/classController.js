// controllers/classController.js
const classService = require('../services/classService');
const PricingService = require('../services/pricingService');
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

    // POST /api/classes (Admin only)
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

        const classInfo = await classService.createClass({
            classTypeId,
            name,
            description,
            trainerId,
            duration,
            maxParticipants: maxParticipants || 20, // Default to 20 participants
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

    // GET /api/classes/:id/schedules - Get schedules for a specific class
    getClassSchedulesByClassId: asyncHandler(async (req, res) => {
        const { id: classId } = req.params;
        const { userId, role } = req.user;
        
        // Authorization: trainer can only see their own classes
        if (role === 'trainer') {
            const classInfo = await classService.getClassById(classId);
            if (classInfo.trainerId !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền xem lịch tập của lớp này'
                });
            }
        }
        
        const schedules = await classService.getClassSchedules({
            classId: classId,
            page: 1,
            limit: 100 // Get all schedules for this class
        });
        
        res.json({
            success: true,
            data: schedules.schedules || []
        });
    }),

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

        try {
            const schedule = await classService.getScheduleById(id);

            res.json({
                success: true,
                data: schedule
            });
        } catch (error) {
            console.error(`❌ Error getting schedule ${id}:`, error.message);
            console.error('Stack trace:', error.stack);
            throw error;
        }
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

        // Trainers can now create schedules for any class (like admin)
        // No additional permission check needed - already authorized by middleware

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

        try {
            console.log(`🔄 Updating schedule ${id} with data:`, JSON.stringify(updateData, null, 2));
            
            // Trainers can now update schedules for any class (like admin)
            // No additional permission check needed - already authorized by middleware

            const schedule = await classService.updateClassSchedule(id, updateData);

            res.json({
                success: true,
                message: 'Cập nhật lịch lớp thành công',
                data: schedule
            });
        } catch (error) {
            console.error(`❌ Error updating schedule ${id}:`, error.message);
            console.error('Request body:', updateData);
            console.error('Stack trace:', error.stack);
            throw error;
        }
    }),

    // DELETE /api/classes/schedules/:id (Admin & Trainer)
    cancelClassSchedule: asyncHandler(async (req, res) => {
        const { id } = req.params;

        // Trainers can now cancel schedules for any class (like admin)
        // No additional permission check needed - already authorized by middleware

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
        
        // Check if user role is allowed to enroll in classes
        if (req.user.role === 'admin' || req.user.role === 'trainer') {
            return res.status(403).json({
                success: false,
                message: `${req.user.role === 'admin' ? 'Quản trị viên' : 'Huấn luyện viên'} không thể đăng ký lớp học như hội viên`
            });
        }
        
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

    // GET /api/classes/:id/pricing - Get class pricing for current user
    getClassPricing: asyncHandler(async (req, res) => {
        const { id: classId } = req.params;
        const userId = req.user.userId || req.user.id;

        if (!userId) {
            throw new ValidationError('Không tìm thấy thông tin người dùng');
        }

        // Get member data from user
        const { Member } = require('../models');
        const member = await Member.findOne({ where: { userId } });
        
        if (!member) {
            throw new NotFoundError('Không tìm thấy thông tin hội viên');
        }

        const pricing = await PricingService.calculateClassPrice(classId, member.id);
        const validation = await PricingService.validateClassBooking(classId, member.id);

        res.json({
            success: true,
            data: {
                ...pricing,
                canBook: validation.canBook,
                bookingInfo: validation
            }
        });
    }),

    // POST /api/classes/:id/payment - Create payment for class
    createClassPayment: asyncHandler(async (req, res) => {
        const { id: classId } = req.params;
        const { paymentMethod = 'cash' } = req.body;
        const userId = req.user.userId || req.user.id;

        if (!userId) {
            throw new ValidationError('Không tìm thấy thông tin người dùng');
        }

        // Get member data from user
        const { Member } = require('../models');
        const member = await Member.findOne({ where: { userId } });
        
        if (!member) {
            throw new NotFoundError('Không tìm thấy thông tin hội viên');
        }

        // Validate booking first
        const validation = await PricingService.validateClassBooking(classId, member.id);
        if (!validation.canBook) {
            throw new ValidationError(validation.reason);
        }

        const paymentData = await PricingService.createClassPayment(classId, member.id, paymentMethod);

        res.status(201).json({
            success: true,
            message: 'Tạo thanh toán thành công',
            data: paymentData
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

    // DELETE /api/classes/enrollments/:id
    cancelEnrollmentById: asyncHandler(async (req, res) => {
        const { id: enrollmentId } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;

        const result = await classService.cancelEnrollmentById(enrollmentId, userId, userRole);

        res.json({
            success: true,
            message: result.message,
            data: result.enrollment
        });
    }),

    // POST /api/classes/schedules/:id/checkin
    checkInToClass: asyncHandler(async (req, res) => {
        const { id: scheduleId } = req.params;
        const { memberId } = req.body;
        
        // If memberId is provided and user is admin/trainer, check-in for that member
        // Otherwise, check-in for the authenticated user
        let targetUserId;
        
        if (memberId && (req.user.role === 'admin' || req.user.role === 'trainer')) {
            // Admin/Trainer checking in a member
            const member = await require('../models').Member.findByPk(memberId);
            if (!member) {
                throw new ValidationError('Không tìm thấy hội viên');
            }
            targetUserId = member.userId;
            console.log(`👨‍🏫 ${req.user.role} checking in member ${memberId} (userId: ${targetUserId}) for schedule ${scheduleId}`);
        } else {
            // Self check-in
            targetUserId = req.user.userId;
            console.log(`👤 Self check-in for user ${targetUserId} for schedule ${scheduleId}`);
        }

        // Admin/Trainer can bypass time validation
        const bypassTimeValidation = memberId && (req.user.role === 'admin' || req.user.role === 'trainer');
        const result = await classService.checkInToClass(scheduleId, targetUserId, { bypassTimeValidation });

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

    // GET /api/classes/enrollments (Admin & Trainer)
    getAllEnrollments: asyncHandler(async (req, res) => {
        const { status = 'active', limit = 50 } = req.query;

        const enrollments = await classService.getAllEnrollments({ status, limit });

        res.json({
            success: true,
            data: {
                enrollments: enrollments
            }
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

        const enrollments = await classService.getUserUpcomingClasses(userId, limit);
        
        // Transform enrollments to schedules format for frontend
        const schedules = enrollments.map(enrollment => ({
            id: enrollment.classSchedule.id,
            classId: enrollment.classSchedule.classId,
            date: enrollment.classSchedule.date,
            startTime: enrollment.classSchedule.startTime,
            endTime: enrollment.classSchedule.endTime,
            trainerId: enrollment.classSchedule.trainerId,
            maxParticipants: enrollment.classSchedule.maxParticipants,
            currentParticipants: enrollment.classSchedule.currentParticipants,
            status: enrollment.classSchedule.status,
            room: enrollment.classSchedule.room,
            notes: enrollment.classSchedule.notes,
            class: enrollment.classSchedule.class,
            trainer: enrollment.classSchedule.trainer,
            enrollmentId: enrollment.id,
            enrollmentStatus: enrollment.status
        }));

        res.json({
            success: true,
            data: { schedules }
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
    }),

    // ===== CHECK-IN MANAGEMENT CONTROLLERS =====

    // GET /api/classes/checkins
    getAllCheckIns: asyncHandler(async (req, res) => {
        const { 
            page = 1, 
            limit = 50,
            date,
            startDate,
            endDate,
            status = 'attended'
        } = req.query;

        const checkIns = await classService.getAllCheckIns({
            page,
            limit,
            date,
            startDate,
            endDate,
            status
        });

        res.json({
            success: true,
            data: checkIns
        });
    }),

    // GET /api/classes/checkins/:date
    getCheckInsByDate: asyncHandler(async (req, res) => {
        const { date } = req.params;
        const { limit = 100 } = req.query;

        const checkIns = await classService.getCheckInsByDate(date, { limit });

        res.json({
            success: true,
            data: checkIns
        });
    }),

    // GET /api/classes/schedules/:id/checkins
    getScheduleCheckIns: asyncHandler(async (req, res) => {
        const { id: scheduleId } = req.params;

        const checkIns = await classService.getScheduleCheckIns(scheduleId);

        res.json({
            success: true,
            data: checkIns
        });
    }),

    // ===== MEMBER CLASS HISTORY CONTROLLERS =====

    // GET /api/classes/members/:id/history
    getMemberClassHistory: asyncHandler(async (req, res) => {
        const { id: memberId } = req.params;
        const { 
            page = 1, 
            limit = 20,
            startDate,
            endDate,
            status = 'all'
        } = req.query;

        // Check authorization - users can only view their own history unless admin/trainer
        if (req.user.role !== 'admin' && req.user.role !== 'trainer') {
            // Get member's userId from Member table
            const member = await classService.getMemberByMemberId(memberId);
            if (!member || member.userId !== req.user.userId) {
                throw new ValidationError('Không có quyền xem lịch sử này');
            }
        }

        const history = await classService.getMemberClassHistory(memberId, {
            page,
            limit,
            startDate,
            endDate,
            status
        });

        res.json({
            success: true,
            data: history
        });
    }),

    // GET /api/classes/members/:id/stats
    getMemberClassStats: asyncHandler(async (req, res) => {
        const { id: memberId } = req.params;
        const { 
            startDate,
            endDate,
            period = 'month' // month, quarter, year
        } = req.query;

        // Check authorization - users can only view their own stats unless admin/trainer
        if (req.user.role !== 'admin' && req.user.role !== 'trainer') {
            const member = await classService.getMemberByMemberId(memberId);
            if (!member || member.userId !== req.user.userId) {
                throw new ValidationError('Không có quyền xem thống kê này');
            }
        }

        const stats = await classService.getMemberClassStats(memberId, {
            startDate,
            endDate,
            period
        });

        res.json({
            success: true,
            data: stats
        });
    }),

    // ===== MEMBER CHECK-IN CONTROLLERS =====

    // GET /api/classes/my/checkins
    getMyCheckIns: asyncHandler(async (req, res) => {
        const { 
            page = 1, 
            limit = 20,
            startDate,
            endDate 
        } = req.query;

        const userId = req.user.userId;
        
        const checkIns = await classService.getMemberCheckIns(userId, {
            page,
            limit,
            startDate,
            endDate
        });

        res.json({
            success: true,
            data: checkIns
        });
    }),

    // GET /api/classes/my/today-schedules
    getMyTodaySchedules: asyncHandler(async (req, res) => {
        const userId = req.user.userId;
        const today = new Date().toISOString().split('T')[0];
        
        const schedules = await classService.getMemberTodaySchedules(userId, today);

        res.json({
            success: true,
            data: schedules
        });
    }),

    // POST /api/classes/my/quick-checkin
    quickCheckIn: asyncHandler(async (req, res) => {
        const { 
            scheduleCode,  // Mã lịch tập hoặc QR code
            scheduleId     // Hoặc trực tiếp schedule ID
        } = req.body;

        const userId = req.user.userId;

        if (!scheduleCode && !scheduleId) {
            throw new ValidationError('Vui lòng cung cấp mã lịch tập hoặc ID lịch tập');
        }

        const result = await classService.quickCheckIn(userId, {
            scheduleCode,
            scheduleId
        });

        res.json({
            success: true,
            message: 'Check-in thành công!',
            data: result
        });
    })
};

module.exports = classController;