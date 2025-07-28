require('dotenv').config();
const { Sequelize } = require('sequelize');

async function createDatabase() {
    console.log('🔗 Creating database...');
    
    // Kết nối đến database mặc định 'postgres'
    const sequelize = new Sequelize(
        'postgres',
        process.env.DB_USER,
        process.env.DB_PASSWORD,
        {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            dialect: 'postgres',
            logging: false
        }
    );

    try {
        await sequelize.authenticate();
        console.log('✅ Connected to PostgreSQL server');
        
        // Tạo database
        await sequelize.query(`CREATE DATABASE ${process.env.DB_NAME};`);
        console.log(`✅ Database '${process.env.DB_NAME}' created successfully!`);
        
    } catch (error) {
        if (error.message.includes('already exists')) {
            console.log(`✅ Database '${process.env.DB_NAME}' already exists!`);
        } else {
            console.error('❌ Error creating database:', error.message);
        }
    } finally {
        await sequelize.close();
    }
}

createDatabase();