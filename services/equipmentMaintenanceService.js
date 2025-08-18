const { EquipmentMaintenance, Equipment, User } = require('../models');
const { Op } = require('sequelize');
const { NotFoundError, ValidationError, ConflictError } = require('../middleware/errorHandler');

const equipmentMaintenanceService = {
    // Create maintenance record
    async createMaintenance(maintenanceData) {
        try {
            // Check if equipment exists
            const equipment = await Equipment.findByPk(maintenanceData.equipmentId);
            if (!equipment) {
                throw new NotFoundError('Equipment not found');
            }

            // Check for existing similar maintenance (prevent duplicates)
            const existingMaintenance = await EquipmentMaintenance.findOne({
                where: {
                    equipmentId: maintenanceData.equipmentId,
                    maintenanceType: maintenanceData.maintenanceType,
                    status: { [Op.in]: ['scheduled', 'in_progress'] },
                    scheduledDate: maintenanceData.scheduledDate
                }
            });

            if (existingMaintenance) {
                throw new ConflictError(`Đã có lịch ${this.getMaintenanceTypeName(maintenanceData.maintenanceType)} cho thiết bị này vào ngày ${maintenanceData.scheduledDate}`);
            }

            // Check if assigned user exists (if provided)
            if (maintenanceData.assignedTo) {
                const user = await User.findByPk(maintenanceData.assignedTo);
                if (!user) {
                    throw new NotFoundError('Assigned user not found');
                }
                if (user.role !== 'admin' && user.role !== 'staff') {
                    throw new ValidationError('User must be admin or staff to be assigned maintenance');
                }
            }

            const maintenance = await EquipmentMaintenance.create(maintenanceData);
            
            // If this is a repair or emergency maintenance, update equipment status
            if (maintenanceData.maintenanceType === 'repair' || maintenanceData.maintenanceType === 'emergency') {
                await equipment.update({ status: 'maintenance' });
            }

            return await this.getMaintenanceById(maintenance.id);
        } catch (error) {
            if (error.name === 'SequelizeValidationError') {
                throw new ValidationError(error.message);
            }
            throw error;
        }
    },

    // Get all maintenance records with filtering and pagination
    async getAllMaintenance(filters = {}, pagination = {}) {
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = pagination;
        const offset = (page - 1) * limit;

        const where = {};
        
        // Apply filters
        if (filters.equipmentId) {
            where.equipmentId = filters.equipmentId;
        }
        
        if (filters.maintenanceType) {
            where.maintenanceType = filters.maintenanceType;
        }
        
        if (filters.status) {
            where.status = filters.status;
        }
        
        if (filters.priority) {
            where.priority = filters.priority;
        }
        
        if (filters.assignedTo) {
            where.assignedTo = filters.assignedTo;
        }
        
        if (filters.reportedBy) {
            where.reportedBy = filters.reportedBy;
        }
        
        if (filters.dateFrom) {
            where.scheduledDate = {
                [Op.gte]: filters.dateFrom
            };
        }
        
        if (filters.dateTo) {
            where.scheduledDate = {
                ...where.scheduledDate,
                [Op.lte]: filters.dateTo
            };
        }
        
        if (filters.overdue) {
            const today = new Date().toISOString().split('T')[0];
            where.scheduledDate = { [Op.lt]: today };
            where.status = { [Op.in]: ['scheduled', 'in_progress'] };
        }

        if (filters.search) {
            where[Op.or] = [
                { title: { [Op.iLike]: `%${filters.search}%` } },
                { description: { [Op.iLike]: `%${filters.search}%` } }
            ];
        }

        const { count, rows } = await EquipmentMaintenance.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [[sortBy, sortOrder.toUpperCase()]],
            include: [
                {
                    model: Equipment,
                    as: 'equipment',
                    attributes: ['id', 'name', 'equipmentCode', 'category', 'location']
                },
                {
                    model: User,
                    as: 'assignee',
                    attributes: ['id', 'fullName', 'email', 'phone'],
                    required: false
                },
                {
                    model: User,
                    as: 'reporter',
                    attributes: ['id', 'fullName', 'email', 'phone'],
                    required: false
                }
            ]
        });

        return {
            maintenance: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        };
    },

    // Get maintenance by ID
    async getMaintenanceById(id) {
        const maintenance = await EquipmentMaintenance.findByPk(id, {
            include: [
                {
                    model: Equipment,
                    as: 'equipment',
                    attributes: ['id', 'name', 'equipmentCode', 'category', 'location', 'status']
                },
                {
                    model: User,
                    as: 'assignee',
                    attributes: ['id', 'fullName', 'email', 'phone'],
                    required: false
                },
                {
                    model: User,
                    as: 'reporter',
                    attributes: ['id', 'fullName', 'email', 'phone'],
                    required: false
                }
            ]
        });

        if (!maintenance) {
            throw new NotFoundError('Maintenance record not found');
        }

        return maintenance;
    },

    // Update maintenance
    async updateMaintenance(id, updateData) {
        const maintenance = await EquipmentMaintenance.findByPk(id);
        if (!maintenance) {
            throw new NotFoundError('Maintenance record not found');
        }

        // If status is being changed to completed, update equipment maintenance date
        if (updateData.status === 'completed' && maintenance.status !== 'completed') {
            const equipment = await Equipment.findByPk(maintenance.equipmentId);
            if (equipment) {
                await equipment.updateMaintenance(updateData.completedDate || new Date().toISOString().split('T')[0]);
            }
        }

        await maintenance.update(updateData);
        return await this.getMaintenanceById(id);
    },

    // Delete maintenance
    async deleteMaintenance(id) {
        const maintenance = await EquipmentMaintenance.findByPk(id);
        if (!maintenance) {
            throw new NotFoundError('Maintenance record not found');
        }

        if (maintenance.status === 'in_progress') {
            throw new ValidationError('Cannot delete maintenance that is in progress');
        }

        await maintenance.destroy();
        return { message: 'Maintenance record deleted successfully' };
    },

    // Mark maintenance as completed
    async completeMaintenance(id, completionData) {
        const maintenance = await EquipmentMaintenance.findByPk(id);
        if (!maintenance) {
            throw new NotFoundError('Maintenance record not found');
        }

        if (maintenance.status === 'completed') {
            throw new ValidationError('Maintenance is already completed');
        }

        await maintenance.markCompleted(
            completionData.workPerformed,
            completionData.cost,
            completionData.actualDuration
        );

        // Update equipment status back to active if it was a repair
        if (maintenance.maintenanceType === 'repair' || maintenance.maintenanceType === 'emergency') {
            const equipment = await Equipment.findByPk(maintenance.equipmentId);
            if (equipment && equipment.status === 'maintenance') {
                await equipment.update({ status: 'active' });
            }
        }

        // Auto-schedule next maintenance for regular maintenance types
        if (maintenance.maintenanceType === 'daily_clean' || maintenance.maintenanceType === 'weekly_check' || maintenance.maintenanceType === 'monthly_maintenance') {
            try {
                await this.autoScheduleNextMaintenance(id);
                console.log(`✅ Auto-scheduled next ${maintenance.maintenanceType} for equipment ${maintenance.equipmentId}`);
            } catch (error) {
                console.warn(`⚠️ Could not auto-schedule next maintenance: ${error.message}`);
            }
        }

        return await this.getMaintenanceById(id);
    },

    // Mark maintenance as in progress
    async startMaintenance(id) {
        const maintenance = await EquipmentMaintenance.findByPk(id);
        if (!maintenance) {
            throw new NotFoundError('Maintenance record not found');
        }

        if (maintenance.status !== 'scheduled') {
            throw new ValidationError('Only scheduled maintenance can be started');
        }

        await maintenance.markInProgress();
        return await this.getMaintenanceById(id);
    },

    // Cancel maintenance
    async cancelMaintenance(id, reason) {
        const maintenance = await EquipmentMaintenance.findByPk(id);
        if (!maintenance) {
            throw new NotFoundError('Maintenance record not found');
        }

        if (maintenance.status === 'completed') {
            throw new ValidationError('Cannot cancel completed maintenance');
        }

        await maintenance.cancel(reason);

        // If equipment was in maintenance status, set it back to active
        if (maintenance.maintenanceType === 'repair' || maintenance.maintenanceType === 'emergency') {
            const equipment = await Equipment.findByPk(maintenance.equipmentId);
            if (equipment && equipment.status === 'maintenance') {
                await equipment.update({ status: 'active' });
            }
        }

        return await this.getMaintenanceById(id);
    },

    // Get overdue maintenance
    async getOverdueMaintenance() {
        return await EquipmentMaintenance.getOverdueMaintenance();
    },

    // Get upcoming maintenance
    async getUpcomingMaintenance(days = 7) {
        return await EquipmentMaintenance.getUpcomingMaintenance(days);
    },

    // Get maintenance statistics
    async getMaintenanceStats() {
        const totalMaintenance = await EquipmentMaintenance.count();
        
        const statusStats = await EquipmentMaintenance.findAll({
            attributes: [
                'status',
                [EquipmentMaintenance.sequelize.fn('COUNT', EquipmentMaintenance.sequelize.col('id')), 'count']
            ],
            group: ['status'],
            raw: true
        });

        const typeStats = await EquipmentMaintenance.findAll({
            attributes: [
                'maintenanceType',
                [EquipmentMaintenance.sequelize.fn('COUNT', EquipmentMaintenance.sequelize.col('id')), 'count']
            ],
            group: ['maintenanceType'],
            raw: true
        });

        const priorityStats = await EquipmentMaintenance.findAll({
            attributes: [
                'priority',
                [EquipmentMaintenance.sequelize.fn('COUNT', EquipmentMaintenance.sequelize.col('id')), 'count']
            ],
            group: ['priority'],
            raw: true
        });

        // Overdue maintenance count
        const overdue = await EquipmentMaintenance.count({
            where: {
                scheduledDate: { [Op.lt]: new Date().toISOString().split('T')[0] },
                status: { [Op.in]: ['scheduled', 'in_progress'] }
            }
        });

        // Upcoming maintenance (next 7 days)
        const today = new Date();
        const weekFromNow = new Date();
        weekFromNow.setDate(today.getDate() + 7);
        
        const upcoming = await EquipmentMaintenance.count({
            where: {
                scheduledDate: {
                    [Op.between]: [
                        today.toISOString().split('T')[0],
                        weekFromNow.toISOString().split('T')[0]
                    ]
                },
                status: 'scheduled'
            }
        });

        // Average completion time
        const completedMaintenance = await EquipmentMaintenance.findAll({
            where: {
                status: 'completed',
                actualDuration: { [Op.ne]: null }
            },
            attributes: ['actualDuration'],
            raw: true
        });

        const avgCompletionTime = completedMaintenance.length > 0
            ? completedMaintenance.reduce((sum, item) => sum + item.actualDuration, 0) / completedMaintenance.length
            : 0;

        return {
            totalMaintenance,
            statusStats,
            typeStats,
            priorityStats,
            overdue,
            upcoming,
            avgCompletionTime: Math.round(avgCompletionTime)
        };
    },

    // Create recurring maintenance
    async createRecurringMaintenance(equipmentId, maintenanceData) {
        const equipment = await Equipment.findByPk(equipmentId);
        if (!equipment) {
            throw new NotFoundError('Equipment not found');
        }

        if (!maintenanceData.recurringInterval) {
            throw new ValidationError('Recurring interval is required for recurring maintenance');
        }

        const maintenance = await this.createMaintenance({
            ...maintenanceData,
            equipmentId,
            isRecurring: true
        });

        return maintenance;
    },

    // Generate next recurring maintenance
    async generateNextRecurringMaintenance(maintenanceId) {
        const maintenance = await EquipmentMaintenance.findByPk(maintenanceId);
        if (!maintenance) {
            throw new NotFoundError('Maintenance record not found');
        }

        if (!maintenance.isRecurring || !maintenance.recurringInterval) {
            throw new ValidationError('Maintenance is not recurring');
        }

        const nextDate = new Date(maintenance.scheduledDate);
        nextDate.setDate(nextDate.getDate() + maintenance.recurringInterval);

        const nextMaintenance = await this.createMaintenance({
            equipmentId: maintenance.equipmentId,
            maintenanceType: maintenance.maintenanceType,
            priority: maintenance.priority,
            scheduledDate: nextDate.toISOString().split('T')[0],
            assignedTo: maintenance.assignedTo,
            title: maintenance.title,
            description: maintenance.description,
            estimatedDuration: maintenance.estimatedDuration,
            isRecurring: true,
            recurringInterval: maintenance.recurringInterval
        });

        return nextMaintenance;
    },

    // Helper function to get maintenance type name in Vietnamese
    getMaintenanceTypeName(type) {
        const names = {
            'daily_clean': 'Vệ sinh hàng ngày',
            'weekly_check': 'Kiểm tra hàng tuần',
            'monthly_maintenance': 'Bảo dưỡng hàng tháng',
            'repair': 'Sửa chữa',
            'replacement': 'Thay mới'
        };
        return names[type] || type;
    },

    // Get simple maintenance template based on equipment size and type
    getMaintenanceTemplate(equipment, maintenanceType) {
        // Determine equipment size automatically if not set
        const equipmentSize = equipment.equipmentSize || this.getEquipmentSize(equipment.category);
        
        const templates = {
            large: {
                daily_clean: {
                    title: `Vệ sinh hàng ngày - ${equipment.name}`,
                    description: 'Lau chùi bề mặt, khử trùng tay cầm, kiểm tra nhanh an toàn',
                    estimatedDuration: 10,
                    intervalDays: 1
                },
                weekly_check: {
                    title: `Kiểm tra hàng tuần - ${equipment.name}`,
                    description: 'Kiểm tra ốc vít, dây cáp, màn hình, các bộ phận chuyển động',
                    estimatedDuration: 30,
                    intervalDays: 7
                },
                monthly_maintenance: {
                    title: `Bảo dưỡng hàng tháng - ${equipment.name}`,
                    description: 'Tra dầu, cân chỉnh, kiểm tra hệ thống điện, thay thế phụ tung nếu cần',
                    estimatedDuration: 60,
                    intervalDays: 30
                },
                repair: {
                    title: `Sửa chữa - ${equipment.name}`,
                    description: 'Sửa chữa sự cố được báo cáo',
                    estimatedDuration: 90,
                    intervalDays: 0
                }
            },
            small: {
                daily_clean: {
                    title: `Vệ sinh - ${equipment.name}`,
                    description: 'Lau chùi và sắp xếp lại vị trí',
                    estimatedDuration: 5,
                    intervalDays: 1
                },
                weekly_check: {
                    title: `Kiểm tra tình trạng - ${equipment.name}`,
                    description: 'Kiểm tra độ mài mòn, tình trạng bề mặt',
                    estimatedDuration: 10,
                    intervalDays: 7
                },
                replacement: {
                    title: `Thay mới - ${equipment.name}`,
                    description: 'Thay thế thiết bị bị hỏng hoặc quá cũ',
                    estimatedDuration: 15,
                    intervalDays: 0
                }
            }
        };

        const sizeTemplates = templates[equipmentSize] || templates.large;
        return sizeTemplates[maintenanceType] || {
            title: `${this.getMaintenanceTypeName(maintenanceType)} - ${equipment.name}`,
            description: 'Thực hiện theo quy trình tiêu chuẩn',
            estimatedDuration: 30,
            intervalDays: 7
        };
    },

    // Auto-determine equipment size based on category
    getEquipmentSize(category) {
        const largeEquipment = ['cardio', 'strength', 'functional'];
        const smallEquipment = ['free_weights', 'accessories', 'other'];
        
        if (largeEquipment.includes(category)) {
            return 'large';
        } else if (smallEquipment.includes(category)) {
            return 'small';
        }
        return 'large'; // default
    },

    // Auto-create next maintenance when current one is completed
    async autoScheduleNextMaintenance(completedMaintenanceId) {
        const maintenance = await EquipmentMaintenance.findByPk(completedMaintenanceId, {
            include: [{ model: Equipment, as: 'equipment' }]
        });

        if (!maintenance || !maintenance.equipment) {
            return null;
        }

        const template = this.getMaintenanceTemplate(maintenance.equipment, maintenance.maintenanceType);
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + template.intervalDays);

        // Check if next maintenance already exists
        const existingNext = await EquipmentMaintenance.findOne({
            where: {
                equipmentId: maintenance.equipmentId,
                maintenanceType: maintenance.maintenanceType,
                status: 'scheduled',
                scheduledDate: nextDate.toISOString().split('T')[0]
            }
        });

        if (existingNext) {
            return existingNext; // Already scheduled
        }

        // Create next maintenance
        const nextMaintenance = await this.createMaintenance({
            equipmentId: maintenance.equipmentId,
            maintenanceType: maintenance.maintenanceType,
            priority: maintenance.priority,
            scheduledDate: nextDate.toISOString().split('T')[0],
            assignedTo: maintenance.assignedTo,
            title: template.title,
            description: template.description,
            estimatedDuration: template.estimatedDuration,
            notes: `Tự động tạo sau khi hoàn thành: ${maintenance.title}`
        });

        return nextMaintenance;
    }
};

module.exports = equipmentMaintenanceService;