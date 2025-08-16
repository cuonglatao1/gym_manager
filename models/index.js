const { sequelize } = require('../config/database');

// Import existing models
const User = require('./User');
const RefreshToken = require('./RefreshToken');
const Member = require('./Member');
const Membership = require('./Membership');
const MembershipHistory = require('./MembershipHistory');

// Import new class models
const ClassType = require('./ClassType');
const Class = require('./Class');
const ClassSchedule = require('./ClassSchedule');
const ClassEnrollment = require('./ClassEnrollment');

// Import payment models
const Payment = require('./Payment');
const Invoice = require('./Invoice');
const InvoiceItem = require('./InvoiceItem');

// Import promotion models
const Promotion = require('./Promotion');
const PromotionUsage = require('./PromotionUsage');

// ===== EXISTING ASSOCIATIONS =====
// User & RefreshToken
User.hasMany(RefreshToken, {
    foreignKey: 'userId',
    as: 'refreshTokens',
    onDelete: 'CASCADE'
});

RefreshToken.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

// User & Member
User.hasOne(Member, {
    foreignKey: 'userId',
    as: 'member',
    onDelete: 'SET NULL'
});

Member.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

// Member & MembershipHistory
Member.hasMany(MembershipHistory, {
    foreignKey: 'memberId',
    as: 'membershipHistory',
    onDelete: 'CASCADE'
});

MembershipHistory.belongsTo(Member, {
    foreignKey: 'memberId',
    as: 'member'
});

// Membership & MembershipHistory
Membership.hasMany(MembershipHistory, {
    foreignKey: 'membershipId',
    as: 'membershipHistory',
    onDelete: 'CASCADE'
});

MembershipHistory.belongsTo(Membership, {
    foreignKey: 'membershipId',
    as: 'membership'
});

// ===== NEW CLASS ASSOCIATIONS =====

// User (Trainer) & Class
User.hasMany(Class, {
    foreignKey: 'trainerId',
    as: 'classes',
    onDelete: 'CASCADE'
});

Class.belongsTo(User, {
    foreignKey: 'trainerId',
    as: 'trainer'
});

// ClassType & Class
ClassType.hasMany(Class, {
    foreignKey: 'classTypeId',
    as: 'classes',
    onDelete: 'CASCADE'
});

Class.belongsTo(ClassType, {
    foreignKey: 'classTypeId',
    as: 'classType'
});

// Class & ClassSchedule
Class.hasMany(ClassSchedule, {
    foreignKey: 'classId',
    as: 'schedules',
    onDelete: 'CASCADE'
});

ClassSchedule.belongsTo(Class, {
    foreignKey: 'classId',
    as: 'class'
});

// User (Trainer) & ClassSchedule
User.hasMany(ClassSchedule, {
    foreignKey: 'trainerId',
    as: 'schedules',
    onDelete: 'CASCADE'
});

ClassSchedule.belongsTo(User, {
    foreignKey: 'trainerId',
    as: 'trainer'
});

// Member & ClassEnrollment
Member.hasMany(ClassEnrollment, {
    foreignKey: 'memberId',
    as: 'enrollments',
    onDelete: 'CASCADE'
});

ClassEnrollment.belongsTo(Member, {
    foreignKey: 'memberId',
    as: 'member'
});

// ClassSchedule & ClassEnrollment
ClassSchedule.hasMany(ClassEnrollment, {
    foreignKey: 'classScheduleId',
    as: 'enrollments',
    onDelete: 'CASCADE'
});

ClassEnrollment.belongsTo(ClassSchedule, {
    foreignKey: 'classScheduleId',
    as: 'classSchedule'
});

// ===== PAYMENT ASSOCIATIONS =====

// Member & Payment
Member.hasMany(Payment, {
    foreignKey: 'memberId',
    as: 'payments',
    onDelete: 'CASCADE'
});

Payment.belongsTo(Member, {
    foreignKey: 'memberId',
    as: 'member'
});

// User (Admin/Staff) & Payment (processed by)
User.hasMany(Payment, {
    foreignKey: 'processedBy',
    as: 'processedPayments',
    onDelete: 'SET NULL'
});

Payment.belongsTo(User, {
    foreignKey: 'processedBy',
    as: 'processor'
});

// Member & Invoice
Member.hasMany(Invoice, {
    foreignKey: 'memberId',
    as: 'invoices',
    onDelete: 'CASCADE'
});

Invoice.belongsTo(Member, {
    foreignKey: 'memberId',
    as: 'member'
});

