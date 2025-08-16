const { sequelize } = require('../config/database');
const { User, Member, Membership, MembershipHistory } = require('../models');

async function createPremiumMember() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected successfully!');

        // Create user
        const user = await User.create({
            username: 'premium_member',
            email: 'premium@test.com',
            password: 'premium123', // This will be hashed automatically
            fullName: 'Premium Test Member',
            role: 'member'
        });

        console.log('✅ Created user:', user.fullName);

        // Create member
        const member = await Member.create({
            userId: user.id,
            fullName: user.fullName,
            phone: '0987654321',
            email: user.email,
            joinDate: new Date(),
            isActive: true
        });

        console.log('✅ Created member with code:', member.memberCode);

        // Get Premium membership
        const premiumMembership = await Membership.findOne({
            where: { name: 'Premium Monthly' }
        });

        if (premiumMembership) {
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
            console.log(`📋 Login credentials: premium@test.com / premium123`);
        }

        console.log('🎉 Premium member created successfully!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await sequelize.close();
    }
}

createPremiumMember();