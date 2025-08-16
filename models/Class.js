// models/Class.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Class = sequelize.define('Class', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    classTypeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'class_type_id',
        references: {
            model: 'class_types',
            key: 'id'
        }
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    trainerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'trainer_id',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Duration in minutes'
    },
    maxParticipants: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10,
        field: 'max_participants'
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    room: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    recurring: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Is this a recurring class?'
    },
    recurringPattern: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'recurring_pattern',
        comment: 'Recurring schedule pattern'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'classes',
    timestamps: true,
    underscored: true
});

// Instance methods
Class.prototype.getFullName = function() {
    return `${this.name} - ${this.duration} minutes`;
};

Class.prototype.hasAvailableSlots = function(currentEnrollments = 0) {
    return currentEnrollments < this.maxParticipants;
};

module.exports = Class;