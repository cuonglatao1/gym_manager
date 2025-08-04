const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MembershipHistory = sequelize.define('MembershipHistory', {
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
    membershipId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'membership_id',
        references: {
            model: 'memberships',
            key: 'id'
        }
    },
    startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'start_date'
    },
    endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'end_date'
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Price at time of purchase'
    },
    status: {
        type: DataTypes.ENUM('active', 'expired', 'cancelled'),
        defaultValue: 'active'
    },
    paymentStatus: {
        type: DataTypes.ENUM('pending', 'paid', 'refunded'),
        defaultValue: 'pending',
        field: 'payment_status'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'membership_history',
    timestamps: true,
    underscored: true
});

MembershipHistory.prototype.isActive = function() {
    const now = new Date();
    const endDate = new Date(this.endDate);
    return this.status === 'active' && endDate >= now;
};

MembershipHistory.prototype.daysRemaining = function() {
    const now = new Date();
    const endDate = new Date(this.endDate);
    const diffTime = endDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

module.exports = MembershipHistory;