const { sequelize } = require('../config/database');

async function addDiscountColumn() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected successfully!');

        // Add the column manually
        await sequelize.getQueryInterface().addColumn('memberships', 'class_discount_percent', {
            type: sequelize.Sequelize.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 0,
            validate: {
                min: 0,
                max: 100
            },
            comment: 'Discount percentage for class bookings (0-100)'
        });

        console.log('✅ Added class_discount_percent column to memberships table');

        // Update existing records
        await sequelize.query(`
            UPDATE memberships 
            SET class_discount_percent = CASE 
                WHEN name = 'Basic' THEN 0
                WHEN name = 'Premium' THEN 15
                WHEN name = 'VIP' THEN 25
                WHEN name = 'Elite' THEN 30
                ELSE 0
            END
        `);

        console.log('✅ Updated existing memberships with discount percentages');

        console.log('🎉 Migration completed successfully!');

    } catch (error) {
        if (error.message.includes('already exists')) {
            console.log('✅ Column already exists, updating data...');
            
            // Just update the data
            await sequelize.query(`
                UPDATE memberships 
                SET class_discount_percent = CASE 
                    WHEN name = 'Basic' THEN 0
                    WHEN name = 'Premium' THEN 15
                    WHEN name = 'VIP' THEN 25
                    WHEN name = 'Elite' THEN 30
                    ELSE 0
                END
            `);
            
            console.log('✅ Updated existing memberships with discount percentages');
        } else {
            console.error('❌ Error:', error.message);
        }
    } finally {
        await sequelize.close();
    }
}

addDiscountColumn();