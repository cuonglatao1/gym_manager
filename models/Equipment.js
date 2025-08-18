const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Equipment = sequelize.define('Equipment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    equipmentCode: {
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: true,
        field: 'equipment_code'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    category: {
        type: DataTypes.ENUM('cardio', 'strength', 'functional', 'free_weights', 'accessories', 'other'),
        allowNull: false,
        defaultValue: 'other'
    },
    equipmentSize: {
        type: DataTypes.ENUM('large', 'small'),
        allowNull: false,
        defaultValue: 'large',
        field: 'equipment_size',
        comment: 'large: máy chạy, xe đạp, máy tạ có cáp - cần bảo trì thường xuyên; small: tạ tay, dây, bóng, thảm - thay mới khi hỏng'
    },
    priority: {
        type: DataTypes.ENUM('high', 'medium', 'low'),
        allowNull: false,
        defaultValue: 'medium',
        comment: 'high: bảo trì dày đặc (máy chạy, xe đạp); medium: bảo trì vừa phải; low: bảo trì thưa (phụ kiện)'
    },
    brand: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    model: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    serialNumber: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'serial_number'
    },
    purchaseDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'purchase_date'
    },
    purchasePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'purchase_price'
    },
    warrantyEndDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'warranty_end_date'
    },
    location: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Physical location in gym (e.g., Floor 1 - Cardio Area)'
    },
    status: {
        type: DataTypes.ENUM('active', 'maintenance', 'broken', 'retired'),
        allowNull: false,
        defaultValue: 'active'
    },
    condition: {
        type: DataTypes.ENUM('excellent', 'good', 'fair', 'poor'),
        allowNull: false,
        defaultValue: 'excellent'
    },
    specifications: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'JSON object for equipment specifications'
    },
    maintenanceInterval: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 30,
        field: 'maintenance_interval',
        comment: 'Maintenance interval in days'
    },
    lastMaintenanceDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'last_maintenance_date'
    },
    nextMaintenanceDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'next_maintenance_date'
    },
    usageCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'usage_count',
        comment: 'Number of times equipment has been used'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    }
}, {
    tableName: 'equipment',
    timestamps: true,
    underscored: true
});

// Function to generate equipment code
function generateEquipmentCode(category) {
    const categoryPrefix = {
        'cardio': 'CD',
        'strength': 'ST',
        'functional': 'FN',
        'free_weights': 'FW',
        'accessories': 'AC',
        'other': 'EQ'
    };
    
    const prefix = categoryPrefix[category] || 'EQ';
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `${prefix}${year}${random}`;
}

// Hook to auto-generate equipment code before create
Equipment.beforeCreate(async (equipment) => {
    if (!equipment.equipmentCode) {
        let isUnique = false;
        let attempts = 0;
        
        while (!isUnique && attempts < 10) {
            const code = generateEquipmentCode(equipment.category);
            
            try {
                const existing = await Equipment.findOne({ 
                    where: { equipmentCode: code } 
                });
                
                if (!existing) {
                    equipment.equipmentCode = code;
                    isUnique = true;
                } else {
                    attempts++;
                }
            } catch (error) {
                equipment.equipmentCode = code;
                isUnique = true;
            }
        }
        
        if (!equipment.equipmentCode) {
            equipment.equipmentCode = generateEquipmentCode(equipment.category) + Date.now().toString().slice(-3);
        }
    }
    
    // Calculate next maintenance date if maintenance interval is set
    if (equipment.maintenanceInterval && equipment.lastMaintenanceDate) {
        const lastDate = new Date(equipment.lastMaintenanceDate);
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + equipment.maintenanceInterval);
        equipment.nextMaintenanceDate = nextDate.toISOString().split('T')[0];
    }
});

// Hook to create automatic maintenance schedules after create
Equipment.afterCreate(async (equipment) => {
    try {
        const MaintenanceSchedule = require('./MaintenanceSchedule');
        await MaintenanceSchedule.createSchedulesForEquipment(
            equipment.id, 
            equipment.priority, 
            equipment.purchaseDate
        );
    } catch (error) {
        console.error('Error creating maintenance schedules:', error);
    }
});

// Hook to update next maintenance date when maintenance interval or last maintenance date changes
Equipment.beforeUpdate(async (equipment) => {
    if (equipment.changed('maintenanceInterval') || equipment.changed('lastMaintenanceDate')) {
        if (equipment.maintenanceInterval && equipment.lastMaintenanceDate) {
            const lastDate = new Date(equipment.lastMaintenanceDate);
            const nextDate = new Date(lastDate);
            nextDate.setDate(nextDate.getDate() + equipment.maintenanceInterval);
            equipment.nextMaintenanceDate = nextDate.toISOString().split('T')[0];
        }
    }
});

// Instance methods
Equipment.prototype.incrementUsage = async function() {
    await this.update({ usageCount: this.usageCount + 1 });
    return this.usageCount + 1;
};

Equipment.prototype.updateMaintenance = async function(maintenanceDate = null) {
    const date = maintenanceDate || new Date().toISOString().split('T')[0];
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + (this.maintenanceInterval || 30));
    
    await this.update({
        lastMaintenanceDate: date,
        nextMaintenanceDate: nextDate.toISOString().split('T')[0],
        status: 'active'
    });
    
    return this;
};

Equipment.prototype.isMaintenanceDue = function() {
    if (!this.nextMaintenanceDate) return false;
    return new Date(this.nextMaintenanceDate) <= new Date();
};

Equipment.prototype.isDamaged = function() {
    return this.status === 'broken' || this.status === 'maintenance';
};

module.exports = Equipment;