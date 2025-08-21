// services/classService.js
const { 
    ClassType, 
    Class, 
    ClassSchedule, 
    ClassEnrollment, 
    User, 
    Member 
} = require('../models');
const { Op } = require('sequelize');

class ClassService {
    // ===== CLASS TYPE SERVICES =====

    async getAllClassTypes(isActive = 'true') {
        const whereCondition = {};
        if (isActive !== 'all') {
            whereCondition.isActive = isActive === 'true';
        }

        return ClassType.findAll({
            where: whereCondition,
            order: [['name', 'ASC']]
        });
    }

    async getClassTypeById(id) {
        if (!id || isNaN(id) || id <= 0) {
            throw new Error('ID loại lớp không hợp lệ');
        }
        const classType = await ClassType.findByPk(id);
        if (!classType) {
            throw new Error('Không tìm thấy loại lớp');
        }
        return classType;
    }

    async checkClassTypeNameExists(name, excludeId = null) {
        const whereCondition = { name };
        if (excludeId) {
            whereCondition.id = { [Op.ne]: excludeId };
        }
        
        const existing = await ClassType.findOne({ where: whereCondition });
        return !!existing;
    }

    async createClassType(classTypeData) {
        const {
            name,
            description,
            duration,
            maxParticipants,
            equipment,
            difficulty,
            color
        } = classTypeData;

        return ClassType.create({
            name,
            description,
            duration: duration || null,
            maxParticipants: maxParticipants || null,
            equipment: Array.isArray(equipment) ? equipment : [],
            difficulty: difficulty || 'beginner',
            color: color || '#3498db'
        });
    }

    async updateClassType(id, updateData) {
        const classType = await ClassType.findByPk(id);
        if (!classType) {
            throw new Error('Không tìm thấy loại lớp');
        }

        await classType.update(updateData);
        return classType;
    }

    async deleteClassType(id) {
        const classType = await ClassType.findByPk(id);
        if (!classType) {
            throw new Error('Không tìm thấy loại lớp');
        }

        // Find all classes using this class type
        const classes = await Class.findAll({
            where: { classTypeId: id }
        });

        if (classes.length > 0) {
            // Delete all classes using this class type (which will cascade to schedules and enrollments)
            for (const classItem of classes) {
                await this.deleteClass(classItem.id);
            }
        }

        // Now safely delete the class type
        await classType.destroy({ force: true });
        
        return {
            deleted: true,
            message: classes.length > 0 
                ? `Xóa loại lớp thành công (đã xóa ${classes.length} lớp học liên quan)`
                : 'Xóa loại lớp thành công'
        };
    }

    // ===== CLASS SERVICES =====

    async getAllClasses(options = {}) {
        const {
            page = 1,
            limit = 10,
            classTypeId,
            trainerId,
            isActive = 'true',
            search = ''
        } = options;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Build where condition
        const whereCondition = {};
        
        if (search) {
            whereCondition[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ];
        }

        if (classTypeId) {
            whereCondition.classTypeId = classTypeId;
        }

        if (trainerId) {
            whereCondition.trainerId = trainerId;
        }

        if (isActive !== 'all') {
            whereCondition.isActive = isActive === 'true';
        }

        const { count, rows } = await Class.findAndCountAll({
            where: whereCondition,
            include: [
                {
                    model: ClassType,
                    as: 'classType',
                    attributes: ['id', 'name', 'difficulty', 'color']
                },
                {
                    model: User,
                    as: 'trainer',
                    attributes: ['id', 'fullName', 'email']
                }
            ],
            limit: parseInt(limit),
            offset: offset,
            order: [['name', 'ASC']],
            distinct: true
        });

        return {
            classes: rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(count / parseInt(limit)),
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        };
    }

    async getClassById(id) {
        if (!id || isNaN(id) || id <= 0) {
            throw new Error('ID lớp học không hợp lệ');
        }
        const classInfo = await Class.findByPk(id, {
            include: [
                {
                    model: ClassType,
                    as: 'classType',
                    required: false
                },
                {
                    model: User,
                    as: 'trainer',
                    attributes: ['id', 'fullName', 'email', 'phone'],
                    required: false
                },
                {
                    model: ClassSchedule,
                    as: 'schedules',
                    where: {
                        startTime: { [Op.gte]: new Date() },
                        status: { [Op.ne]: 'cancelled' }
                    },
                    required: false,
                    limit: 5,
                    order: [['startTime', 'ASC']]
                }
            ]
        });

        if (!classInfo) {
            throw new Error('Không tìm thấy lớp học');
        }
        return classInfo;
    }

    async createClass(classData) {
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
        } = classData;

        // Validate class type exists
        const classType = await ClassType.findByPk(classTypeId);
        if (!classType) {
            throw new Error('Không tìm thấy loại lớp');
        }

        // Validate trainer exists (optional)
        if (trainerId) {
            const trainer = await User.findOne({
                where: { 
                    id: trainerId, 
                    role: { [Op.in]: ['trainer', 'admin'] } 
                }
            });
            if (!trainer) {
                throw new Error('Không tìm thấy huấn luyện viên');
            }
        }

        const classInfo = await Class.create({
            classTypeId,
            name,
            description,
            trainerId,
            duration: duration || classType.duration,
            maxParticipants: maxParticipants || classType.maxParticipants,
            price: price || 0,
            room,
            recurring: recurring || false,
            recurringPattern
        });

