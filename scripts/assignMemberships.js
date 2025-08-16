const { sequelize } = require('../config/database');
const { Member, Membership, MembershipHistory } = require('../models');

async function assignMemberships() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected successfully!');

        // Get members
        const members = await Member.findAll();
        console.log(`📋 Found ${members.length} members`);

        // Get memberships
        const memberships = await Membership.findAll();
        console.log(`📦 Found ${memberships.length} memberships`);

        // Assign different memberships to different members
        for (let i = 0; i < members.length; i++) {
            const member = members[i];
            const membershipIndex = i % memberships.length;
            const membership = memberships[membershipIndex];

            // Check if member already has active membership
            const existingMembership = await MembershipHistory.findOne({
                where: {
                    memberId: member.id,
                    status: 'active'
                }
            });

            if (!existingMembership) {
                // Create new membership history
                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + membership.duration);

                await MembershipHistory.create({
                    memberId: member.id,
                    membershipId: membership.id,
                    startDate: startDate,
                    endDate: endDate,
                    status: 'active',
                    price: membership.price
                });

                console.log(`✅ Assigned ${membership.name} membership to ${member.fullName}`);
            } else {
                console.log(`⚠️ ${member.fullName} already has active membership`);
            }
        }

        console.log('🎉 Membership assignment completed!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await sequelize.close();
    }
}

assignMemberships();