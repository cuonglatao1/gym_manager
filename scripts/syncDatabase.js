// scripts/syncDatabase.js
const { sequelize } = require('../config/database');
const models = require('../models');

async function syncDatabase() {
    try {
        console.log('🔄 Synchronizing database schema...');
        
        // Connect to database
        await sequelize.authenticate();
        console.log('✅ Database connected');
        
        // Sync all models
        await sequelize.sync({ alter: true });
        console.log('✅ Database schema synchronized');
        
        // List all tables
        const tables = await sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'", {
            type: sequelize.QueryTypes.SELECT
        });
        
        console.log('📋 Available tables:');
        tables.forEach(table => {
            console.log(`   - ${table.table_name}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error syncing database:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    syncDatabase();
}

module.exports = syncDatabase;