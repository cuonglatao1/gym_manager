const express = require('express');
const cors = require('cors');
require('dotenv').config();

console.log('🚀 Starting Gym Manager API...');

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500'],
    credentials: true
}));

// Serve static files (frontend)
app.use(express.static('public'));

// Add auth routes FIRST (before other routes)
console.log('🔐 Loading auth routes...');
try {
    const authRoutes = require('./routes/auth.routes');
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes loaded successfully!');
} catch (error) {
    console.error('❌ Failed to load auth routes:', error.message);
}

// Basic routes
app.get('/', (req, res) => {
    res.json({ 
        message: 'Gym Manager API is running!',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            frontend: '/index.html'
        },
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK',
        message: 'Server is healthy',
        database: 'Ready to connect',
        timestamp: new Date().toISOString()
    });
});

// Test route for auth endpoints
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working!',
        availableEndpoints: [
            'GET /api/health',
            'GET /api/test',
            'POST /api/auth/register',
            'POST /api/auth/login',
            'POST /api/auth/refresh',
            'POST /api/auth/logout',
            'GET /api/auth/me'
        ]
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false,
        message: 'API endpoint không tồn tại',
        requestedUrl: req.originalUrl,
        availableEndpoints: ['/', '/api/health', '/api/test', '/api/auth']
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    res.status(500).json({ 
        success: false,
        message: 'Lỗi server',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server with database
const startServer = async () => {
    try {
        console.log('🔗 Connecting to database...');
        
        // Import database connection
        const { sequelize } = require('./config/database');
        
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ PostgreSQL connected successfully!');
        
        // Import models BEFORE syncing
        console.log('📋 Loading models...');
        const { User, RefreshToken } = require('./models');
        console.log('✅ Models loaded:', { User: !!User, RefreshToken: !!RefreshToken });
        
        // Sync database models with force=true to recreate tables
        console.log('🔄 Syncing database (force=true)...');
        await sequelize.sync({ force: true, logging: console.log });
        console.log('✅ Database synchronized!');
        
        // Create default admin
        await createDefaultAdmin(User);
        
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log('');
            console.log('🎉 ========================================');
            console.log('✅ Gym Manager API started successfully!');
            console.log('🎉 ========================================');
            console.log('');
            console.log(`🌐 Main API: http://localhost:${PORT}`);
            console.log(`💚 Health: http://localhost:${PORT}/api/health`);
            console.log(`🧪 Test: http://localhost:${PORT}/api/test`);
            console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
            console.log(`📱 Frontend: http://localhost:${PORT}/index.html`);
            console.log('');
            console.log('📋 Default Admin Account:');
            console.log('   📧 Email: admin@gym.com');
            console.log('   🔑 Password: admin123');
            console.log('');
            console.log('🚀 Ready for testing!');
            console.log('');
            console.log('🔧 Test your auth endpoints:');
            console.log(`   POST ${PORT}/api/auth/register`);
            console.log(`   POST ${PORT}/api/auth/login`);
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        console.error('Stack trace:', error.stack);
        console.log('');
        console.log('🔧 Common solutions:');
        console.log('1. Check PostgreSQL is running');
        console.log('2. Verify database credentials in .env');
        console.log('3. Ensure database "gym_manager" exists');
        console.log('4. Check routes/auth.js file exists');
        console.log('5. Check controllers/authController.js file exists');
        process.exit(1);
    }
};

// Create default admin user
async function createDefaultAdmin(User) {
    try {
        const bcrypt = require('bcryptjs');
        
        const adminExists = await User.findOne({ 
            where: { role: 'admin' } 
        });
        
        if (!adminExists) {
            const passwordHash = await bcrypt.hash('admin123', 12);
            
            await User.create({
                username: 'admin',
                email: 'admin@gym.com',
                passwordHash,
                fullName: 'Quản trị viên hệ thống',
                role: 'admin'
            });
            
            console.log('👤 Default admin created successfully!');
        } else {
            console.log('👤 Admin account already exists');
        }
    } catch (error) {
        console.error('⚠️  Failed to create admin:', error.message);
    }
}

// Initialize server
startServer();