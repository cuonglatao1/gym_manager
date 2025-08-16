const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PromotionUsage = sequelize.define('PromotionUsage', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    promotionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'promotion_id',
        references: {
            model: 'promotions',
            key: 'id'
        }
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    memberId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'member_id',
        references: {
            model: 'members',
            key: 'id'
        }
    },
    invoiceId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'invoice_id',
        references: {
            model: 'invoices',
            key: 'id'
        }
    },
    paymentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'payment_id',
        references: {
            model: 'payments',
            key: 'id'
        }
    },
    originalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'original_amount',
        comment: 'Số tiền gốc trước khi giảm'
    },
    discountAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'discount_amount',
        comment: 'Số tiền được giảm'
    },
    finalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'final_amount',
        comment: 'Số tiền sau khi giảm'
    },
    appliedFor: {
        type: DataTypes.ENUM('membership', 'class', 'service'),
        allowNull: false,
        field: 'applied_for',
        comment: 'Áp dụng cho gì'
    },
    referenceId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'reference_id',
        comment: 'ID của membership hoặc class được áp dụng'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Ghi chú thêm'
    }
}, {
    tableName: 'promotion_usages',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['promotion_id']
        },
        {
            fields: ['user_id']
        },
        {
            fields: ['member_id']
        },
        {
            fields: ['invoice_id']
        },
        {
            fields: ['applied_for']
        }
    ]
});

// Instance methods
PromotionUsage.prototype.getSavingsPercentage = function() {
    return (parseFloat(this.discountAmount) / parseFloat(this.originalAmount)) * 100;
};

module.exports = PromotionUsage;