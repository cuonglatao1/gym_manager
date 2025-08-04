const { sequelize } = require('../config/database');

// Import existing models
const User = require('./User');
const RefreshToken = require('./RefreshToken');

// Import new models
const Member = require('./Member');
const Membership = require('./Membership');
const MembershipHistory = require('./MembershipHistory');

// Setup existing associations
User.hasMany(RefreshToken, {
    foreignKey: 'userId',
    as: 'refreshTokens',
    onDelete: 'CASCADE'
});

RefreshToken.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

// Setup new associations
// User & Member (1:1 - optional)
User.hasOne(Member, {
    foreignKey: 'userId',
    as: 'member',
    onDelete: 'SET NULL'
});

Member.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

// Member & MembershipHistory (1:Many)
Member.hasMany(MembershipHistory, {
    foreignKey: 'memberId',
    as: 'membershipHistory',
    onDelete: 'CASCADE'
});

MembershipHistory.belongsTo(Member, {
    foreignKey: 'memberId',
    as: 'member'
});

// Membership & MembershipHistory (1:Many)
Membership.hasMany(MembershipHistory, {
    foreignKey: 'membershipId',
    as: 'membershipHistory',
    onDelete: 'CASCADE'
});

MembershipHistory.belongsTo(Membership, {
    foreignKey: 'membershipId',
    as: 'membership'
});

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

module.exports = {
    sequelize,
    User,
    RefreshToken,
    Member,
    Membership,
    MembershipHistory
};