const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EquipmentMaintenance = sequelize.define('EquipmentMaintenance', {
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
    maintenanceType: {
        type: DataTypes.ENUM('daily_clean', 'weekly_check', 'monthly_maintenance', 'repair', 'replacement'),
        allowNull: false,
        field: 'maintenance_type',
        defaultValue: 'daily_clean',
        comment: 'daily_clean: vệ sinh hàng ngày; weekly_check: kiểm tra hàng tuần; monthly_maintenance: bảo dưỡng hàng tháng; repair: sửa chữa; replacement: thay mới'
    },
    status: {
        type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'scheduled'
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium'
    },
    scheduledDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'scheduled_date'
    },
    completedDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'completed_date'
    },
    assignedTo: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'assigned_to',
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'Staff/technician assigned to perform maintenance'
    },
    reportedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'reported_by',
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'User who reported the issue'
    },
    title: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    issueDetails: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'issue_details',
        comment: 'Detailed description of the problem or maintenance need'
    },
    workPerformed: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'work_performed',
        comment: 'Description of work completed'
    },
    partsUsed: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'parts_used',
        comment: 'JSON array of parts used in maintenance'
    },
    cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Cost of maintenance including parts and labor'
    },
    estimatedDuration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'estimated_duration',
        comment: 'Estimated duration in minutes'
    },
    actualDuration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'actual_duration',
        comment: 'Actual duration in minutes'
    },
    nextMaintenanceDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'next_maintenance_date',
        comment: 'Suggested next maintenance date'
    },
    photos: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'JSON array of photo URLs before/after maintenance'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    isRecurring: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_recurring',
        comment: 'Whether this is a recurring maintenance'
    },
    recurringInterval: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'recurring_interval',
        comment: 'Interval in days for recurring maintenance'
    }
}, {
    tableName: 'equipment_maintenance',
    timestamps: true,
    underscored: true
});

// Hooks
EquipmentMaintenance.beforeUpdate(async (maintenance) => {
    // Auto-set completed date when status changes to completed
    if (maintenance.changed('status') && maintenance.status === 'completed' && !maintenance.completedDate) {
        maintenance.completedDate = new Date().toISOString().split('T')[0];
    }
});

// Instance methods
EquipmentMaintenance.prototype.markCompleted = async function(workPerformed = null, cost = null, actualDuration = null) {
    const updateData = {
        status: 'completed',
        completedDate: new Date().toISOString().split('T')[0]
    };
    
    if (workPerformed) updateData.workPerformed = workPerformed;
    if (cost !== null) updateData.cost = cost;
    if (actualDuration !== null) updateData.actualDuration = actualDuration;
    
    await this.update(updateData);
    return this;
};

EquipmentMaintenance.prototype.markInProgress = async function() {
    await this.update({ status: 'in_progress' });
    return this;
};

EquipmentMaintenance.prototype.cancel = async function(reason = null) {
    const updateData = { status: 'cancelled' };
    if (reason) {
        updateData.notes = (this.notes || '') + '\nCancellation reason: ' + reason;
    }
    
    await this.update(updateData);
    return this;
};

EquipmentMaintenance.prototype.isOverdue = function() {
    if (this.status === 'completed' || this.status === 'cancelled') return false;
    return new Date(this.scheduledDate) < new Date();
};

EquipmentMaintenance.prototype.getDaysOverdue = function() {
    if (!this.isOverdue()) return 0;
    const today = new Date();
    const scheduled = new Date(this.scheduledDate);
    return Math.floor((today - scheduled) / (1000 * 60 * 60 * 24));
};

// Static methods
EquipmentMaintenance.getOverdueMaintenance = async function() {
    const today = new Date().toISOString().split('T')[0];
    return await this.findAll({
        where: {
            scheduledDate: {
                [require('sequelize').Op.lt]: today
            },
            status: {
                [require('sequelize').Op.in]: ['scheduled', 'in_progress']
            }
        },
        order: [['scheduledDate', 'ASC']]
    });
};

EquipmentMaintenance.getUpcomingMaintenance = async function(days = 7) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);
    
    return await this.findAll({
        where: {
            scheduledDate: {
                [require('sequelize').Op.between]: [
                    today.toISOString().split('T')[0],
                    futureDate.toISOString().split('T')[0]
                ]
            },
            status: 'scheduled'
        },
        order: [['scheduledDate', 'ASC']]
    });
};

module.exports = EquipmentMaintenance;