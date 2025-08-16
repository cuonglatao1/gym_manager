const { sequelize } = require('../config/database');
const { Membership } = require('../models');

async function updateMemberships() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected successfully!');

        // Update existing memberships with discount percentages
        const memberships = [
            {
                name: 'Basic',
                classDiscountPercent: 0
            },
            {
                name: 'Premium',
                classDiscountPercent: 15
            },
            {
                name: 'VIP',
                classDiscountPercent: 25
            },
            {
                name: 'Elite',
                classDiscountPercent: 30
            }
        ];

        for (const membershipData of memberships) {
            const [membership, created] = await Membership.findOrCreate({
                where: { name: membershipData.name },
                defaults: {
                    description: `${membershipData.name} membership package`,
                    duration: 30, // 30 days
                    price: membershipData.name === 'Basic' ? 500000 : 
                           membershipData.name === 'Premium' ? 1000000 :
                           membershipData.name === 'VIP' ? 1500000 : 2000000,
                    classDiscountPercent: membershipData.classDiscountPercent,
                    maxClasses: membershipData.name === 'Basic' ? 8 : 
                               membershipData.name === 'Premium' ? 20 :
                               membershipData.name === 'VIP' ? null : null, // null = unlimited
                    hasPersonalTrainer: membershipData.name === 'VIP' || membershipData.name === 'Elite',
                    benefits: [
                        membershipData.name === 'Basic' ? 'Access to gym facilities' :
                        membershipData.name === 'Premium' ? 'Access to gym + group classes' :
                        membershipData.name === 'VIP' ? 'All Premium + Personal Trainer' :
                        'All VIP + Nutrition consultation'
                    ]
                }
            });

            if (!created) {
                // Update existing membership with discount
                await membership.update({
                    classDiscountPercent: membershipData.classDiscountPercent
                });
                console.log(`✅ Updated ${membershipData.name} membership with ${membershipData.classDiscountPercent}% discount`);
            } else {
                console.log(`✅ Created ${membershipData.name} membership with ${membershipData.classDiscountPercent}% discount`);
            }
        }

        console.log('🎉 All memberships updated successfully!');

    } catch (error) {
        console.error('❌ Error updating memberships:', error);
    } finally {
        await sequelize.close();
    }
}

updateMemberships();