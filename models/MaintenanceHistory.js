const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MaintenanceHistory = sequelize.define('MaintenanceHistory', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    equipmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'equipment_id',
        references: {
            model: 'equipment',
            key: 'id'
        }
    },
    maintenanceId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'maintenance_id',
        references: {
            model: 'equipment_maintenance',
            key: 'id'
        },
        comment: 'Liên kết đến bản ghi maintenance gốc'
    },
    scheduleId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'schedule_id',
        references: {
            model: 'maintenance_schedules',
            key: 'id'
        },
        comment: 'Liên kết đến lịch bảo trì tự động'
    },
    maintenanceType: {
        type: DataTypes.ENUM('daily_clean', 'weekly_check', 'monthly_maintenance', 'repair', 'replacement'),
        allowNull: false,
        field: 'maintenance_type'
    },
    performedDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'performed_date',
        comment: 'Ngày thực hiện bảo trì'
    },
    performedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'performed_by',
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'Người thực hiện bảo trì'
    },
    duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Thời gian thực hiện (phút)'
    },
    workPerformed: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'work_performed',
        comment: 'Mô tả công việc đã thực hiện'
    },
    issuesFound: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'issues_found',
        comment: 'Các vấn đề phát hiện trong quá trình bảo trì'
    },
    partsReplaced: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'parts_replaced',
        comment: 'Danh sách linh kiện đã thay thế (JSON array)'
    },
    cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Chi phí bảo trì'
    },
    equipmentConditionBefore: {
        type: DataTypes.ENUM('excellent', 'good', 'fair', 'poor'),
        allowNull: true,
        field: 'equipment_condition_before',
        comment: 'Tình trạng thiết bị trước khi bảo trì'
    },
    equipmentConditionAfter: {
        type: DataTypes.ENUM('excellent', 'good', 'fair', 'poor'),
        allowNull: false,
        field: 'equipment_condition_after',
        comment: 'Tình trạng thiết bị sau khi bảo trì'
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium',
        comment: 'Mức độ ưu tiên của công việc bảo trì'
    },
    result: {
        type: DataTypes.ENUM('completed', 'partial', 'failed', 'cancelled'),
        allowNull: false,
        defaultValue: 'completed',
        comment: 'Kết quả thực hiện bảo trì'
    },
    nextMaintenanceRecommended: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'next_maintenance_recommended',
        comment: 'Ngày bảo trì tiếp theo được đề xuất'
    },
    photos: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Hình ảnh trước/sau bảo trì (JSON array of URLs)'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Ghi chú thêm'
    },
    qualityRating: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'quality_rating',
        validate: {
            min: 1,
            max: 5
        },
        comment: 'Đánh giá chất lượng bảo trì (1-5 sao)'
    },
    isWarrantyWork: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_warranty_work',
        comment: 'Có phải công việc trong thời gian bảo hành không'
    }
}, {
    tableName: 'maintenance_history',
    timestamps: true,
    underscored: true
});

// Static methods for analytics
MaintenanceHistory.getMaintenanceStats = async function(equipmentId = null, startDate = null, endDate = null) {
    const whereClause = {};
    
    if (equipmentId) {
        whereClause.equipmentId = equipmentId;
    }
    
    if (startDate && endDate) {
        whereClause.performedDate = {
            [require('sequelize').Op.between]: [startDate, endDate]
        };
    }
    
    const stats = await this.findAll({
        where: whereClause,
        attributes: [
            'maintenanceType',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            [sequelize.fn('AVG', sequelize.col('cost')), 'avgCost'],
            [sequelize.fn('SUM', sequelize.col('cost')), 'totalCost'],
            [sequelize.fn('AVG', sequelize.col('duration')), 'avgDuration']
        ],
        group: ['maintenanceType'],
        raw: true
    });
    
    return stats;
};

