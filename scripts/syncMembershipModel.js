const { sequelize } = require('../config/database');

async function syncMembershipModel() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected successfully!');

        // Add new columns to memberships table
        const newColumns = [
            {
                name: 'features',
                definition: 'JSON'
            },
            {
                name: 'access_level',
                definition: "VARCHAR(255) NOT NULL DEFAULT 'basic' CHECK (access_level IN ('basic', 'premium', 'vip', 'elite'))"
            },
            {
                name: 'can_access_premium_classes',
                definition: 'BOOLEAN NOT NULL DEFAULT FALSE'
            },
            {
                name: 'free_personal_trainer_sessions',
                definition: 'INTEGER NOT NULL DEFAULT 0'
            },
            {
                name: 'priority',
                definition: 'INTEGER NOT NULL DEFAULT 0'
            },
            {
                name: 'color',
                definition: "VARCHAR(7) DEFAULT '#3498db'"
            }
        ];

        for (const column of newColumns) {
            try {
                await sequelize.query(`
                    ALTER TABLE memberships 
                    ADD COLUMN ${column.name} ${column.definition}
                `);
                console.log(`✅ Added column: ${column.name}`);
            } catch (error) {
                if (error.message.includes('already exists')) {
                    console.log(`⚠️ Column ${column.name} already exists`);
                } else {
                    console.error(`❌ Error adding column ${column.name}:`, error.message);
                }
            }
        }

        console.log('🎉 Membership model sync completed!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await sequelize.close();
    }
}

syncMembershipModel();