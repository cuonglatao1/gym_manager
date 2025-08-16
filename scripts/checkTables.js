// scripts/checkTables.js
const { sequelize } = require('../config/database');

async function checkTables() {
    try {
        console.log('🔍 Checking database tables...');
        
        // Connect to database
        await sequelize.authenticate();
        console.log('✅ Database connected');
        
        // Get table names using different query
        const [results] = await sequelize.query(`
            SELECT tablename 
            FROM pg_catalog.pg_tables 
            WHERE schemaname = 'public'
            ORDER BY tablename
        `);
        
        console.log('📋 Database tables:');
        results.forEach(row => {
            console.log(`   - ${row.tablename}`);
        });
        
        // Check if promotions table exists
        const promotionsExists = results.some(row => row.tablename === 'promotions');
        console.log(`\n🎁 Promotions table exists: ${promotionsExists ? '✅' : '❌'}`);
        
        if (!promotionsExists) {
            console.log('🔧 Creating promotions table...');
            await sequelize.sync({ alter: true });
            console.log('✅ Tables created/updated');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error checking tables:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    checkTables();
}

module.exports = checkTables;