// models/ClassSchedule.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ClassSchedule = sequelize.define('ClassSchedule', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    classId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'class_id',
        references: {
            model: 'classes',
            key: 'id'
        }
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    startTime: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'start_time'
    },
    endTime: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'end_time'
    },
    trainerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'trainer_id',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    maxParticipants: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'max_participants'
    },
    currentParticipants: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'current_participants'
    },
    status: {
        type: DataTypes.ENUM('scheduled', 'ongoing', 'completed', 'cancelled'),
        defaultValue: 'scheduled'
    },
    room: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'class_schedules',
    timestamps: true,
    underscored: true
});

// Instance methods
ClassSchedule.prototype.isEnrollmentOpen = function() {
    const now = new Date();
    const startTime = new Date(this.startTime);
    return this.status === 'scheduled' && 
           now < startTime && 
           this.currentParticipants < this.maxParticipants;
};

ClassSchedule.prototype.canCheckIn = function() {
    const now = new Date();
    const startTime = new Date(this.startTime);
    const checkInStart = new Date(startTime.getTime() - 15 * 60 * 1000); // 15 minutes before
    const checkInEnd = new Date(startTime.getTime() + 15 * 60 * 1000);   // 15 minutes after
    
    return now >= checkInStart && now <= checkInEnd && this.status === 'scheduled';
};

ClassSchedule.prototype.getRemainingSlots = function() {
    return this.maxParticipants - this.currentParticipants;
};

module.exports = ClassSchedule;