// User (Admin/Staff) & Invoice (created by)
User.hasMany(Invoice, {
    foreignKey: 'createdBy',
    as: 'createdInvoices',
    onDelete: 'SET NULL'
});

Invoice.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator'
});

// Invoice & Payment
Invoice.hasMany(Payment, {
    foreignKey: 'invoiceId',
    as: 'payments',
    onDelete: 'SET NULL'
});

Payment.belongsTo(Invoice, {
    foreignKey: 'invoiceId',
    as: 'invoice'
});

// Invoice & InvoiceItem
Invoice.hasMany(InvoiceItem, {
    foreignKey: 'invoiceId',
    as: 'items',
    onDelete: 'CASCADE'
});

InvoiceItem.belongsTo(Invoice, {
    foreignKey: 'invoiceId',
    as: 'invoice'
});

// ===== PROMOTION ASSOCIATIONS =====

// User & Promotion
User.hasMany(Promotion, {
    foreignKey: 'createdBy',
    as: 'createdPromotions',
    onDelete: 'SET NULL'
});

Promotion.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator'
});

// Promotion & PromotionUsage
Promotion.hasMany(PromotionUsage, {
    foreignKey: 'promotionId',
    as: 'usages',
    onDelete: 'CASCADE'
});

PromotionUsage.belongsTo(Promotion, {
    foreignKey: 'promotionId',
    as: 'promotion'
});

// User & PromotionUsage
User.hasMany(PromotionUsage, {
    foreignKey: 'userId',
    as: 'promotionUsages',
    onDelete: 'CASCADE'
});

PromotionUsage.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

// Member & PromotionUsage
Member.hasMany(PromotionUsage, {
    foreignKey: 'memberId',
    as: 'promotionUsages',
    onDelete: 'CASCADE'
});

PromotionUsage.belongsTo(Member, {
    foreignKey: 'memberId',
    as: 'member'
});

// Invoice & PromotionUsage
Invoice.hasMany(PromotionUsage, {
    foreignKey: 'invoiceId',
    as: 'promotionUsages',
    onDelete: 'SET NULL'
});

PromotionUsage.belongsTo(Invoice, {
    foreignKey: 'invoiceId',
    as: 'invoice'
});

// Payment & PromotionUsage
Payment.hasMany(PromotionUsage, {
    foreignKey: 'paymentId',
    as: 'promotionUsages',
    onDelete: 'SET NULL'
});

PromotionUsage.belongsTo(Payment, {
    foreignKey: 'paymentId',
    as: 'payment'
});

// ===== HELPER METHODS =====

// Helper method to get active membership for a member
Member.prototype.getActiveMembership = async function() {
    return await MembershipHistory.findOne({
        where: {
            memberId: this.id,
            status: 'active'
        },
        include: [{
            model: Membership,
            as: 'membership'
        }],
        order: [['createdAt', 'DESC']] // Get the most recently purchased membership
    });
};

// Helper method to check if member has active membership
Member.prototype.hasActiveMembership = async function() {
    const activeMembership = await this.getActiveMembership();
    return activeMembership && activeMembership.isActive();
};

// Helper method to get trainer's upcoming schedules
User.prototype.getUpcomingSchedules = async function(limit = 10) {
    if (this.role !== 'trainer') return [];
    
    try {
        return await ClassSchedule.findAll({
            where: {
                trainerId: this.id,
                startTime: { [require('sequelize').Op.gte]: new Date() },
                status: 'scheduled'
            },
            include: [
                {
                    model: Class,
                    as: 'class',
                    required: false
                }
            ],
            order: [['startTime', 'ASC']],
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Error in getUpcomingSchedules:', error);
        return [];
    }
};

// Helper method to get member's upcoming enrollments (simplified)
Member.prototype.getUpcomingEnrollments = async function(limit = 10) {
    try {
        return await ClassEnrollment.findAll({
            where: {
                memberId: this.id,
                status: 'enrolled'
            },
            include: [
                {
                    model: ClassSchedule,
                    as: 'classSchedule',
                    where: {
                        startTime: { [require('sequelize').Op.gte]: new Date() }
                    },
                    required: true
                }
            ],
            order: [['id', 'DESC']],
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Error in getUpcomingEnrollments:', error);
        return [];
    }
};

module.exports = {
    sequelize,
    User,
    RefreshToken,
    Member,
    Membership,
    MembershipHistory,
    ClassType,
    Class,
    ClassSchedule,
    ClassEnrollment,
    Payment,
    Invoice,
    InvoiceItem,
    Promotion,
    PromotionUsage
};