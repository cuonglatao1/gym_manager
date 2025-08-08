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
        order: [['endDate', 'DESC']]
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
                include: [{ model: ClassType, as: 'classType' }]
            }
        ],
        order: [['startTime', 'ASC']],
        limit
    });
};

// Helper method to get member's upcoming enrollments
Member.prototype.getUpcomingEnrollments = async function(limit = 10) {
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
                include: [
                    {
                        model: Class,
                        as: 'class',
                        include: [{ model: ClassType, as: 'classType' }]
                    },
                    { model: User, as: 'trainer', attributes: ['id', 'fullName'] }
                ]
            }
        ],
        order: [[{ model: ClassSchedule, as: 'classSchedule' }, 'startTime', 'ASC']],
        limit
    });
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
    ClassEnrollment
};