const { sequelize } = require('../config/database');
const { Member, Membership, MembershipHistory } = require('../models');

async function assignPremiumMembership() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected successfully!');

        // Find the premium member
        const member = await Member.findOne({
            where: { email: 'premium@test.com' }
        });

        if (!member) {
            console.log('❌ Premium member not found');
            return;
        }

        // Get Premium membership
        const premiumMembership = await Membership.findOne({
            where: { name: 'Premium Monthly' }
        });

        if (!premiumMembership) {
            console.log('❌ Premium membership not found');
            return;
        }

        // Create membership history
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + premiumMembership.duration);

        await MembershipHistory.create({
            memberId: member.id,
            membershipId: premiumMembership.id,
            startDate: startDate,
            endDate: endDate,
            status: 'active',
            price: premiumMembership.price
        });

        console.log('✅ Assigned Premium membership with 15% discount');
        console.log(`📋 Member: ${member.fullName} (${member.memberCode})`);
        console.log(`📦 Membership: ${premiumMembership.name} - ${premiumMembership.classDiscountPercent}% discount`);

        console.log('🎉 Premium membership assigned successfully!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await sequelize.close();
    }
}

assignPremiumMembership();