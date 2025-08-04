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

// Add routes
console.log('🔐 Loading routes...');
try {
    const authRoutes = require('./routes/auth.routes');
    const memberRoutes = require('./routes/member.routes');
    
    app.use('/api/auth', authRoutes);
    app.use('/api/members', memberRoutes);
    
    console.log('✅ Routes loaded successfully!');
} catch (error) {
    console.error('❌ Failed to load routes:', error.message);
}

// Basic routes
app.get('/', (req, res) => {
    res.json({ 
        message: 'Gym Manager API is running!',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            members: '/api/members',
            memberships: '/api/members/memberships',
            frontend: '/index.html'
        },
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK',
        message: 'Server is healthy',
        database: 'Connected',
        timestamp: new Date().toISOString()
    });
});

// API endpoints summary
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'Gym Manager API',
        version: '1.0.0',
        endpoints: {
            // Auth endpoints
            'POST /api/auth/register': 'Register new user account',
            'POST /api/auth/login': 'Login user',
            'POST /api/auth/logout': 'Logout user',
            'POST /api/auth/refresh': 'Refresh access token',
            'GET /api/auth/me': 'Get current user profile',
            
            // Member endpoints
            'POST /api/members/register': 'Register new gym member',
            'GET /api/members': 'Get all members (paginated)',
            'GET /api/members/:id': 'Get member details',
            'PUT /api/members/:id': 'Update member info',
            'POST /api/members/:id/membership': 'Purchase membership for member',
            
            // Membership endpoints
            'GET /api/members/memberships/all': 'Get all membership packages',
            'GET /api/members/memberships/:id': 'Get membership details',
            'POST /api/members/memberships': 'Create new membership package (Admin)',
            'PUT /api/members/memberships/:id': 'Update membership package (Admin)',
            'DELETE /api/members/memberships/:id': 'Delete membership package (Admin)',
            'GET /api/members/memberships/:id/statistics': 'Get membership statistics (Admin)'
        }
    });
});

// Test route
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working!',
        availableEndpoints: [
            'GET /api/health',
            'GET /api/test',
            'POST /api/auth/register',
            'POST /api/auth/login',
            'POST /api/members/register',
            'GET /api/members/memberships/all'
        ]
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false,
        message: 'API endpoint không tồn tại',
        requestedUrl: req.originalUrl,
        availableEndpoints: ['/api', '/api/health', '/api/auth', '/api/members']
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
        
        // Import models
        console.log('📋 Loading models...');
        const { User, RefreshToken, Member, Membership, MembershipHistory } = require('./models');
        console.log('✅ Models loaded:', { 
            User: !!User, 
            RefreshToken: !!RefreshToken,
            Member: !!Member,
            Membership: !!Membership,
            MembershipHistory: !!MembershipHistory
        });
        
        // Sync database models (không force để giữ dữ liệu cũ)
        console.log('🔄 Syncing database...');
        await sequelize.sync({ force: false, alter: true, logging: false });
        console.log('✅ Database synchronized!');
        
        // Create default admin
        await createDefaultAdmin(User);
        
        // Seed membership packages
        await seedMembershipPackages();
        
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log('');
            console.log('🎉 ========================================');
            console.log('✅ Gym Manager API started successfully!');
            console.log('🎉 ========================================');
            console.log('');
            console.log(`🌐 Main API: http://localhost:${PORT}`);
            console.log(`💚 Health: http://localhost:${PORT}/api/health`);
            console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
            console.log(`👥 Members: http://localhost:${PORT}/api/members`);
            console.log(`📦 Memberships: http://localhost:${PORT}/api/members/memberships/all`);
            console.log(`📱 Frontend: http://localhost:${PORT}/index.html`);
            console.log('');
            console.log('📋 Default Admin Account:');
            console.log('   📧 Email: admin@gym.com');
            console.log('   🔑 Password: admin123');
            console.log('');
            console.log('🚀 Ready for Member Management!');
            console.log('');
            console.log('🔧 Quick Test Commands:');
            console.log(`   curl http://localhost:${PORT}/api/members/memberships/all`);
            console.log(`   curl -X POST http://localhost:${PORT}/api/members/register \\`);
            console.log(`        -H "Content-Type: application/json" \\`);
            console.log(`        -d '{"fullName":"Test User","phone":"0123456789"}'`);
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        console.error('Stack trace:', error.stack);
        console.log('');
        console.log('🔧 Common solutions:');
        console.log('1. Check PostgreSQL is running');
        console.log('2. Verify database credentials in .env');
        console.log('3. Ensure database exists');
        console.log('4. Check all model files are created');
        console.log('5. Check all route files are created');
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

// Seed membership packages
async function seedMembershipPackages() {
    try {
        console.log('🌱 Seeding membership packages...');
        
        const { Membership } = require('./models');
        
        // Check if memberships already exist
        const existingCount = await Membership.count();
        if (existingCount > 0) {
            console.log('✅ Membership packages already exist');
            return;
        }

        const memberships = [
            {
                name: 'Basic Monthly',
                description: 'Gói cơ bản 1 tháng - Sử dụng thiết bị gym và khu vực cardio',
                duration: 30,
                price: 500000,
                benefits: ['Sử dụng thiết bị gym', 'Khu vực cardio', 'Phòng thay đồ và tắm', 'WiFi miễn phí'],
                maxClasses: 4,
                hasPersonalTrainer: false
            },
            {
                name: 'Premium Monthly',
                description: 'Gói cao cấp 1 tháng - Bao gồm các lớp tập và hỗ trợ PT',
                duration: 30,
                price: 800000,
                benefits: ['Tất cả quyền lợi của gói Basic', 'Tham gia tất cả lớp tập', '2 buổi tư vấn với PT', 'Đo chỉ số cơ thể miễn phí'],
                maxClasses: null,
                hasPersonalTrainer: true
            },
            {
                name: 'VIP Monthly',
                description: 'Gói VIP 1 tháng - Dịch vụ hoàn hảo với PT riêng',
                duration: 30,
                price: 1200000,
                benefits: ['Tất cả quyền lợi của gói Premium', '8 buổi PT 1-1 riêng', 'Chế độ dinh dưỡng cá nhân', 'Massage thư giãn 2 lần/tháng'],
                maxClasses: null,
                hasPersonalTrainer: true
            },
            {
                name: 'Basic Quarterly',
                description: 'Gói cơ bản 3 tháng - Tiết kiệm 15%',
                duration: 90,
                price: 1275000,
                benefits: ['Sử dụng thiết bị gym', 'Khu vực cardio', 'Tiết kiệm 15% so với gói tháng'],
                maxClasses: 12,
                hasPersonalTrainer: false
            },
            {
                name: 'Student Monthly',
                description: 'Gói sinh viên 1 tháng - Ưu đãi đặc biệt',
                duration: 30,
                price: 300000,
                benefits: ['Sử dụng thiết bị gym cơ bản', 'Khu vực cardio', 'Giảm 40% cho sinh viên'],
                maxClasses: 2,
                hasPersonalTrainer: false
            }
        ];

        await Membership.bulkCreate(memberships);
        console.log(`✅ Created ${memberships.length} membership packages`);

    } catch (error) {
        console.error('⚠️  Failed to seed memberships:', error.message);
    }
}

// Initialize server
startServer();