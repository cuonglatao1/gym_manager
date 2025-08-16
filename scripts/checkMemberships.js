const { sequelize } = require('../config/database');
const { Member, Membership, MembershipHistory, User } = require('../models');

async function checkMemberships() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected successfully!');

        // Find all active membership histories with Premium
        const premiumMemberships = await MembershipHistory.findAll({
            where: {
                status: 'active'
            },
            include: [
                {
                    model: Member,
                    as: 'member',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'email', 'role', 'fullName']
                        }
                    ]
                },
                {
                    model: Membership,
                    as: 'membership',
                    attributes: ['name', 'classDiscountPercent']
                }
            ]
        });

        console.log('📋 Active memberships:');
        for (const history of premiumMemberships) {
            console.log(`- ${history.member.fullName} (${history.member.user?.email || 'No email'}) - ${history.membership.name} (${history.membership.classDiscountPercent}% discount) - Role: ${history.member.user?.role || 'No user'}`);
        }

        // Update Phạm Thị Mai's role to member for testing
        const phammember = await User.findOne({
            where: { email: 'trainer2@gym.com' }
        });

        if (phammember) {
            await phammember.update({ role: 'member' });
            console.log('✅ Updated Phạm Thị Mai role to member for testing');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await sequelize.close();
    }
}

checkMemberships();