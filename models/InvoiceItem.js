const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InvoiceItem = sequelize.define('InvoiceItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    invoiceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'invoice_id',
        references: {
            model: 'invoices',
            key: 'id'
        }
    },
    itemType: {
        type: DataTypes.ENUM('membership', 'class', 'service', 'product', 'penalty', 'other'),
        allowNull: false,
        field: 'item_type'
    },
    itemId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'item_id',
        comment: 'Reference to the actual item (class, membership, etc.)'
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
            min: 1
        }
    },
    unitPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'unit_price',
        validate: {
            min: 0
        }
    },
    totalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'total_price',
        validate: {
            min: 0
        }
    },
    discount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    taxable: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    taxRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'tax_rate',
        validate: {
            min: 0,
            max: 100
        }
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'invoice_items',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['invoice_id']
        },
        {
            fields: ['item_type']
        }
    ]
});

// Hook to calculate total price before save
InvoiceItem.beforeSave(async (invoiceItem) => {
    const subtotal = parseFloat(invoiceItem.quantity) * parseFloat(invoiceItem.unitPrice);
    invoiceItem.totalPrice = subtotal - parseFloat(invoiceItem.discount || 0);
});

// Hook to set total price before validation
InvoiceItem.beforeValidate(async (invoiceItem) => {
    if (invoiceItem.totalPrice === null || invoiceItem.totalPrice === undefined) {
        const subtotal = parseFloat(invoiceItem.quantity || 0) * parseFloat(invoiceItem.unitPrice || 0);
        invoiceItem.totalPrice = subtotal - parseFloat(invoiceItem.discount || 0);
    }
});

// Instance methods
InvoiceItem.prototype.getSubtotal = function() {
    return parseFloat(this.quantity) * parseFloat(this.unitPrice);
};

InvoiceItem.prototype.getDiscountAmount = function() {
    return parseFloat(this.discount);
};

InvoiceItem.prototype.getTaxAmount = function() {
    if (!this.taxable) return 0;
    const taxableAmount = this.totalPrice;
    return (parseFloat(taxableAmount) * parseFloat(this.taxRate)) / 100;
};

InvoiceItem.prototype.getFinalAmount = function() {
    return parseFloat(this.totalPrice) + this.getTaxAmount();
};

module.exports = InvoiceItem;