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
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
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
    }
}, {
    tableName: 'memberships',
    timestamps: true,
    underscored: true
});

module.exports = Membership;