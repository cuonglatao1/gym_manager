const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Invoice = sequelize.define('Invoice', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    invoiceNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'invoice_number'
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
    issueDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'issue_date'
    },
    dueDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'due_date'
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    taxAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'tax_amount',
        validate: {
            min: 0
        }
    },
    discountAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'discount_amount',
        validate: {
            min: 0
        }
    },
    totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'total_amount',
        validate: {
            min: 0
        }
    },
    paidAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'paid_amount',
        validate: {
            min: 0
        }
    },
    status: {
        type: DataTypes.ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled'),
        allowNull: false,
        defaultValue: 'draft'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    billingAddress: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'billing_address'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'created_by',
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'invoices',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['member_id']
        },
        {
            fields: ['status']
        },
        {
            fields: ['due_date']
        },
        {
            fields: ['invoice_number'],
            unique: true
        }
    ]
});

// Function to generate invoice number
function generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `INV${year}${month}${day}${random}`;
}

// Hook to auto-generate invoice number before create
Invoice.beforeCreate(async (invoice) => {
    if (!invoice.invoiceNumber) {
        let isUnique = false;
        let attempts = 0;
        
        while (!isUnique && attempts < 10) {
            const number = generateInvoiceNumber();
            
            try {
                const existing = await Invoice.findOne({ 
                    where: { invoiceNumber: number } 
                });
                
                if (!existing) {
                    invoice.invoiceNumber = number;
                    isUnique = true;
                } else {
                    attempts++;
                }
            } catch (error) {
                invoice.invoiceNumber = number;
                isUnique = true;
            }
        }
        
        // Fallback if couldn't generate unique number
        if (!invoice.invoiceNumber) {
            invoice.invoiceNumber = generateInvoiceNumber() + Date.now().toString().slice(-3);
        }
    }
});

// Hook to set invoice number if still null before validation
Invoice.beforeValidate(async (invoice) => {
    if (!invoice.invoiceNumber) {
        invoice.invoiceNumber = generateInvoiceNumber() + Date.now().toString().slice(-3);
    }
});

// Hook to calculate total amount before save
Invoice.beforeSave(async (invoice) => {
    invoice.totalAmount = parseFloat(invoice.subtotal) + parseFloat(invoice.taxAmount) - parseFloat(invoice.discountAmount);
});

// Instance methods
Invoice.prototype.isOverdue = function() {
    return new Date() > new Date(this.dueDate) && this.status !== 'paid' && this.status !== 'cancelled';
};

Invoice.prototype.isPaid = function() {
    return this.status === 'paid';
};

Invoice.prototype.getRemainingAmount = function() {
    return parseFloat(this.totalAmount) - parseFloat(this.paidAmount);
};

Invoice.prototype.markAsPaid = async function() {
    return await this.update({
        status: 'paid',
        paidAmount: this.totalAmount
    });
};

Invoice.prototype.addPayment = async function(amount) {
    const newPaidAmount = parseFloat(this.paidAmount) + parseFloat(amount);
    const status = newPaidAmount >= parseFloat(this.totalAmount) ? 'paid' : this.status;
    
    return await this.update({
        paidAmount: newPaidAmount,
        status: status
    });
};

Invoice.prototype.updateStatus = async function() {
    if (this.isOverdue()) {
        return await this.update({ status: 'overdue' });
    }
    return this;
};

// Static methods
Invoice.getOverdueInvoices = async function() {
    const overdueInvoices = await this.findAll({
        where: {
            dueDate: {
                [sequelize.Sequelize.Op.lt]: new Date()
            },
            status: {
                [sequelize.Sequelize.Op.notIn]: ['paid', 'cancelled']
            }
        },
        order: [['dueDate', 'ASC']]
    });
    
    for (const invoice of overdueInvoices) {
        if (invoice.status !== 'overdue') {
            await invoice.update({ status: 'overdue' });
        }
    }
    
    return overdueInvoices;
};

Invoice.getTotalRevenue = async function(startDate = null, endDate = null) {
    const whereClause = {
        status: 'paid'
    };
    
    if (startDate && endDate) {
        whereClause.issueDate = {
            [sequelize.Sequelize.Op.between]: [startDate, endDate]
        };
    }
    
    const result = await this.sum('totalAmount', { where: whereClause });
    return result || 0;
};

module.exports = Invoice;