MaintenanceHistory.getCostAnalysis = async function(period = 'month') {
    let dateFormat;
    switch (period) {
        case 'day':
            dateFormat = '%Y-%m-%d';
            break;
        case 'week':
            dateFormat = '%Y-%u';
            break;
        case 'month':
            dateFormat = '%Y-%m';
            break;
        case 'year':
            dateFormat = '%Y';
            break;
        default:
            dateFormat = '%Y-%m';
    }
    
    const analysis = await this.findAll({
        attributes: [
            [sequelize.fn('DATE_FORMAT', sequelize.col('performed_date'), dateFormat), 'period'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'maintenanceCount'],
            [sequelize.fn('SUM', sequelize.col('cost')), 'totalCost'],
            [sequelize.fn('AVG', sequelize.col('cost')), 'avgCost']
        ],
        group: [sequelize.fn('DATE_FORMAT', sequelize.col('performed_date'), dateFormat)],
        order: [[sequelize.fn('DATE_FORMAT', sequelize.col('performed_date'), dateFormat), 'DESC']],
        raw: true
    });
    
    return analysis;
};

MaintenanceHistory.getEquipmentReliability = async function() {
    const reliability = await this.findAll({
        attributes: [
            'equipmentId',
            [sequelize.fn('COUNT', sequelize.col('id')), 'maintenanceCount'],
            [sequelize.fn('COUNT', sequelize.literal("CASE WHEN maintenance_type = 'repair' THEN 1 END")), 'repairCount'],
            [sequelize.fn('SUM', sequelize.col('cost')), 'totalCost'],
            [sequelize.fn('AVG', sequelize.col('quality_rating')), 'avgQuality']
        ],
        include: [{
            model: require('./Equipment'),
            as: 'equipment',
            attributes: ['name', 'category', 'priority', 'purchaseDate']
        }],
        group: ['equipmentId'],
        order: [[sequelize.fn('COUNT', sequelize.literal("CASE WHEN maintenance_type = 'repair' THEN 1 END")), 'DESC']],
        raw: true
    });
    
    return reliability;
};

// Instance methods
MaintenanceHistory.prototype.calculateEfficiency = function() {
    if (!this.duration || this.duration <= 0) return null;
    
    // Base efficiency calculation (simple scoring system)
    let efficiency = 100;
    
    // Deduct points for longer duration
    const expectedDuration = this.getExpectedDuration();
    if (this.duration > expectedDuration) {
        efficiency -= Math.min(30, (this.duration - expectedDuration) / expectedDuration * 100);
    }
    
    // Adjust for result
    switch (this.result) {
        case 'completed':
            break;
        case 'partial':
            efficiency -= 20;
            break;
        case 'failed':
            efficiency -= 50;
            break;
        case 'cancelled':
            efficiency = 0;
            break;
    }
    
    // Adjust for quality rating
    if (this.qualityRating) {
        efficiency = efficiency * (this.qualityRating / 5);
    }
    
    return Math.max(0, Math.round(efficiency));
};

MaintenanceHistory.prototype.getExpectedDuration = function() {
    const expectedDurations = {
        'daily_clean': 15,
        'weekly_check': 30,
        'monthly_maintenance': 60,
        'repair': 120,
        'replacement': 180
    };
    
    return expectedDurations[this.maintenanceType] || 60;
};

MaintenanceHistory.prototype.wasOnTime = function() {
    if (!this.scheduleId) return null; // Manual maintenance
    
    // This would need to be checked against the original scheduled date
    // For now, return true if result is completed
    return this.result === 'completed';
};

MaintenanceHistory.prototype.getCostEffectiveness = function() {
    if (this.cost <= 0) return 'excellent';
    
    const avgCosts = {
        'daily_clean': 50000,      // 50k VND
        'weekly_check': 100000,    // 100k VND
        'monthly_maintenance': 300000, // 300k VND
        'repair': 500000,          // 500k VND
        'replacement': 2000000     // 2M VND
    };
    
    const expectedCost = avgCosts[this.maintenanceType] || 200000;
    const ratio = this.cost / expectedCost;
    
    if (ratio <= 0.7) return 'excellent';
    if (ratio <= 1.0) return 'good';
    if (ratio <= 1.5) return 'fair';
    return 'poor';
};

module.exports = MaintenanceHistory;