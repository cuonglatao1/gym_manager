const { sequelize } = require('../config/database');
const { Membership, MembershipHistory } = require('../models');

async function updateActiveMemberships() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected successfully!');

        // Get all current Premium memberships
        const premiumMembership = await Membership.findOne({
            where: { name: 'Premium Monthly' }
        });

        const vipMembership = await Membership.findOne({
            where: { name: 'VIP Monthly' }
        });

        const basicMembership = await Membership.findOne({
            where: { name: 'Basic Monthly' }
        });

        console.log(`📦 Found memberships:`);
        console.log(`- Basic: ${basicMembership.classDiscountPercent}% discount`);
        console.log(`- Premium: ${premiumMembership.classDiscountPercent}% discount`);
        console.log(`- VIP: ${vipMembership.classDiscountPercent}% discount`);

        // Update all active Premium membership histories to use the new membership ID
        const premiumHistories = await MembershipHistory.findAll({
            where: {
                status: 'active'
            },
            include: [{
                model: Membership,
                as: 'membership',
                where: { name: 'Premium Monthly' }
            }]
        });

        for (const history of premiumHistories) {
            await history.update({ membershipId: premiumMembership.id });
            console.log(`✅ Updated Premium membership for member ${history.memberId}`);
        }

        // Update VIP memberships
        const vipHistories = await MembershipHistory.findAll({
            where: {
                status: 'active'
            },
            include: [{
                model: Membership,
                as: 'membership',
                where: { name: 'VIP Monthly' }
            }]
        });

        for (const history of vipHistories) {
            await history.update({ membershipId: vipMembership.id });
            console.log(`✅ Updated VIP membership for member ${history.memberId}`);
        }

        console.log('🎉 All active memberships updated!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await sequelize.close();
    }
}

updateActiveMemberships();