        return this.getClassById(classInfo.id);
    }

    async updateClass(id, updateData) {
        const classInfo = await Class.findByPk(id);
        if (!classInfo) {
            throw new Error('Không tìm thấy lớp học');
        }

        await classInfo.update(updateData);
        return this.getClassById(id);
    }

    async deleteClass(id) {
        const classInfo = await Class.findByPk(id);
        if (!classInfo) {
            throw new Error('Không tìm thấy lớp học');
        }

        // Find all schedules for this class
        const schedules = await ClassSchedule.findAll({
            where: { classId: id }
        });

        if (schedules.length > 0) {
            // Cancel all enrollments for these schedules
            const scheduleIds = schedules.map(s => s.id);
            await ClassEnrollment.update(
                { status: 'cancelled' },
                {
                    where: {
                        classScheduleId: { [Op.in]: scheduleIds },
                        status: { [Op.in]: ['enrolled', 'attended'] }
                    }
                }
            );

            // Cancel all schedules
            await ClassSchedule.update(
                { status: 'cancelled' },
                {
                    where: { classId: id }
                }
            );
        }

        // Delete all schedules for this class (hard delete)
        if (schedules.length > 0) {
            await ClassSchedule.destroy({
                where: { classId: id },
                force: true
            });
        }

        // Now safely delete the class (hard delete)
        await classInfo.destroy({ force: true });
        
        return {
            deleted: true,
            message: schedules.length > 0 
                ? `Xóa lớp học thành công (đã xóa ${schedules.length} lịch và hủy tất cả đăng ký)`
                : 'Xóa lớp học thành công'
        };
    }

    // ===== CLASS SCHEDULE SERVICES =====

    async getClassSchedules(options = {}) {
        const {
            page = 1,
            limit = 10,
            date,
            startDate,
            endDate,
            classId,
            trainerId,
            status
        } = options;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Build where condition
        const whereCondition = {};
        
        if (date) {
            whereCondition.date = date;
        } else if (startDate && endDate) {
            whereCondition.date = {
                [Op.between]: [startDate, endDate]
            };
        } else if (startDate) {
            whereCondition.date = { [Op.gte]: startDate };
        } else if (endDate) {
            whereCondition.date = { [Op.lte]: endDate };
        }

        if (classId) {
            whereCondition.classId = classId;
        }

        if (trainerId) {
            whereCondition.trainerId = trainerId;
        }

        if (status) {
            whereCondition.status = status;
        }

        try {
            // First try a simple query without includes to check if basic data exists
            const simpleCount = await ClassSchedule.count({
                where: whereCondition
            });

            if (simpleCount === 0) {
                return {
                    schedules: [],
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: 0,
                        totalItems: 0,
                        itemsPerPage: parseInt(limit)
                    }
                };
            }

            // Try with includes
            const { count, rows } = await ClassSchedule.findAndCountAll({
                where: whereCondition,
                include: [
                    {
                        model: Class,
                        as: 'class',
                        required: false,
                        attributes: ['id', 'name', 'description', 'price', 'duration', 'maxParticipants'],
                        include: [
                            {
                                model: ClassType,
                                as: 'classType',
                                required: false,
                                attributes: ['id', 'name', 'difficulty', 'color', 'description']
                            }
                        ]
                    },
                    {
                        model: User,
                        as: 'trainer',
                        required: false,
                        attributes: ['id', 'fullName', 'email', 'phone']
                    }
                ],
                limit: parseInt(limit),
                offset: offset,
                order: [['startTime', 'ASC']],
                distinct: true
            });

            return {
                schedules: rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(count / parseInt(limit)),
                    totalItems: count,
                    itemsPerPage: parseInt(limit)
                }
            };

        } catch (error) {
            console.error('Error in getClassSchedules:', error);
            // Return empty result instead of throwing error
            return {
                schedules: [],
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: 0,
                    totalItems: 0,
                    itemsPerPage: parseInt(limit)
                },
                error: error.message
            };
        }
    }

    async getScheduleById(id) {
        if (!id || isNaN(id) || id <= 0) {
            throw new Error('ID lịch lớp không hợp lệ');
        }
        const schedule = await ClassSchedule.findByPk(id, {
            include: [
                {
                    model: Class,
                    as: 'class',
                    required: false,
                    include: [
                        {
                            model: ClassType,
                            as: 'classType',
                            required: false
                        }
                    ]
                },
                {
                    model: User,
                    as: 'trainer',
                    attributes: ['id', 'fullName', 'email', 'phone'],
                    required: false
                },
                {
                    model: ClassEnrollment,
                    as: 'enrollments',
                    required: false,
                    include: [
                        {
                            model: Member,
                            as: 'member',
                            attributes: ['id', 'memberCode', 'fullName', 'phone'],
                            required: false
                        }
                    ]
                }
            ]
        });

        if (!schedule) {
            throw new Error('Không tìm thấy lịch lớp');
        }
        return schedule;
    }

    async createClassSchedule(scheduleData) {
        const {
            classId,
            date,
            startTime,
            endTime,
            trainerId,
            maxParticipants,
            room,
            notes
        } = scheduleData;

        // Validate required data
        if (!classId || isNaN(classId) || classId <= 0) {
            throw new Error('ID lớp học không hợp lệ');
        }
        if (!trainerId || isNaN(trainerId) || trainerId <= 0) {
            throw new Error('ID huấn luyện viên không hợp lệ');
        }

        // Validate class exists
        const classInfo = await Class.findByPk(classId);
        if (!classInfo) {
            throw new Error('Không tìm thấy lớp học');
        }

        // Validate trainer exists
        const trainer = await User.findOne({
            where: { 
                id: trainerId, 
                role: { [Op.in]: ['trainer', 'admin'] } 
            }
        });
        if (!trainer) {
            throw new Error('Không tìm thấy huấn luyện viên');
        }

        // Debug log to see what data we receive
        console.log('🔍 Schedule Debug:');
        console.log('📅 date:', date);
        console.log('⏰ startTime:', startTime, typeof startTime);
        console.log('⏰ endTime:', endTime, typeof endTime);
        
        // Validate input formats first
        if (!date) {
            throw new Error('Ngày không được để trống');
        }
        if (!startTime) {
            throw new Error('Giờ bắt đầu không được để trống');
        }
        if (!endTime) {
            throw new Error('Giờ kết thúc không được để trống');
        }
        
        // Validate time format (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime)) {
            throw new Error('Định dạng giờ bắt đầu không hợp lệ (phải là HH:MM)');
        }
        if (!timeRegex.test(endTime)) {
            throw new Error('Định dạng giờ kết thúc không hợp lệ (phải là HH:MM)');
        }
        
        // Convert date to string if it's a Date object
        const dateString = date instanceof Date ? date.toISOString().split('T')[0] : date;
        console.log('📅 dateString:', dateString);
        
        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateString)) {
            throw new Error('Định dạng ngày không hợp lệ (phải là YYYY-MM-DD)');
        }
        
        // Convert HH:MM time format to proper datetime for database
        const startDateTime = new Date(`${dateString}T${startTime}:00`);
        const endDateTime = new Date(`${dateString}T${endTime}:00`);

        console.log('📅 startDateTime:', startDateTime);
        console.log('📅 endDateTime:', endDateTime);

        // Validate time
        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
            console.log('❌ Invalid date detected!');
            throw new Error('Dữ liệu thời gian không thể chuyển đổi được - vui lòng kiểm tra lại định dạng');
        }

        if (endDateTime <= startDateTime) {
            throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu');
        }

        // Check for trainer schedule conflict
        const conflictingSchedule = await ClassSchedule.findOne({
            where: {
                trainerId,
                date,
                status: { [Op.ne]: 'cancelled' },
                [Op.or]: [
                    {
                        startTime: { [Op.between]: [startDateTime, endDateTime] }
                    },
                    {
                        endTime: { [Op.between]: [startDateTime, endDateTime] }
                    },
                    {
                        [Op.and]: [
                            { startTime: { [Op.lte]: startDateTime } },
                            { endTime: { [Op.gte]: endDateTime } }
                        ]
                    }
                ]
            }
        });

        if (conflictingSchedule) {
            throw new Error('Huấn luyện viên đã có lịch trùng với thời gian này');
        }

        const schedule = await ClassSchedule.create({
            classId,
            date,
            startTime: startDateTime,
            endTime: endDateTime,
            trainerId,
            maxParticipants: maxParticipants || classInfo.maxParticipants,
            room: room || classInfo.room,
            notes
        });

        return this.getScheduleById(schedule.id);
    }

    async updateClassSchedule(id, updateData) {
        const schedule = await ClassSchedule.findByPk(id);
        if (!schedule) {
            throw new Error('Không tìm thấy lịch lớp');
        }

        // Check if schedule can be updated
        if (schedule.status === 'completed') {
            throw new Error('Không thể sửa lịch đã hoàn thành');
        }

        // Process updateData to handle time formats properly
        const processedUpdateData = { ...updateData };
        
        // Validate time format if provided
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (updateData.startTime && !timeRegex.test(updateData.startTime)) {
            throw new Error('Định dạng giờ bắt đầu không hợp lệ (phải là HH:MM)');
        }
        if (updateData.endTime && !timeRegex.test(updateData.endTime)) {
            throw new Error('Định dạng giờ kết thúc không hợp lệ (phải là HH:MM)');
        }
        
        // Convert date + time format to full datetime for database
        if (updateData.date && updateData.startTime) {
            console.log('🔍 updateData.date:', updateData.date, 'Type:', typeof updateData.date);
            console.log('🔍 Is Date?', updateData.date instanceof Date);
            
            // Handle both Date object and string
            let dateStr;
            if (updateData.date instanceof Date) {
                if (isNaN(updateData.date.getTime())) {
                    throw new Error('Ngày là Invalid Date object');
                }
                dateStr = updateData.date.toISOString().split('T')[0];
            } else {
                dateStr = updateData.date;
                // Validate date format if it's a string
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(dateStr)) {
                    throw new Error('Định dạng ngày không hợp lệ (phải là YYYY-MM-DD)');
                }
            }
            console.log('🔍 Final dateStr:', dateStr);
            
            processedUpdateData.startTime = new Date(`${dateStr}T${updateData.startTime}:00`);
            if (isNaN(processedUpdateData.startTime.getTime())) {
                throw new Error('Dữ liệu thời gian bắt đầu không thể chuyển đổi được');
            }
        } else if (updateData.startTime) {
            // If only time is provided, use current date
            const currentDate = schedule.date || new Date();
            const dateStr = currentDate.toISOString().split('T')[0];
            processedUpdateData.startTime = new Date(`${dateStr}T${updateData.startTime}:00`);
            if (isNaN(processedUpdateData.startTime.getTime())) {
                throw new Error('Dữ liệu thời gian bắt đầu không thể chuyển đổi được');
            }
        }
        
        if (updateData.date && updateData.endTime) {
            console.log('🔍 Processing endTime - updateData.date:', updateData.date, 'Type:', typeof updateData.date);
            
            // Handle both Date object and string  
            let dateStr;
            if (updateData.date instanceof Date) {
                if (isNaN(updateData.date.getTime())) {
                    throw new Error('Ngày là Invalid Date object (endTime processing)');
                }
                dateStr = updateData.date.toISOString().split('T')[0];
            } else {
                dateStr = updateData.date;
                // Validate date format if it's a string
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(dateStr)) {
                    throw new Error('Định dạng ngày không hợp lệ (phải là YYYY-MM-DD) [endTime validation]');
                }
            }
            console.log('🔍 endTime dateStr:', dateStr);
            
            processedUpdateData.endTime = new Date(`${dateStr}T${updateData.endTime}:00`);
            if (isNaN(processedUpdateData.endTime.getTime())) {
                throw new Error('Dữ liệu thời gian kết thúc không thể chuyển đổi được');
            }
        } else if (updateData.endTime) {
            // If only time is provided, use current date
            const currentDate = schedule.date || new Date();
            const dateStr = currentDate.toISOString().split('T')[0];
            processedUpdateData.endTime = new Date(`${dateStr}T${updateData.endTime}:00`);
            if (isNaN(processedUpdateData.endTime.getTime())) {
                throw new Error('Dữ liệu thời gian kết thúc không thể chuyển đổi được');
            }
        }

        // If updating time, check for conflicts
        if (updateData.startTime || updateData.endTime || updateData.trainerId) {
            const startTime = processedUpdateData.startTime || schedule.startTime;
            const endTime = processedUpdateData.endTime || schedule.endTime;
            const trainerId = updateData.trainerId || schedule.trainerId;

            const conflictingSchedule = await ClassSchedule.findOne({
                where: {
                    id: { [Op.ne]: id },
                    trainerId,
                    date: schedule.date,
                    status: { [Op.ne]: 'cancelled' },
                    [Op.or]: [
                        {
                            startTime: { [Op.between]: [startTime, endTime] }
                        },
                        {
                            endTime: { [Op.between]: [startTime, endTime] }
                        },
                        {
                            [Op.and]: [
                                { startTime: { [Op.lte]: startTime } },
                                { endTime: { [Op.gte]: endTime } }
                            ]
                        }
                    ]
                }
            });

            if (conflictingSchedule) {
                throw new Error('Huấn luyện viên đã có lịch trùng với thời gian này');
            }
        }

        await schedule.update(processedUpdateData);
        return this.getScheduleById(id);
    }

    async cancelClassSchedule(id) {
        const schedule = await ClassSchedule.findByPk(id);
        if (!schedule) {
            throw new Error('Không tìm thấy lịch lớp');
        }

        if (schedule.status === 'completed') {
            throw new Error('Không thể hủy lịch đã hoàn thành');
        }

        // Cancel all enrollments
        await ClassEnrollment.update(
            { status: 'cancelled' },
            { 
                where: { 
                    classScheduleId: id,
                    status: { [Op.in]: ['enrolled', 'attended'] }
                } 
            }
        );

        await schedule.update({ status: 'cancelled' });

        return {
            message: 'Hủy lịch lớp thành công'
        };
    }

    // ===== ENROLLMENT SERVICES =====

    async enrollInClass(scheduleId, userId) {
        console.log('🔍 Enrollment Debug - scheduleId:', scheduleId, 'userId:', userId);
        
        // Check user role first
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error('Không tìm thấy thông tin người dùng');
        }
        
        // Prevent admin and trainer from enrolling in classes
        if (user.role === 'admin' || user.role === 'trainer') {
            const roleText = user.role === 'admin' ? 'Quản trị viên' : 'Huấn luyện viên';
            throw new Error(`${roleText} không thể đăng ký lớp học như hội viên`);
        }
        
        // Get member from userId
        const member = await Member.findOne({ 
            where: { userId },
            include: [
                {
                    model: User,
                    as: 'user'
                }
            ]
        });
        
        console.log('🔍 Found member:', member ? `ID: ${member.id}, Code: ${member.memberCode}` : 'NOT FOUND');
        
        if (!member) {
            console.log('🔍 Found user for auto-member creation:', user ? `${user.fullName} (${user.role})` : 'NOT FOUND');
            
            if (user) {
                console.log('🔧 Auto-creating Member record for user:', user.fullName);
                const newMember = await Member.create({
                    userId: user.id,
                    memberCode: `AUTO${String(user.id).padStart(3, '0')}`,
                    fullName: user.fullName,
                    phone: `0900${String(user.id).padStart(6, '0')}`,
                    email: user.email,
                    joinDate: new Date(),
                    isActive: true
                });
                console.log('✅ Auto-created Member:', newMember.memberCode);
                
                // Use the newly created member
                const memberWithUser = await Member.findOne({ 
                    where: { userId },
                    include: [
                        {
                            model: User,
                            as: 'user'
                        }
                    ]
                });
                
                if (!memberWithUser) {
                    throw new Error('Không thể tạo thông tin hội viên tự động');
                }
                
                return this.continueEnrollment(scheduleId, memberWithUser);
            } else {
                throw new Error('Không tìm thấy thông tin người dùng');
            }
        }
        
        return this.continueEnrollment(scheduleId, member);
    }
    
    async continueEnrollment(scheduleId, member) {

        // Get schedule
        const schedule = await this.getScheduleById(scheduleId);

        // Check if enrollment is open (manual check since we're using Sequelize instance)
        const now = new Date();
        const startTime = new Date(schedule.startTime);
        
        console.log('🔍 Enrollment Check:');
        console.log('📅 Schedule status:', schedule.status);
        console.log('⏰ Start time:', startTime);
        console.log('🕐 Current time:', now);
        console.log('👥 Current/Max participants:', schedule.currentParticipants, '/', schedule.maxParticipants);
        
        const isScheduled = schedule.status === 'scheduled';
        const isBeforeStart = now < startTime;
        const hasSlots = schedule.currentParticipants < schedule.maxParticipants;
        
        console.log('✅ Status checks:', { isScheduled, isBeforeStart, hasSlots });
        
        if (!isScheduled) {
            throw new Error(`Không thể đăng ký lớp này - Trạng thái: ${schedule.status}`);
        }
        if (!isBeforeStart) {
            throw new Error('Không thể đăng ký - Lớp đã bắt đầu hoặc đã kết thúc');
        }
        if (!hasSlots) {
            throw new Error('Không thể đăng ký - Lớp đã đầy');
        }

        // Check if already enrolled
        const existingEnrollment = await ClassEnrollment.findOne({
            where: {
                memberId: member.id,
                classScheduleId: scheduleId,
                status: { [Op.in]: ['enrolled', 'attended'] }
            }
        });

        if (existingEnrollment) {
            throw new Error('Đã đăng ký lớp này rồi');
        }

        // Check for schedule conflict - member cannot enroll in overlapping classes
        const conflictingEnrollments = await ClassEnrollment.findAll({
            where: {
                memberId: member.id,
                status: { [Op.in]: ['enrolled', 'attended'] }
            },
            include: [{
                model: ClassSchedule,
                as: 'classSchedule',
                where: {
                    date: schedule.date, // Same date
                    [Op.or]: [
                        // Current schedule starts during existing class
                        {
                            startTime: { [Op.lte]: schedule.startTime },
                            endTime: { [Op.gt]: schedule.startTime }
                        },
                        // Current schedule ends during existing class
                        {
                            startTime: { [Op.lt]: schedule.endTime },
                            endTime: { [Op.gte]: schedule.endTime }
                        },
                        // Current schedule completely contains existing class
                        {
                            startTime: { [Op.gte]: schedule.startTime },
                            endTime: { [Op.lte]: schedule.endTime }
                        }
                    ]
                },
                include: [{
                    model: Class,
                    as: 'class',
                    attributes: ['name']
                }]
            }]
        });

        if (conflictingEnrollments.length > 0) {
            const conflictClass = conflictingEnrollments[0].classSchedule.class.name;
            const conflictTime = `${conflictingEnrollments[0].classSchedule.startTime} - ${conflictingEnrollments[0].classSchedule.endTime}`;
            throw new Error(`Không thể đăng ký - Trùng lịch với lớp "${conflictClass}" (${conflictTime})`);
        }

        // Check membership requirements (optional - implement if needed)
        // const activeMembership = await member.getActiveMembership();
        // if (!activeMembership) {
        //     throw new Error('Cần có membership để đăng ký lớp');
        // }

        // Create enrollment
        const enrollment = await ClassEnrollment.create({
            memberId: member.id,
            classScheduleId: scheduleId,
            enrollmentDate: new Date()
        });

        // Update current participants count
        await schedule.increment('currentParticipants');

        // Create invoice for class enrollment if class has a price
        const classPrice = parseFloat(schedule.class?.price || 0);
        let invoice = null;
        let invoiceError = null;

        if (classPrice > 0) {
            try {
                const invoiceService = require('./invoiceService');
                
                // Calculate due date (3 days for class payment)
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 3);

                invoice = await invoiceService.generateClassInvoice(member.id, {
                    classId: schedule.classId,
                    className: schedule.class.name,
                    sessionCount: 1
                });

                // Update enrollment with invoice reference
                await enrollment.update({
                    notes: `Invoice: ${invoice.invoiceNumber}`
                });

                console.log(`✅ Created invoice ${invoice.invoiceNumber} for class enrollment`);
            } catch (error) {
                console.warn('Failed to create invoice for class enrollment:', error.message);
                invoiceError = 'Không thể tạo hóa đơn tự động. Vui lòng liên hệ admin.';
            }
        }

        const enrollmentResult = await ClassEnrollment.findByPk(enrollment.id, {
            include: [
                {
                    model: Member,
                    as: 'member',
                    attributes: ['id', 'memberCode', 'fullName']
                },
                {
                    model: ClassSchedule,
                    as: 'classSchedule',
                    include: [
                        {
                            model: Class,
                            as: 'class',
                            include: [{ model: ClassType, as: 'classType' }]
                        }
                    ]
                }
            ]
        });

        // Return enrollment with invoice info
        return {
            enrollment: enrollmentResult,
            invoice: invoice,
            invoiceError: invoiceError,
            hasPayment: classPrice > 0
        };
    }

    async cancelEnrollment(scheduleId, userId) {
        // Get member from userId
        const member = await Member.findOne({ where: { userId } });
        if (!member) {
            throw new Error('Không tìm thấy thông tin hội viên');
        }

        const enrollment = await ClassEnrollment.findOne({
            where: {
                memberId: member.id,
                classScheduleId: scheduleId,
                status: { [Op.in]: ['enrolled', 'attended'] }
            }
        });

        if (!enrollment) {
            throw new Error('Không tìm thấy đăng ký lớp');
        }

        // Check if can cancel (e.g., not too close to class time)
        const schedule = await ClassSchedule.findByPk(scheduleId);
        const now = new Date();
        const classTime = new Date(schedule.startTime);
        const timeDiff = classTime - now;
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        if (hoursDiff < 2) {
            throw new Error('Không thể hủy đăng ký trong vòng 2 giờ trước giờ học');
        }

        await enrollment.update({ status: 'cancelled' });

        // Update current participants count
        await schedule.decrement('currentParticipants');

        return {
            message: 'Hủy đăng ký thành công'
        };
    }

    async cancelEnrollmentById(enrollmentId, userId, userRole) {
        const enrollment = await ClassEnrollment.findOne({
            where: { id: enrollmentId },
            include: [
                {
                    model: ClassSchedule,
                    as: 'classSchedule'
                },
                {
                    model: Member,
                    as: 'member'
                }
            ]
        });

        if (!enrollment) {
            throw new Error('Không tìm thấy đăng ký lớp');
        }

        // Check authorization - users can only cancel their own enrollments unless admin/trainer
        if (userRole !== 'admin' && userRole !== 'trainer') {
            const member = await Member.findOne({ where: { userId } });
            if (!member || enrollment.memberId !== member.id) {
                throw new Error('Không có quyền hủy đăng ký này');
            }
        }

        if (enrollment.status === 'cancelled') {
            throw new Error('Đăng ký đã được hủy trước đó');
        }

        if (!['enrolled', 'attended'].includes(enrollment.status)) {
            throw new Error('Không thể hủy đăng ký với trạng thái hiện tại');
        }

        // Check if can cancel (e.g., not too close to class time)
        const schedule = enrollment.classSchedule;
        const now = new Date();
        const classTime = new Date(schedule.startTime);
        const timeDiff = classTime - now;
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        if (hoursDiff < 2 && userRole !== 'admin' && userRole !== 'trainer') {
            throw new Error('Không thể hủy đăng ký trong vòng 2 giờ trước giờ học');
        }

        await enrollment.update({ status: 'cancelled' });

        // Update current participants count
        await schedule.decrement('currentParticipants');

        return {
            message: 'Hủy đăng ký thành công',
            enrollment: {
                id: enrollment.id,
                memberId: enrollment.memberId,
                memberName: enrollment.member?.name,
                classScheduleId: enrollment.classScheduleId,
                status: 'cancelled'
            }
        };
    }

    async checkInToClass(scheduleId, userId, options = {}) {
        const { bypassTimeValidation = false } = options;
        
        // Get member from userId
        const member = await Member.findOne({ where: { userId } });
        if (!member) {
            throw new Error('Không tìm thấy thông tin hội viên');
        }

        const enrollment = await ClassEnrollment.findOne({
            where: {
                memberId: member.id,
                classScheduleId: scheduleId,
                status: 'enrolled'
            }
        });

        if (!enrollment) {
            throw new Error('Không tìm thấy đăng ký lớp');
        }

        const schedule = await ClassSchedule.findByPk(scheduleId);
        
        // Check if member is already attending another class at the same time
        const conflictEnrollment = await ClassEnrollment.findOne({
            where: {
                memberId: member.id,
                status: 'attended',
                checkinTime: { [Op.ne]: null },
                checkoutTime: null // Still attending
            },
            include: [{
                model: ClassSchedule,
                where: {
                    date: schedule.date,
                    [Op.or]: [
                        // Current schedule overlaps with existing attendance
                        {
                            [Op.and]: [
                                { startTime: { [Op.lte]: schedule.endTime } },
                                { endTime: { [Op.gte]: schedule.startTime } }
                            ]
                        }
                    ]
                }
            }]
        });
        
        if (conflictEnrollment) {
            throw new Error('Thành viên đang tham gia lớp khác cùng thời gian này');
        }
        
        // Time validation (can be bypassed by admin/trainer)
        if (!bypassTimeValidation) {
            const now = new Date();
            const startTime = new Date(schedule.startTime);
            const checkInStart = new Date(startTime.getTime() - 15 * 60 * 1000); // 15 minutes before
            const checkInEnd = new Date(startTime.getTime() + 15 * 60 * 1000);   // 15 minutes after
            const canCheckIn = now >= checkInStart && now <= checkInEnd && schedule.status === 'scheduled';
            
            if (!canCheckIn) {
                throw new Error('Chưa đến giờ check-in hoặc đã quá giờ');
            }
        } else {
            console.log('⏰ Time validation bypassed by admin/trainer');
        }

        await enrollment.update({
            status: 'attended',
            checkinTime: new Date()
        });

        return enrollment;
    }

    async checkOutFromClass(scheduleId, userId) {
        // Get member from userId
        const member = await Member.findOne({ where: { userId } });
        if (!member) {
            throw new Error('Không tìm thấy thông tin hội viên');
        }

        const enrollment = await ClassEnrollment.findOne({
            where: {
                memberId: member.id,
                classScheduleId: scheduleId,
                status: 'attended',
                checkinTime: { [Op.ne]: null },
                checkoutTime: null
            }
        });

        if (!enrollment) {
            throw new Error('Chưa check-in hoặc đã check-out');
        }

        await enrollment.update({
            checkoutTime: new Date()
        });

        return enrollment;
    }

    async getClassEnrollments(scheduleId) {
        const enrollments = await ClassEnrollment.findAll({
            where: { classScheduleId: scheduleId },
            include: [
                {
                    model: Member,
                    as: 'member',
                    attributes: ['id', 'memberCode', 'fullName', 'phone'],
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['role'],
                            required: false // Allow members without users
                        }
                    ]
                }
            ],
            order: [['enrollmentDate', 'ASC']]
        });

        // Filter to only show enrollments from actual members, excluding admin/trainer
        // Include only if: no user record OR user role is 'member'
        return enrollments.filter(enrollment => {
            if (!enrollment.member) return false;
            
            // If no user record, check member code pattern to exclude admin codes
            if (!enrollment.member.user) {
                return !enrollment.member.memberCode.includes('ADMIN');
            }
            
            // If user record exists, only include if role is 'member'
            return enrollment.member.user.role === 'member';
        });
    }

    // Get all enrollments with filters
    async getAllEnrollments({ status = 'active', limit = 50 } = {}) {
        const whereCondition = {};
        
        if (status === 'active') {
            whereCondition.status = { [Op.in]: ['enrolled', 'attended'] };
        } else if (status !== 'all') {
            whereCondition.status = status;
        }

        const enrollments = await ClassEnrollment.findAll({
            where: whereCondition,
            include: [
                {
                    model: Member,
                    as: 'member',
                    attributes: ['id', 'memberCode', 'fullName', 'phone'],
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['role'],
                            required: false // Allow members without users
                        }
                    ]
                },
                {
                    model: ClassSchedule,
                    as: 'classSchedule',
                    attributes: ['id', 'date', 'startTime', 'endTime', 'status', 'trainerId'],
                    include: [
                        {
                            model: Class,
                            as: 'class',
                            attributes: ['id', 'name', 'trainerId']
                        }
                    ]
                }
            ],
            order: [['enrollmentDate', 'DESC']],
            limit: parseInt(limit)
        });

        // Filter to only show enrollments from actual members, excluding admin/trainer
        // Include only if: no user record OR user role is 'member'
        return enrollments.filter(enrollment => {
            if (!enrollment.member) return false;
            
            // If no user record, check member code pattern to exclude admin codes
            if (!enrollment.member.user) {
                return !enrollment.member.memberCode.includes('ADMIN');
            }
            
            // If user record exists, only include if role is 'member'
            return enrollment.member.user.role === 'member';
        });
    }

    // ===== ANALYTICS SERVICES =====

    async getPopularClasses(limit = 10) {
        try {
            // Simplified query to avoid complex nested associations issues
            const classes = await Class.findAll({
                include: [
                    {
                        model: ClassType,
                        as: 'classType',
                        attributes: ['id', 'name', 'difficulty']
                    }
                ],
                limit: parseInt(limit),
                order: [['name', 'ASC']]
            });

            // For each class, count enrollments manually
            const classesWithCounts = await Promise.all(
                classes.map(async (classItem) => {
                    const enrollmentCount = await ClassEnrollment.count({
                        include: [
                            {
                                model: ClassSchedule,
                                as: 'classSchedule',
                                where: { classId: classItem.id },
                                required: true
                            }
                        ],
                        where: { status: { [Op.in]: ['enrolled', 'attended'] } }
                    });

                    return {
                        ...classItem.toJSON(),
                        enrollmentCount
                    };
                })
            );

            // Sort by enrollment count descending
            return classesWithCounts.sort((a, b) => b.enrollmentCount - a.enrollmentCount);

        } catch (error) {
            console.error('Error in getPopularClasses:', error);
            // Return basic classes list if complex query fails
            return Class.findAll({
                include: [
                    {
                        model: ClassType,
                        as: 'classType',
                        attributes: ['id', 'name', 'difficulty']
                    }
                ],
                limit: parseInt(limit)
            });
        }
    }

    async getClassRevenue(startDate = null, endDate = null) {
        try {
            const whereCondition = {};
            
            if (startDate && endDate) {
                whereCondition.date = {
                    [Op.between]: [startDate, endDate]
                };
            }

            // Get schedules with classes
            const schedules = await ClassSchedule.findAll({
                where: whereCondition,
                include: [
                    {
                        model: Class,
                        as: 'class',
                        attributes: ['id', 'name', 'price']
                    }
                ]
            });

            // Group by class and calculate revenue
            const revenueData = {};
            
            for (const schedule of schedules) {
                const classId = schedule.classId;
                const className = schedule.class?.name || 'Unknown';
                const classPrice = schedule.class?.price || 0;
                
                if (!revenueData[classId]) {
                    revenueData[classId] = {
                        name: className,
                        price: classPrice,
                        totalEnrollments: 0,
                        totalRevenue: 0
                    };
                }

                // Count enrollments for this schedule
                const enrollmentCount = await ClassEnrollment.count({
                    where: {
                        classScheduleId: schedule.id,
                        status: { [Op.in]: ['enrolled', 'attended'] }
                    }
                });

                revenueData[classId].totalEnrollments += enrollmentCount;
                revenueData[classId].totalRevenue += enrollmentCount * classPrice;
            }

            // Convert to array and sort by revenue
            return Object.values(revenueData)
                .sort((a, b) => b.totalRevenue - a.totalRevenue);

        } catch (error) {
            console.error('Error in getClassRevenue:', error);
            return [];
        }
    }

    async getAttendanceStats(startDate = null, endDate = null) {
        const whereCondition = {};
        
        if (startDate && endDate) {
            whereCondition.date = {
                [Op.between]: [startDate, endDate]
            };
        }

        const totalSchedules = await ClassSchedule.count({
            where: {
                ...whereCondition,
                status: { [Op.ne]: 'cancelled' }
            }
        });

        const totalEnrollments = await ClassEnrollment.count({
            include: [
                {
                    model: ClassSchedule,
                    as: 'classSchedule',
                    where: whereCondition,
                    required: true
                }
            ],
            where: { status: { [Op.in]: ['enrolled', 'attended'] } }
        });

        const totalAttendance = await ClassEnrollment.count({
            include: [
                {
                    model: ClassSchedule,
                    as: 'classSchedule',
                    where: whereCondition,
                    required: true
                }
            ],
            where: { status: 'attended' }
        });

        return {
            totalSchedules,
            totalEnrollments,
            totalAttendance,
            attendanceRate: totalEnrollments > 0 ? ((totalAttendance / totalEnrollments) * 100).toFixed(2) : 0
        };
    }

    // ===== USER-SPECIFIC SERVICES =====

    async getUserUpcomingClasses(userId, limit = 10) {
        try {
            // Get member from userId
            const member = await Member.findOne({ where: { userId } });
            if (!member) {
                return [];
            }

            // Query with full relationships
            return ClassEnrollment.findAll({
                where: {
                    memberId: member.id,
                    status: { [Op.in]: ['enrolled', 'attended'] }
                },
                include: [
                    {
                        model: ClassSchedule,
                        as: 'classSchedule',
                        where: {
                            startTime: { [Op.gte]: new Date() },
                            status: { [Op.ne]: 'cancelled' }
                        },
                        required: true,
                        include: [
                            {
                                model: Class,
                                as: 'class',
                                include: [
                                    {
                                        model: ClassType,
                                        as: 'classType'
                                    },
                                    {
                                        model: User,
                                        as: 'trainer'
                                    }
                                ]
                            }
                        ]
                    }
                ],
                order: [[{ model: ClassSchedule, as: 'classSchedule' }, 'startTime', 'ASC']],
                limit: parseInt(limit)
            });
        } catch (error) {
            console.error('Error in getUserUpcomingClasses:', error);
            return [];
        }
    }

    async getUserClassHistory(userId, options = {}) {
        try {
            const { page = 1, limit = 10 } = options;
            const offset = (parseInt(page) - 1) * parseInt(limit);

            // Get member from userId
            const member = await Member.findOne({ where: { userId } });
            if (!member) {
                return {
                    enrollments: [],
                    total: 0,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: 0,
                        totalItems: 0,
                        itemsPerPage: parseInt(limit)
                    }
                };
            }

            // Simplified query
            const { count, rows } = await ClassEnrollment.findAndCountAll({
                where: {
                    memberId: member.id
                },
                include: [
                    {
                        model: ClassSchedule,
                        as: 'classSchedule',
                        required: false,
                        include: [
                            {
                                model: Class,
                                as: 'class',
                                include: [
                                    {
                                        model: ClassType,
                                        as: 'classType'
                                    },
                                    {
                                        model: User,
                                        as: 'trainer',
                                        attributes: ['id', 'fullName', 'username']
                                    }
                                ]
                            }
                        ]
                    }
                ],
                order: [['id', 'DESC']],
                limit: parseInt(limit),
                offset: offset,
                distinct: true
            });

            return {
                enrollments: rows,
                total: count,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(count / parseInt(limit)),
                    totalItems: count,
                    itemsPerPage: parseInt(limit)
                }
            };
        } catch (error) {
            console.error('Error in getUserClassHistory:', error);
            return {
                enrollments: [],
                total: 0,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: 0,
                    totalItems: 0,
                    itemsPerPage: parseInt(limit)
                }
            };
        }
    }

    async getTrainerSchedules(trainerId, options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                startDate,
                endDate,
                status
            } = options;

            const offset = (parseInt(page) - 1) * parseInt(limit);
            
            const whereCondition = { trainerId };
            
            if (startDate && endDate) {
                whereCondition.date = {
                    [Op.between]: [startDate, endDate]
                };
            } else if (startDate) {
                whereCondition.date = { [Op.gte]: startDate };
            } else if (endDate) {
                whereCondition.date = { [Op.lte]: endDate };
            }

            if (status) {
                whereCondition.status = status;
            }

            // Simplified query
            const { count, rows } = await ClassSchedule.findAndCountAll({
                where: whereCondition,
                include: [
                    {
                        model: Class,
                        as: 'class',
                        required: false
                    }
                ],
                limit: parseInt(limit),
                offset: offset,
                order: [['startTime', 'ASC']],
                distinct: true
            });

            return {
                schedules: rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(count / parseInt(limit)),
                    totalItems: count,
                    itemsPerPage: parseInt(limit)
                }
            };
        } catch (error) {
            console.error('Error in getTrainerSchedules:', error);
            return {
                schedules: [],
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: 0,
                    totalItems: 0,
                    itemsPerPage: parseInt(limit)
                }
            };
        }
    }

    // ===== CHECK-IN MANAGEMENT SERVICES =====

    async getAllCheckIns(options = {}) {
        try {
            const {
                page = 1,
                limit = 50,
                date,
                startDate,
                endDate,
                status = 'attended'
            } = options;

            const offset = (parseInt(page) - 1) * parseInt(limit);
            
            // Build where condition for schedules
            const scheduleWhere = {};
            
            if (date) {
                scheduleWhere.date = date;
            } else if (startDate && endDate) {
                scheduleWhere.date = {
                    [Op.between]: [startDate, endDate]
                };
            } else if (startDate) {
                scheduleWhere.date = { [Op.gte]: startDate };
            } else if (endDate) {
                scheduleWhere.date = { [Op.lte]: endDate };
            }

            // Build where condition for enrollments
            const enrollmentWhere = {};
            if (status !== 'all') {
                enrollmentWhere.status = status;
            }
            
            // Only get enrollments with checkin time
            enrollmentWhere.checkinTime = { [Op.ne]: null };

            const { count, rows } = await ClassEnrollment.findAndCountAll({
                where: enrollmentWhere,
                include: [
                    {
                        model: Member,
                        as: 'member',
                        attributes: ['id', 'memberCode', 'fullName', 'phone'],
                        required: true
                    },
                    {
                        model: ClassSchedule,
                        as: 'classSchedule',
                        where: scheduleWhere,
                        required: true,
                        include: [
                            {
                                model: Class,
                                as: 'class',
                                attributes: ['id', 'name', 'price'],
                                include: [
                                    {
                                        model: ClassType,
                                        as: 'classType',
                                        attributes: ['id', 'name', 'color']
                                    }
                                ]
                            },
                            {
                                model: User,
                                as: 'trainer',
                                attributes: ['id', 'fullName']
                            }
                        ]
                    }
                ],
                order: [['checkinTime', 'DESC']],
                limit: parseInt(limit),
                offset: offset,
                distinct: true
            });

            return {
                checkIns: rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(count / parseInt(limit)),
                    totalItems: count,
                    itemsPerPage: parseInt(limit)
                }
            };
        } catch (error) {
            console.error('Error in getAllCheckIns:', error);
            return {
                checkIns: [],
                pagination: {
                    currentPage: parseInt(page || 1),
                    totalPages: 0,
                    totalItems: 0,
                    itemsPerPage: parseInt(limit || 50)
                },
                error: error.message
            };
        }
    }

    async getCheckInsByDate(date, options = {}) {
        try {
            const { limit = 100 } = options;
            
            const checkIns = await ClassEnrollment.findAll({
                where: {
                    checkinTime: { [Op.ne]: null },
                    status: { [Op.in]: ['attended'] }
                },
                include: [
                    {
                        model: Member,
                        as: 'member',
                        attributes: ['id', 'memberCode', 'fullName', 'phone'],
                        required: true
                    },
                    {
                        model: ClassSchedule,
                        as: 'classSchedule',
                        where: { date },
                        required: true,
                        include: [
                            {
                                model: Class,
                                as: 'class',
                                attributes: ['id', 'name', 'price'],
                                include: [
                                    {
                                        model: ClassType,
                                        as: 'classType',
                                        attributes: ['id', 'name', 'color']
                                    }
                                ]
                            },
                            {
                                model: User,
                                as: 'trainer',
                                attributes: ['id', 'fullName']
                            }
                        ]
                    }
                ],
                order: [['checkinTime', 'ASC']],
                limit: parseInt(limit)
            });

            return checkIns;
        } catch (error) {
            console.error('Error in getCheckInsByDate:', error);
            return [];
        }
    }

    async getScheduleCheckIns(scheduleId) {
        try {
            const checkIns = await ClassEnrollment.findAll({
                where: {
                    classScheduleId: scheduleId,
                    checkinTime: { [Op.ne]: null }
                },
                include: [
                    {
                        model: Member,
                        as: 'member',
                        attributes: ['id', 'memberCode', 'fullName', 'phone'],
                        required: true
                    }
                ],
                order: [['checkinTime', 'ASC']]
            });

            return checkIns;
        } catch (error) {
            console.error('Error in getScheduleCheckIns:', error);
            return [];
        }
    }

    // ===== MEMBER CLASS HISTORY SERVICES =====

    async getMemberByMemberId(memberId) {
        try {
            return await Member.findByPk(memberId, {
                attributes: ['id', 'userId', 'memberCode', 'fullName']
            });
        } catch (error) {
            console.error('Error in getMemberByMemberId:', error);
            return null;
        }
    }

    async getMemberClassHistory(memberId, options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                startDate,
                endDate,
                status = 'all'
            } = options;

            const offset = (parseInt(page) - 1) * parseInt(limit);
            
            // Build where condition for schedules
            const scheduleWhere = {};
            
            if (startDate && endDate) {
                scheduleWhere.date = {
                    [Op.between]: [startDate, endDate]
                };
            } else if (startDate) {
                scheduleWhere.date = { [Op.gte]: startDate };
            } else if (endDate) {
                scheduleWhere.date = { [Op.lte]: endDate };
            }

            // Build where condition for enrollments
            const enrollmentWhere = { memberId };
            if (status !== 'all') {
                enrollmentWhere.status = status;
            }

            const { count, rows } = await ClassEnrollment.findAndCountAll({
                where: enrollmentWhere,
                include: [
                    {
                        model: ClassSchedule,
                        as: 'classSchedule',
                        where: scheduleWhere,
                        required: true,
                        include: [
                            {
                                model: Class,
                                as: 'class',
                                attributes: ['id', 'name', 'description', 'price'],
                                include: [
                                    {
                                        model: ClassType,
                                        as: 'classType',
                                        attributes: ['id', 'name', 'color', 'difficulty']
                                    }
                                ]
                            },
                            {
                                model: User,
                                as: 'trainer',
                                attributes: ['id', 'fullName']
                            }
                        ]
                    }
                ],
                order: [['classSchedule', 'date', 'DESC'], ['classSchedule', 'startTime', 'DESC']],
                limit: parseInt(limit),
                offset: offset,
                distinct: true
            });

            return {
                history: rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(count / parseInt(limit)),
                    totalItems: count,
                    itemsPerPage: parseInt(limit)
                }
            };
        } catch (error) {
            console.error('Error in getMemberClassHistory:', error);
            return {
                history: [],
                pagination: {
                    currentPage: parseInt(page || 1),
                    totalPages: 0,
                    totalItems: 0,
                    itemsPerPage: parseInt(limit || 20)
                },
                error: error.message
            };
        }
    }

    async getMemberClassStats(memberId, options = {}) {
        try {
            const {
                startDate,
                endDate,
                period = 'month'
            } = options;

            // Build date range
            let dateWhere = {};
            if (startDate && endDate) {
                dateWhere.date = {
                    [Op.between]: [startDate, endDate]
                };
            } else {
                // Default to last month if no date range specified
                const endDateDefault = new Date();
                const startDateDefault = new Date();
                
                if (period === 'year') {
                    startDateDefault.setFullYear(endDateDefault.getFullYear() - 1);
                } else if (period === 'quarter') {
                    startDateDefault.setMonth(endDateDefault.getMonth() - 3);
                } else { // month
                    startDateDefault.setMonth(endDateDefault.getMonth() - 1);
                }
                
                dateWhere.date = {
                    [Op.between]: [startDateDefault.toISOString().split('T')[0], endDateDefault.toISOString().split('T')[0]]
                };
            }

            // Get all enrollments for the member in the period
            const enrollments = await ClassEnrollment.findAll({
                where: { memberId },
                include: [
                    {
                        model: ClassSchedule,
                        as: 'classSchedule',
                        where: dateWhere,
                        required: true,
                        include: [
                            {
                                model: Class,
                                as: 'class',
                                attributes: ['id', 'name', 'price'],
                                include: [
                                    {
                                        model: ClassType,
                                        as: 'classType',
                                        attributes: ['id', 'name', 'color']
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });

            // Calculate statistics
            const totalClasses = enrollments.length;
            const attendedClasses = enrollments.filter(e => e.status === 'attended').length;
            const missedClasses = enrollments.filter(e => e.status === 'enrolled').length;
            const cancelledClasses = enrollments.filter(e => e.status === 'cancelled').length;
            
            // Calculate class types stats
            const classTypeStats = {};
            enrollments.forEach(enrollment => {
                const classType = enrollment.classSchedule?.class?.classType?.name || 'Unknown';
                if (!classTypeStats[classType]) {
                    classTypeStats[classType] = {
                        total: 0,
                        attended: 0,
                        missed: 0,
                        cancelled: 0
                    };
                }
                classTypeStats[classType].total++;
                
                if (enrollment.status === 'attended') {
                    classTypeStats[classType].attended++;
                } else if (enrollment.status === 'enrolled') {
                    classTypeStats[classType].missed++;
                } else if (enrollment.status === 'cancelled') {
                    classTypeStats[classType].cancelled++;
                }
            });

            // Calculate total cost
            const totalCost = enrollments.reduce((sum, enrollment) => {
                const price = parseFloat(enrollment.classSchedule?.class?.price || 0);
                return sum + price;
            }, 0);

            // Calculate attendance rate
            const attendanceRate = totalClasses > 0 ? ((attendedClasses / totalClasses) * 100).toFixed(2) : 0;

            return {
                summary: {
                    totalClasses,
                    attendedClasses,
                    missedClasses,
                    cancelledClasses,
                    attendanceRate: parseFloat(attendanceRate),
                    totalCost
                },
                classTypeStats,
                period: {
                    startDate: startDate || dateWhere.date[Op.between][0],
                    endDate: endDate || dateWhere.date[Op.between][1],
                    period
                }
            };
        } catch (error) {
            console.error('Error in getMemberClassStats:', error);
            return {
                summary: {
                    totalClasses: 0,
                    attendedClasses: 0,
                    missedClasses: 0,
                    cancelledClasses: 0,
                    attendanceRate: 0,
                    totalCost: 0
                },
                classTypeStats: {},
                period: { startDate: null, endDate: null, period },
                error: error.message
            };
        }
    }

    // ===== MEMBER CHECK-IN SERVICES =====

    async getMemberCheckIns(userId, options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                startDate,
                endDate
            } = options;

            const offset = (parseInt(page) - 1) * parseInt(limit);

            // First, find the member record for this user
            const member = await Member.findOne({
                where: { userId },
                attributes: ['id']
            });

            if (!member) {
                throw new Error('Member record not found for this user');
            }

            // Build where condition for schedules
            const scheduleWhere = {};
            
            if (startDate && endDate) {
                scheduleWhere.date = {
                    [Op.between]: [startDate, endDate]
                };
            } else if (startDate) {
                scheduleWhere.date = { [Op.gte]: startDate };
            } else if (endDate) {
                scheduleWhere.date = { [Op.lte]: endDate };
            }

            const { count, rows } = await ClassEnrollment.findAndCountAll({
                where: {
                    memberId: member.id,
                    checkinTime: { [Op.ne]: null }
                },
                include: [
                    {
                        model: ClassSchedule,
                        as: 'classSchedule',
                        where: scheduleWhere,
                        required: true,
                        include: [
                            {
                                model: Class,
                                as: 'class',
                                attributes: ['id', 'name', 'price'],
                                include: [
                                    {
                                        model: ClassType,
                                        as: 'classType',
                                        attributes: ['id', 'name', 'color']
                                    }
                                ]
                            },
                            {
                                model: User,
                                as: 'trainer',
                                attributes: ['id', 'fullName']
                            }
                        ]
                    }
                ],
                order: [['checkinTime', 'DESC']],
                limit: parseInt(limit),
                offset: offset,
                distinct: true
            });

            return {
                checkIns: rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(count / parseInt(limit)),
                    totalItems: count,
                    itemsPerPage: parseInt(limit)
                }
            };
        } catch (error) {
            console.error('Error in getMemberCheckIns:', error);
            return {
                checkIns: [],
                pagination: {
                    currentPage: parseInt(options.page || 1),
                    totalPages: 0,
                    totalItems: 0,
                    itemsPerPage: parseInt(options.limit || 20)
                },
                error: error.message
            };
        }
    }

    async getMemberTodaySchedules(userId, date) {
        try {
            // First, find the member record for this user
            const member = await Member.findOne({
                where: { userId },
                attributes: ['id']
            });

            if (!member) {
                throw new Error('Member record not found for this user');
            }

            // Get date range for today (start and end of day)
            const startOfDay = new Date(date + 'T00:00:00.000Z');
            const endOfDay = new Date(date + 'T23:59:59.999Z');

            // Get all enrollments for today
            const enrollments = await ClassEnrollment.findAll({
                where: { 
                    memberId: member.id,
                    status: { [Op.in]: ['enrolled', 'attended'] }
                },
                include: [
                    {
                        model: ClassSchedule,
                        as: 'classSchedule',
                        where: { 
                            startTime: {
                                [Op.between]: [startOfDay, endOfDay]
                            }
                        },
                        required: true,
                        include: [
                            {
                                model: Class,
                                as: 'class',
                                attributes: ['id', 'name', 'description', 'price'],
                                include: [
                                    {
                                        model: ClassType,
                                        as: 'classType',
                                        attributes: ['id', 'name', 'color', 'difficulty']
                                    }
                                ]
                            },
                            {
                                model: User,
                                as: 'trainer',
                                attributes: ['id', 'fullName']
                            }
                        ]
                    }
                ],
                order: [['classSchedule', 'startTime', 'ASC']]
            });

            // Transform data to include check-in status and timing info
            const schedules = enrollments.map(enrollment => {
                const schedule = enrollment.classSchedule;
                const now = new Date();
                const startTime = new Date(schedule.startTime);
                const endTime = new Date(schedule.endTime);
                
                // Check if can check in (15 minutes before to 30 minutes after start)
                const canCheckInStart = new Date(startTime.getTime() - 15 * 60 * 1000);
                const canCheckInEnd = new Date(startTime.getTime() + 30 * 60 * 1000);
                const canCheckIn = now >= canCheckInStart && now <= canCheckInEnd;
                
                return {
                    ...schedule.toJSON(),
                    enrollmentId: enrollment.id,
                    enrollmentStatus: enrollment.status,
                    checkinTime: enrollment.checkinTime,
                    canCheckIn,
                    isCheckedIn: !!enrollment.checkinTime,
                    timeToClass: startTime > now ? Math.ceil((startTime - now) / (1000 * 60)) : 0, // minutes until class
                    scheduleCode: `SCH${schedule.id.toString().padStart(6, '0')}` // Generate check-in code
                };
            });

            return schedules;
        } catch (error) {
            console.error('Error in getMemberTodaySchedules:', error);
            return [];
        }
    }

    async quickCheckIn(userId, options = {}) {
        try {
            const { scheduleCode, scheduleId } = options;
            let targetScheduleId = scheduleId;

            // If using schedule code, extract schedule ID
            if (scheduleCode && !scheduleId) {
                if (scheduleCode.startsWith('SCH')) {
                    targetScheduleId = parseInt(scheduleCode.substring(3));
                } else {
                    // Try to parse as direct ID
                    targetScheduleId = parseInt(scheduleCode);
                }
            }

            if (!targetScheduleId || isNaN(targetScheduleId)) {
                throw new Error('Mã lịch tập không hợp lệ');
            }

            // First, find the member record for this user
            const member = await Member.findOne({
                where: { userId },
                attributes: ['id']
            });

            if (!member) {
                throw new Error('Member record not found for this user');
            }

            // Check if member is enrolled in this schedule
            const enrollment = await ClassEnrollment.findOne({
                where: {
                    memberId: member.id,
                    classScheduleId: targetScheduleId,
                    status: { [Op.in]: ['enrolled', 'attended'] }
                },
                include: [
                    {
                        model: ClassSchedule,
                        as: 'classSchedule',
                        required: true,
                        include: [
                            {
                                model: Class,
                                as: 'class',
                                attributes: ['id', 'name']
                            }
                        ]
                    }
                ]
            });

            if (!enrollment) {
                throw new Error('Bạn chưa đăng ký lớp học này hoặc đã hủy đăng ký');
            }

            // Check if already checked in
            if (enrollment.checkinTime) {
                return {
                    enrollment,
                    message: 'Bạn đã check-in lớp học này rồi',
                    checkinTime: enrollment.checkinTime,
                    alreadyCheckedIn: true
                };
            }

            const schedule = enrollment.classSchedule;
            const now = new Date();
            const startTime = new Date(schedule.startTime);
            
            // Check timing - can check in 15 minutes before to 30 minutes after class starts
            const canCheckInStart = new Date(startTime.getTime() - 15 * 60 * 1000);
            const canCheckInEnd = new Date(startTime.getTime() + 30 * 60 * 1000);
            
            if (now < canCheckInStart) {
                const minutesToOpen = Math.ceil((canCheckInStart - now) / (1000 * 60));
                throw new Error(`Check-in sẽ mở sau ${minutesToOpen} phút (15 phút trước giờ học)`);
            }
            
            if (now > canCheckInEnd) {
                throw new Error('Đã quá thời gian check-in (30 phút sau giờ bắt đầu lớp)');
            }

            // Perform check-in
            enrollment.checkinTime = now;
            enrollment.status = 'attended';
            await enrollment.save();

            return {
                enrollment: await ClassEnrollment.findByPk(enrollment.id, {
                    include: [
                        {
                            model: ClassSchedule,
                            as: 'classSchedule',
                            include: [
                                {
                                    model: Class,
                                    as: 'class',
                                    attributes: ['id', 'name'],
                                    include: [
                                        {
                                            model: ClassType,
                                            as: 'classType',
                                            attributes: ['name', 'color']
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }),
                checkinTime: enrollment.checkinTime,
                message: `Check-in thành công vào lớp ${schedule.class.name}!`,
                alreadyCheckedIn: false
            };
        } catch (error) {
            console.error('Error in quickCheckIn:', error);
            throw error;
        }
    }
}

module.exports = new ClassService();