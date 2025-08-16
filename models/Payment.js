const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
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
    invoiceId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'invoice_id',
        references: {
            model: 'invoices',
            key: 'id'
        }
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    paymentMethod: {
        type: DataTypes.ENUM('cash', 'card', 'bank_transfer', 'mobile_payment'),
        allowNull: false,
        field: 'payment_method'
    },
    paymentStatus: {
        type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'pending',
        field: 'payment_status'
    },
    transactionId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'transaction_id',
        comment: 'External payment gateway transaction ID'
    },
    paymentDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'payment_date'
    },
    dueDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'due_date'
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Payment description or purpose'
    },
    paymentType: {
        type: DataTypes.ENUM('membership', 'class', 'service', 'penalty', 'other', 'invoice'),
        allowNull: false,
        field: 'payment_type'
    },
    referenceId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'reference_id',
        comment: 'Reference to related entity (class, membership, etc.)'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    processedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'processed_by',
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'Admin/staff who processed the payment'
    }
}, {
    tableName: 'payments',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['member_id']
        },
        {
            fields: ['payment_status']
        },
        {
            fields: ['payment_date']
        },
        {
            fields: ['payment_type']
        }
    ]
});

// Instance methods
Payment.prototype.isPending = function() {
    return this.paymentStatus === 'pending';
};

Payment.prototype.isCompleted = function() {
    return this.paymentStatus === 'completed';
};

Payment.prototype.isOverdue = function() {
    return this.dueDate && new Date() > new Date(this.dueDate) && this.paymentStatus === 'pending';
};

Payment.prototype.markAsCompleted = async function(transactionId = null, processedBy = null) {
    return await this.update({
        paymentStatus: 'completed',
        paymentDate: new Date(),
        transactionId: transactionId,
        processedBy: processedBy
    });
};

Payment.prototype.markAsFailed = async function() {
    return await this.update({
        paymentStatus: 'failed'
    });
};

// Static methods
Payment.getTotalRevenue = async function(startDate = null, endDate = null) {
    const whereClause = {
        paymentStatus: 'completed'
    };
    
    if (startDate && endDate) {
        whereClause.paymentDate = {
            [sequelize.Sequelize.Op.between]: [startDate, endDate]
        };
    }
    
    const result = await this.sum('amount', { where: whereClause });
    return result || 0;
};

Payment.getRevenueByType = async function(startDate = null, endDate = null) {
    const whereClause = {
        paymentStatus: 'completed'
    };
    
    if (startDate && endDate) {
        whereClause.paymentDate = {
            [sequelize.Sequelize.Op.between]: [startDate, endDate]
        };
    }
    
    return await this.findAll({
        attributes: [
            'paymentType',
            [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: whereClause,
        group: ['paymentType'],
        raw: true
    });
};

module.exports = Payment;