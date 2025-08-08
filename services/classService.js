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

    async getAllClassTypes(isActive = 'all') {
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
            duration,
            maxParticipants: maxParticipants || 10,
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

        // Check if class type is being used
        const classCount = await Class.count({
            where: { classTypeId: id }
        });

        if (classCount > 0) {
            // Don't delete, just deactivate
            await classType.update({ isActive: false });
            return {
                deleted: false,
                message: 'Đã vô hiệu hóa loại lớp (không thể xóa vì đã có lớp sử dụng)'
            };
        }

        await classType.destroy();
        return {
            deleted: true,
            message: 'Xóa loại lớp thành công'
        };
    }

    // ===== CLASS SERVICES =====

    async getAllClasses(options = {}) {
        const {
            page = 1,
            limit = 10,
            classTypeId,
            trainerId,
            isActive = 'all',
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
        const classInfo = await Class.findByPk(id, {
            include: [
                {
                    model: ClassType,
                    as: 'classType'
                },
                {
                    model: User,
                    as: 'trainer',
                    attributes: ['id', 'fullName', 'email', 'phone']
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

        // Check if class has schedules
        const scheduleCount = await ClassSchedule.count({
            where: { classId: id }
        });

        if (scheduleCount > 0) {
            // Don't delete, just deactivate
            await classInfo.update({ isActive: false });
            return {
                deleted: false,
                message: 'Đã vô hiệu hóa lớp học (không thể xóa vì đã có lịch)'
            };
        }

        await classInfo.destroy();
        return {
            deleted: true,
            message: 'Xóa lớp học thành công'
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

        const { count, rows } = await ClassSchedule.findAndCountAll({
            where: whereCondition,
            include: [
                {
                    model: Class,
                    as: 'class',
                    include: [
                        {
                            model: ClassType,
                            as: 'classType',
                            attributes: ['id', 'name', 'difficulty', 'color']
                        }
                    ]
                },
                {
                    model: User,
                    as: 'trainer',
                    attributes: ['id', 'fullName', 'email']
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
    }

    async getScheduleById(id) {
        const schedule = await ClassSchedule.findByPk(id, {
            include: [
                {
                    model: Class,
                    as: 'class',
                    include: [
                        {
                            model: ClassType,
                            as: 'classType'
                        }
                    ]
                },
                {
                    model: User,
                    as: 'trainer',
                    attributes: ['id', 'fullName', 'email', 'phone']
                },
                {
                    model: ClassEnrollment,
                    as: 'enrollments',
                    include: [
                        {
                            model: Member,
                            as: 'member',
                            attributes: ['id', 'memberCode', 'fullName', 'phone']
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

        // Check for trainer schedule conflict
        const conflictingSchedule = await ClassSchedule.findOne({
            where: {
                trainerId,
                date,
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

        const schedule = await ClassSchedule.create({
            classId,
            date,
            startTime,
            endTime,
            trainerId,
            maxParticipants: maxParticipants || classInfo.maxParticipants,
            room: room || classInfo.room
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

        // If updating time, check for conflicts
        if (updateData.startTime || updateData.endTime || updateData.trainerId) {
            const startTime = updateData.startTime || schedule.startTime;
            const endTime = updateData.endTime || schedule.endTime;
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

        await schedule.update(updateData);
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
        
        if (!member) {
            throw new Error('Không tìm thấy thông tin hội viên');
        }

        // Get schedule
        const schedule = await this.getScheduleById(scheduleId);

        // Check if enrollment is open
        if (!schedule.isEnrollmentOpen()) {
            throw new Error('Không thể đăng ký lớp này');
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

        return ClassEnrollment.findByPk(enrollment.id, {
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

    async checkInToClass(scheduleId, userId) {
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
        if (!schedule.canCheckIn()) {
            throw new Error('Chưa đến giờ check-in hoặc đã quá giờ');
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
        return ClassEnrollment.findAll({
            where: { classScheduleId: scheduleId },
            include: [
                {
                    model: Member,
                    as: 'member',
                    attributes: ['id', 'memberCode', 'fullName', 'phone']
                }
            ],
            order: [['enrollmentDate', 'ASC']]
        });
    }

    // ===== ANALYTICS SERVICES =====

    async getPopularClasses(limit = 10) {
        return Class.findAll({
            attributes: [
                'id',
                'name',
                [
                    require('sequelize').fn('COUNT', require('sequelize').col('schedules.enrollments.id')),
                    'enrollmentCount'
                ]
            ],
            include: [
                {
                    model: ClassType,
                    as: 'classType',
                    attributes: ['name', 'difficulty']
                },
                {
                    model: ClassSchedule,
                    as: 'schedules',
                    attributes: [],
                    include: [
                        {
                            model: ClassEnrollment,
                            as: 'enrollments',
                            attributes: [],
                            where: { status: { [Op.in]: ['enrolled', 'attended'] } },
                            required: false
                        }
                    ]
                }
            ],
            group: ['Class.id', 'classType.id'],
            order: [[require('sequelize').fn('COUNT', require('sequelize').col('schedules.enrollments.id')), 'DESC']],
            limit: parseInt(limit)
        });
    }

    async getClassRevenue(startDate = null, endDate = null) {
        const whereCondition = {};
        
        if (startDate && endDate) {
            whereCondition.date = {
                [Op.between]: [startDate, endDate]
            };
        }

        return ClassSchedule.findAll({
            attributes: [
                [require('sequelize').fn('COUNT', require('sequelize').col('enrollments.id')), 'totalEnrollments'],
                [require('sequelize').fn('SUM', require('sequelize').col('class.price')), 'totalRevenue']
            ],
            include: [
                {
                    model: Class,
                    as: 'class',
                    attributes: ['name', 'price']
                },
                {
                    model: ClassEnrollment,
                    as: 'enrollments',
                    attributes: [],
                    where: { status: { [Op.in]: ['enrolled', 'attended'] } },
                    required: false
                }
            ],
            where: whereCondition,
            group: ['class.id', 'class.name', 'class.price'],
            order: [[require('sequelize').fn('SUM', require('sequelize').col('class.price')), 'DESC']]
        });
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
        // Get member from userId
        const member = await Member.findOne({ where: { userId } });
        if (!member) {
            return [];
        }

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
                    include: [
                        {
                            model: Class,
                            as: 'class',
                            include: [
                                { model: ClassType, as: 'classType' }
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
            order: [[{ model: ClassSchedule, as: 'classSchedule' }, 'startTime', 'ASC']],
            limit: parseInt(limit)
        });
    }

    async getUserClassHistory(userId, options = {}) {
        const { page = 1, limit = 10 } = options;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Get member from userId
        const member = await Member.findOne({ where: { userId } });
        if (!member) {
            return {
                enrollments: [],
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: 0,
                    totalItems: 0,
                    itemsPerPage: parseInt(limit)
                }
            };
        }

        const { count, rows } = await ClassEnrollment.findAndCountAll({
            where: {
                memberId: member.id
            },
            include: [
                {
                    model: ClassSchedule,
                    as: 'classSchedule',
                    include: [
                        {
                            model: Class,
                            as: 'class',
                            include: [
                                { model: ClassType, as: 'classType' }
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
            order: [[{ model: ClassSchedule, as: 'classSchedule' }, 'startTime', 'DESC']],
            limit: parseInt(limit),
            offset: offset,
            distinct: true
        });

        return {
            enrollments: rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(count / parseInt(limit)),
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        };
    }

    async getTrainerSchedules(trainerId, options = {}) {
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

        const { count, rows } = await ClassSchedule.findAndCountAll({
            where: whereCondition,
            include: [
                {
                    model: Class,
                    as: 'class',
                    include: [
                        {
                            model: ClassType,
                            as: 'classType',
                            attributes: ['id', 'name', 'difficulty', 'color']
                        }
                    ]
                },
                {
                    model: ClassEnrollment,
                    as: 'enrollments',
                    include: [
                        {
                            model: Member,
                            as: 'member',
                            attributes: ['id', 'memberCode', 'fullName']
                        }
                    ]
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
    }
}

module.exports = new ClassService();