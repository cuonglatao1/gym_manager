const { Equipment, EquipmentMaintenance, User } = require('../models');
const { Op } = require('sequelize');
const { NotFoundError, ValidationError, ConflictError } = require('../middleware/errorHandler');

const equipmentService = {
    // Create equipment
    async createEquipment(equipmentData) {
        try {
            // Check if equipment with same serial number exists (if provided and not empty)
            if (equipmentData.serialNumber && equipmentData.serialNumber.trim() !== '') {
                const existingEquipment = await Equipment.findOne({
                    where: { serialNumber: equipmentData.serialNumber.trim() }
                });
                if (existingEquipment) {
                    throw new ConflictError('Equipment with this serial number already exists');
                }
            } else {
                // Remove empty serial number
                equipmentData.serialNumber = null;
            }

            // Generate equipment code if not provided
            if (!equipmentData.equipmentCode) {
                equipmentData.equipmentCode = await this.generateEquipmentCode(equipmentData.category);
            }

            const equipment = await Equipment.create(equipmentData);
            
            // Auto-create maintenance schedules for the new equipment
            try {
                await this.createAutoMaintenanceSchedules(equipment);
                console.log(`✅ Auto-created maintenance schedules for equipment: ${equipment.equipmentCode}`);
            } catch (error) {
                console.warn(`⚠️ Could not create auto maintenance for ${equipment.equipmentCode}:`, error.message);
            }
            
            return equipment;
        } catch (error) {
            if (error.name === 'SequelizeValidationError') {
                throw new ValidationError(error.message);
            }
            throw error;
        }
    },

    // Get all equipment with filtering and pagination
    async getAllEquipment(filters = {}, pagination = {}) {
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = pagination;
        const offset = (page - 1) * limit;

        const where = {};
        
        // Apply filters
        if (filters.category) {
            where.category = filters.category;
        }
        
        if (filters.priority) {
            where.priority = filters.priority;
        }
        
        if (filters.condition) {
            where.condition = filters.condition;
        }
        
        if (filters.location) {
            where.location = { [Op.iLike]: `%${filters.location}%` };
        }
        
        if (filters.brand) {
            where.brand = { [Op.iLike]: `%${filters.brand}%` };
        }
        
        if (filters.search) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${filters.search}%` } },
                { equipmentCode: { [Op.iLike]: `%${filters.search}%` } },
                { brand: { [Op.iLike]: `%${filters.search}%` } },
                { model: { [Op.iLike]: `%${filters.search}%` } }
            ];
        }

        if (filters.maintenanceDue) {
            const today = new Date().toISOString().split('T')[0];
            where.nextMaintenanceDate = { [Op.lte]: today };
        }

        const { count, rows } = await Equipment.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [[sortBy, sortOrder.toUpperCase()]],
            include: [
                {
                    model: EquipmentMaintenance,
                    as: 'maintenanceRecords',
                    limit: 5,
                    order: [['createdAt', 'DESC']],
                    required: false
                }
            ]
        });

        return {
            equipment: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        };
    },

    // Get equipment by ID
    async getEquipmentById(id) {
        const equipment = await Equipment.findByPk(id, {
            include: [
                {
                    model: EquipmentMaintenance,
                    as: 'maintenanceRecords',
                    include: [
                        { model: User, as: 'assignee', attributes: ['id', 'fullName', 'email'] },
                        { model: User, as: 'reporter', attributes: ['id', 'fullName', 'email'] }
                    ],
                    order: [['createdAt', 'DESC']]
                }
            ]
        });

        if (!equipment) {
            throw new NotFoundError('Equipment not found');
        }

        return equipment;
    },

    // Update equipment
    async updateEquipment(id, updateData) {
        const equipment = await Equipment.findByPk(id);
        if (!equipment) {
            throw new NotFoundError('Equipment not found');
        }

        // Check if serial number is being changed and if it conflicts
        if (updateData.serialNumber && updateData.serialNumber !== equipment.serialNumber) {
            const existingEquipment = await Equipment.findOne({
                where: { 
                    serialNumber: updateData.serialNumber,
                    id: { [Op.ne]: id }
                }
            });
            if (existingEquipment) {
                throw new ConflictError('Equipment with this serial number already exists');
            }
        }

        await equipment.update(updateData);
        return equipment;
    },

    // Delete equipment
    async deleteEquipment(id) {
        const equipment = await Equipment.findByPk(id);
        if (!equipment) {
            throw new NotFoundError('Equipment not found');
        }

        // Check if equipment has any pending maintenance
        const pendingMaintenance = await EquipmentMaintenance.findOne({
            where: {
                equipmentId: id,
                status: { [Op.in]: ['scheduled', 'in_progress'] }
            }
        });

        if (pendingMaintenance) {
            throw new ValidationError('Cannot delete equipment with pending maintenance');
        }

        await equipment.destroy();
        return { message: 'Equipment deleted successfully' };
    },

    // Get equipment statistics
    async getEquipmentStats() {
        const totalEquipment = await Equipment.count();
        
        const statusStats = await Equipment.findAll({
            attributes: [
                'status',
                [Equipment.sequelize.fn('COUNT', Equipment.sequelize.col('id')), 'count']
            ],
            group: ['status'],
            raw: true
        });

        const categoryStats = await Equipment.findAll({
            attributes: [
                'category',
                [Equipment.sequelize.fn('COUNT', Equipment.sequelize.col('id')), 'count']
            ],
            group: ['category'],
            raw: true
        });

        const conditionStats = await Equipment.findAll({
            attributes: [
                'condition',
                [Equipment.sequelize.fn('COUNT', Equipment.sequelize.col('id')), 'count']
            ],
            group: ['condition'],
            raw: true
        });

        // Equipment requiring maintenance
        const today = new Date().toISOString().split('T')[0];
        const maintenanceDue = await Equipment.count({
            where: {
                nextMaintenanceDate: { [Op.lte]: today },
                status: { [Op.ne]: 'retired' }
            }
        });

        // Most used equipment
        const mostUsed = await Equipment.findAll({
            attributes: ['id', 'name', 'equipmentCode', 'usageCount'],
            order: [['usageCount', 'DESC']],
            limit: 10
        });

        return {
            totalEquipment,
            statusStats,
            categoryStats,
            conditionStats,
            maintenanceDue,
            mostUsed
        };
    },

    // Get equipment requiring maintenance
    async getMaintenanceDueEquipment() {
        const today = new Date().toISOString().split('T')[0];
        
        return await Equipment.findAll({
            where: {
                nextMaintenanceDate: { [Op.lte]: today },
                status: { [Op.ne]: 'retired' }
            },
            order: [['nextMaintenanceDate', 'ASC']]
        });
    },

    // Increment equipment usage
    async incrementUsage(id) {
        const equipment = await Equipment.findByPk(id);
        if (!equipment) {
            throw new NotFoundError('Equipment not found');
        }

        if (equipment.status !== 'active') {
            throw new ValidationError('Cannot use equipment that is not active');
        }

        await equipment.incrementUsage();
        return equipment;
    },

    // Check equipment code exists
    async checkEquipmentCodeExists(equipmentCode) {
        const equipment = await Equipment.findOne({
            where: { equipmentCode }
        });
        return !!equipment;
    },

    // Check serial number exists
    async checkSerialNumberExists(serialNumber) {
        const equipment = await Equipment.findOne({
            where: { serialNumber }
        });
        return !!equipment;
    },

    // Generate equipment code
    async generateEquipmentCode(category) {
        const categoryPrefix = {
            'cardio': 'CD',
            'strength': 'ST',
            'functional': 'FN',
            'free_weights': 'FW',
            'accessories': 'AC',
            'other': 'EQ'
        };
        
        const prefix = categoryPrefix[category] || 'EQ';
        const year = new Date().getFullYear().toString().slice(-2);
        
        // Find highest existing number for this category and year
        const existingCodes = await Equipment.findAll({
            where: {
                equipmentCode: {
                    [Op.like]: `${prefix}${year}%`
                }
            },
            attributes: ['equipmentCode'],
            order: [['equipmentCode', 'DESC']]
        });
        
        let nextNumber = 1;
        if (existingCodes.length > 0) {
            const lastCode = existingCodes[0].equipmentCode;
            const lastNumber = parseInt(lastCode.slice(-3)); // Get last 3 digits
            nextNumber = lastNumber + 1;
        }
        
        const numberStr = nextNumber.toString().padStart(3, '0');
        return `${prefix}${year}${numberStr}`;
    },

    // Auto-create maintenance schedules for new equipment
    async createAutoMaintenanceSchedules(equipment) {
        const { EquipmentMaintenance } = require('../models');
        
        // Define maintenance frequency based on priority
        const maintenanceFrequency = {
            high: {
                daily_clean: 1,    // Mỗi ngày
                weekly_check: 7,   // Mỗi 7 ngày  
                monthly_maintenance: 30  // Mỗi 30 ngày
            },
            medium: {
                daily_clean: 3,    // Mỗi 3 ngày
                weekly_check: 14,  // Mỗi 14 ngày
                monthly_maintenance: 60  // Mỗi 60 ngày
            },
            low: {
                daily_clean: 7,    // Mỗi 7 ngày
                weekly_check: 30,  // Mỗi 30 ngày
                monthly_maintenance: 90  // Mỗi 90 ngày
            }
        };
        
        const frequency = maintenanceFrequency[equipment.priority] || maintenanceFrequency.medium;
        const today = new Date();
        const createdSchedules = [];
        
        // Create 3 initial maintenance schedules (1 for each type)
        const scheduleTypes = [
            { type: 'daily_clean', name: 'Vệ sinh', interval: frequency.daily_clean },
            { type: 'weekly_check', name: 'Kiểm tra', interval: frequency.weekly_check },
            { type: 'monthly_maintenance', name: 'Bảo dưỡng', interval: frequency.monthly_maintenance }
        ];
        
        for (const scheduleType of scheduleTypes) {
            let scheduleDate = new Date(today);
            scheduleDate.setDate(scheduleDate.getDate() + scheduleType.interval);
            
            try {
                const maintenance = await EquipmentMaintenance.create({
                    equipmentId: equipment.id,
                    maintenanceType: scheduleType.type,
                    status: 'scheduled',
                    priority: equipment.priority,
                    scheduledDate: scheduleDate.toISOString().split('T')[0],
                    title: `${scheduleType.name} - ${equipment.name}`,
                    description: this.getMaintenanceDescription(scheduleType.type, equipment),
                    estimatedDuration: this.getEstimatedDuration(scheduleType.type, equipment.priority),
                    notes: `Tự động tạo khi thêm thiết bị ${equipment.equipmentCode}`
                });
                
                createdSchedules.push(maintenance);
            } catch (error) {
                console.warn(`⚠️ Could not create ${scheduleType.type} schedule for ${equipment.equipmentCode}:`, error.message);
            }
        }
        
        console.log(`✅ Created ${createdSchedules.length} maintenance schedules for equipment ${equipment.equipmentCode}`);
        return createdSchedules;
    },

    // Get maintenance description based on type and equipment
    getMaintenanceDescription(type, equipment) {
        const descriptions = {
            daily_clean: `Vệ sinh ${equipment.name}: Lau chùi bề mặt, khử trùng tay cầm và các điểm tiếp xúc`,
            weekly_check: `Kiểm tra ${equipment.name}: Kiểm tra ốc vít, dây cáp, các bộ phận chuyển động`,
            monthly_maintenance: `Bảo dưỡng ${equipment.name}: Tra dầu, cân chỉnh, kiểm tra hệ thống, thay thế phụ tùng nếu cần`
        };
        
        return descriptions[type] || `Bảo trì ${equipment.name} theo quy trình chuẩn`;
    },

    // Get estimated duration based on type and priority
    getEstimatedDuration(type, priority) {
        const baseDuration = {
            daily_clean: { high: 15, medium: 10, low: 5 },
            weekly_check: { high: 45, medium: 30, low: 20 },
            monthly_maintenance: { high: 90, medium: 60, low: 45 }
        };
        
        return baseDuration[type] ? baseDuration[type][priority] || 30 : 30;
    }
};

module.exports = equipmentService;