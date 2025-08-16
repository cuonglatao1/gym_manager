const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Promotion = sequelize.define('Promotion', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Mã khuyến mãi (VD: STUDENT40, SUMMER20)'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Tên chương trình khuyến mãi'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mô tả chi tiết khuyến mãi'
    },
    type: {
        type: DataTypes.ENUM('percentage', 'fixed_amount', 'buy_x_get_y'),
        allowNull: false,
        defaultValue: 'percentage',
        comment: 'Loại khuyến mãi: phần trăm, số tiền cố định, mua X tặng Y'
    },
    discountValue: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'discount_value',
        comment: 'Giá trị giảm (% hoặc số tiền)'
    },
    maxDiscountAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'max_discount_amount',
        comment: 'Số tiền giảm tối đa (cho loại %)'
    },
    minOrderValue: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'min_order_value',
        comment: 'Giá trị đơn hàng tối thiểu để áp dụng'
    },
    applicableFor: {
        type: DataTypes.ENUM('membership', 'class', 'all'),
        allowNull: false,
        defaultValue: 'all',
        field: 'applicable_for',
        comment: 'Áp dụng cho: gói tập, lớp học, hoặc tất cả'
    },
    membershipTypes: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'membership_types',
        comment: 'Danh sách ID gói tập được áp dụng (null = tất cả)'
    },
    startDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'start_date',
        comment: 'Ngày bắt đầu khuyến mãi'
    },
    endDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'end_date',
        comment: 'Ngày kết thúc khuyến mãi'
    },
    usageLimit: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'usage_limit',
        comment: 'Giới hạn số lần sử dụng (null = không giới hạn)'
    },
    usageCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'usage_count',
        comment: 'Số lần đã sử dụng'
    },
    perUserLimit: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'per_user_limit',
        comment: 'Giới hạn số lần 1 user sử dụng'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    },
    conditions: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Điều kiện đặc biệt (student_id_required, age_range, etc.)'
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
    tableName: 'promotions',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['code'],
            unique: true
        },
        {
            fields: ['start_date', 'end_date']
        },
        {
            fields: ['is_active']
        },
        {
            fields: ['applicable_for']
        }
    ]
});

// Instance methods
Promotion.prototype.isValid = function() {
    const now = new Date();
    return this.isActive && 
           now >= new Date(this.startDate) && 
           now <= new Date(this.endDate) &&
           (this.usageLimit === null || this.usageCount < this.usageLimit);
};

Promotion.prototype.canUserUse = async function(userId) {
    if (!this.perUserLimit) return true;
    
    const { PromotionUsage } = require('./index');
    const userUsageCount = await PromotionUsage.count({
        where: {
            promotionId: this.id,
            userId: userId
        }
    });
    
    return userUsageCount < this.perUserLimit;
};

Promotion.prototype.calculateDiscount = function(orderValue, quantity = 1) {
    if (!this.isValid()) return 0;
    
    if (this.minOrderValue && orderValue < parseFloat(this.minOrderValue)) {
        return 0;
    }
    
    let discount = 0;
    
    switch (this.type) {
        case 'percentage':
            discount = (orderValue * parseFloat(this.discountValue)) / 100;
            if (this.maxDiscountAmount && discount > parseFloat(this.maxDiscountAmount)) {
                discount = parseFloat(this.maxDiscountAmount);
            }
            break;
            
        case 'fixed_amount':
            discount = parseFloat(this.discountValue);
            break;
            
        case 'buy_x_get_y':
            // Cần implement logic phức tạp hơn
            const buyQuantity = Math.floor(parseFloat(this.discountValue));
            const getQuantity = Math.floor(parseFloat(this.maxDiscountAmount || 1));
            const freeItems = Math.floor(quantity / buyQuantity) * getQuantity;
            discount = (freeItems * orderValue) / quantity;
            break;
    }
    
    return Math.min(discount, orderValue);
};

Promotion.prototype.incrementUsage = async function() {
    return await this.increment('usageCount');
};

// Static methods
Promotion.getValidPromotions = async function(applicableFor = 'all') {
    const now = new Date();
    return await this.findAll({
        where: {
            isActive: true,
            startDate: { [sequelize.Sequelize.Op.lte]: now },
            endDate: { [sequelize.Sequelize.Op.gte]: now },
            [sequelize.Sequelize.Op.or]: [
                { applicableFor: applicableFor },
                { applicableFor: 'all' }
            ]
        },
        order: [['discountValue', 'DESC']]
    });
};

Promotion.findByCode = async function(code) {
    return await this.findOne({
        where: {
            code: code.toUpperCase(),
            isActive: true
        }
    });
};

module.exports = Promotion;