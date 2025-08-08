// models/ClassEnrollment.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ClassEnrollment = sequelize.define('ClassEnrollment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    memberId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'member_id',
        references: {
            model: 'members',
            key: 'id'
        }
    },
    classScheduleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'class_schedule_id',
        references: {
            model: 'class_schedules',
            key: 'id'
        }
    },
    enrollmentDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'enrollment_date'
    },
    status: {
        type: DataTypes.ENUM('enrolled', 'attended', 'missed', 'cancelled'),
        defaultValue: 'enrolled'
    },
    checkinTime: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'checkin_time'
    },
    checkoutTime: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'checkout_time'
    },
    rating: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 1,
            max: 5
        }
    },
    feedback: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'class_enrollments',
    timestamps: true,
    underscored: true
});

// Instance methods
ClassEnrollment.prototype.checkIn = function() {
    this.checkinTime = new Date();
    this.status = 'attended';
    return this.save();
};

ClassEnrollment.prototype.checkOut = function() {
    this.checkoutTime = new Date();
    return this.save();
};

ClassEnrollment.prototype.cancel = function() {
    this.status = 'cancelled';
    return this.save();
};

ClassEnrollment.prototype.getAttendanceDuration = function() {
    if (!this.checkinTime || !this.checkoutTime) return null;
    
    const duration = new Date(this.checkoutTime) - new Date(this.checkinTime);
    return Math.round(duration / (1000 * 60)); // minutes
};

module.exports = ClassEnrollment;