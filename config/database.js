const { Sequelize } = require('sequelize');
require('dotenv').config();

// Tạo kết nối Sequelize với PostgreSQL
const sequelize = new Sequelize(
    process.env.DB_NAME || 'gym_manager_simple',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        
        // TẮT TẤT CẢ LOGGING
        logging: false,  // Tắt hoàn toàn SQL logs
        
        // Connection pool
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        
        // Timezone
        timezone: '+07:00',
        
        // Model settings
        define: {
            timestamps: true,
            underscored: true,
            freezeTableName: true
        },
        
        // Tắt query logging và warnings
        dialectOptions: {
            // Tắt PostgreSQL notices/warnings
        },
        
        // Tắt Sequelize deprecation warnings
        benchmark: false,
        
        // Tắt query types logging
        logQueryParameters: false
    }
);

// Test kết nối database (SILENT)
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Kết nối PostgreSQL thành công!');
        return true;
    } catch (error) {
        console.error('❌ Không thể kết nối PostgreSQL:', error.message);
        return false;
    }
};

module.exports = {
    sequelize,
    testConnection
};