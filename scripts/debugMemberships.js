const { sequelize } = require('../config/database');

async function debugMemberships() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected successfully!');

        // Check raw SQL
        const memberships = await sequelize.query(
            'SELECT id, name, class_discount_percent FROM memberships ORDER BY name',
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log('📦 Raw memberships from database:');
        memberships.forEach(m => {
            console.log(`- ${m.name}: ${m.class_discount_percent}% (ID: ${m.id})`);
        });

        // Update manually
        await sequelize.query(`
            UPDATE memberships 
            SET class_discount_percent = 15 
            WHERE name = 'Premium Monthly'
        `);

        await sequelize.query(`
            UPDATE memberships 
            SET class_discount_percent = 25 
            WHERE name = 'VIP Monthly'
        `);

        console.log('✅ Updated discounts manually');

        // Check again
        const updatedMemberships = await sequelize.query(
            'SELECT id, name, class_discount_percent FROM memberships ORDER BY name',
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log('📦 Updated memberships:');
        updatedMemberships.forEach(m => {
            console.log(`- ${m.name}: ${m.class_discount_percent}% (ID: ${m.id})`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await sequelize.close();
    }
}

debugMemberships();