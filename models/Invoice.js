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
        type: DataTypes.ENUM('pending', 'paid', 'overdue', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
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
    
    const result = await this.update({
        paidAmount: newPaidAmount,
        status: status
    });
    
    // If invoice is fully paid, activate related membership if any
    if (status === 'paid' && this.description?.includes('Membership')) {
        try {
            const { MembershipHistory } = require('./index');
            const membershipHistory = await MembershipHistory.findOne({
                where: {
                    memberId: this.memberId,
                    notes: { [require('sequelize').Op.like]: `%Invoice: ${this.invoiceNumber}%` },
                    status: 'pending'
                },
                include: [{
                    model: require('./index').Membership,
                    as: 'membership'
                }]
            });
            
            if (membershipHistory) {
                await membershipHistory.update({
                    status: 'active',
                    paymentStatus: 'paid'
                });
                console.log(`✅ Activated membership for member ${this.memberId} after invoice ${this.invoiceNumber} payment`);
                
                // Update pending class enrollment invoices with new membership discount
                await this.updatePendingClassInvoicesWithDiscount(this.memberId, membershipHistory.membership);
            }
        } catch (error) {
            console.error('❌ Error activating membership after payment:', error);
        }
    }
    
    return result;
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
                [sequelize.Sequelize.Op.in]: ['pending', 'overdue']
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

// Update pending class enrollment invoices with new membership discount
Invoice.prototype.updatePendingClassInvoicesWithDiscount = async function(memberId, membership) {
    try {
        console.log(`🔄 [DISCOUNT UPDATE] Updating pending class invoices for member ${memberId} with new membership discount`);
        
        // Find pending class enrollment invoices
        const { InvoiceItem } = require('./index');
        const pendingClassInvoices = await Invoice.findAll({
            where: {
                memberId: memberId,
                status: 'pending',
                description: {
                    [require('sequelize').Op.like]: '%Class Enrollment%'
                }
            },
            include: [{
                model: InvoiceItem,
                as: 'items'
            }]
        });

        console.log(`🔍 [DISCOUNT UPDATE] Found ${pendingClassInvoices.length} pending class invoices to update`);

        for (const invoice of pendingClassInvoices) {
            // Recalculate with new membership discount
            const discountPercent = parseFloat(membership.classDiscountPercent) || 0;
            const originalSubtotal = parseFloat(invoice.subtotal);
            const discountAmount = (originalSubtotal * discountPercent) / 100;
            const newTotalAmount = originalSubtotal - discountAmount;

            await invoice.update({
                discountAmount: discountAmount,
                totalAmount: newTotalAmount
            });

            console.log(`✅ [DISCOUNT UPDATE] Updated invoice ${invoice.invoiceNumber}: ${originalSubtotal}₫ -> ${newTotalAmount}₫ (${discountPercent}% discount)`);
        }

        console.log(`🎉 [DISCOUNT UPDATE] Successfully updated ${pendingClassInvoices.length} pending class invoices`);
    } catch (error) {
        console.error('❌ [DISCOUNT UPDATE] Error updating pending class invoices:', error);
    }
};

module.exports = Invoice;