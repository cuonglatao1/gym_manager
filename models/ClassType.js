// models/ClassType.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ClassType = sequelize.define('ClassType', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Duration in minutes'
    },
    maxParticipants: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'max_participants'
    },
    equipment: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Required equipment array'
    },
    difficulty: {
        type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
        defaultValue: 'beginner'
    },
    color: {
        type: DataTypes.STRING(7),
        allowNull: true,
        defaultValue: '#3498db',
        comment: 'Color for calendar display'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    }
}, {
    tableName: 'class_types',
    timestamps: true,
    underscored: true
});

module.exports = ClassType;