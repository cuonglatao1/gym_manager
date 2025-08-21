const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Membership = sequelize.define('Membership', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Duration in days'
    },
    price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        comment: 'Price in VND (up to 9,999,999,999.99)'
    },
    benefits: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array of benefits'
    },
    maxClasses: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'max_classes',
        comment: 'Max classes per month, null = unlimited'
    },
    hasPersonalTrainer: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'has_personal_trainer'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    },
    classDiscountPercent: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'class_discount_percent',
        validate: {
            min: 0,
            max: 100
        },
        comment: 'Discount percentage for class bookings (0-100)'
    },
    features: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'List of features included in membership'
    },
    accessLevel: {
        type: DataTypes.ENUM('basic', 'premium', 'vip', 'elite'),
        allowNull: false,
        defaultValue: 'basic',
        field: 'access_level',
        comment: 'Access level for gym facilities'
    },
    canAccessPremiumClasses: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'can_access_premium_classes',
        comment: 'Can access premium/specialized classes'
    },
    freePersonalTrainerSessions: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'free_personal_trainer_sessions',
        comment: 'Number of free personal trainer sessions per month'
    },
    priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Priority level for class booking (higher = better priority)'
    },
    color: {
        type: DataTypes.STRING(7),
        allowNull: true,
        defaultValue: '#3498db',
        comment: 'Color for UI display (hex code)'
    }
}, {
    tableName: 'memberships',
    timestamps: true,
    underscored: true
});

module.exports = Membership;