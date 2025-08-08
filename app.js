const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import error handling
const { globalErrorHandler } = require('./middleware/errorHandler');

console.log('🚀 Starting Gym Manager API...');

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
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
        version: '1.4.0',
        features: [
            'JWT Authentication',
            'Member Management',
            'Membership System',
            'Class Management', // New!
            'Class Types & Scheduling', // New!
            'Class Enrollment', // New!
            'Input Validation',
            'Error Handling',
            'Service Layer Architecture'
        ],
        endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            members: '/api/members',
            memberships: '/api/members/memberships',
            classes: '/api/classes', // New!
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
        services: {
            memberService: 'Active',
            membershipService: 'Active',
            classService: 'Active', // New!
            authService: 'Active'
        },
        timestamp: new Date().toISOString()
    });
});

// API endpoints summary
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'Gym Manager API v1.4.0',
        architecture: 'Service Layer + Validation + Error Handling + Class Management',
        endpoints: {
            // Auth endpoints
            'POST /api/auth/register': 'Register new user account',
            'POST /api/auth/login': 'Login user',
            'POST /api/auth/logout': 'Logout user',
            'POST /api/auth/refresh': 'Refresh access token',
            'GET /api/auth/me': 'Get current user profile',
            
            // Member endpoints
            'POST /api/members/register': 'Register new gym member (with validation)',
            'GET /api/members': 'Get all members (paginated, searchable)',
            'GET /api/members/statistics': 'Get member statistics (Admin)',
            'GET /api/members/:id': 'Get member details',
            'PUT /api/members/:id': 'Update member info (with validation)',
            'POST /api/members/:id/membership': 'Purchase membership for member',
            'GET /api/members/:id/active-membership': 'Get member active membership',
            
            // Membership endpoints
            'GET /api/members/memberships/all': 'Get all membership packages',
            'GET /api/members/memberships/popular': 'Get popular memberships',
            'GET /api/members/memberships/:id': 'Get membership details',
            'POST /api/members/memberships': 'Create new membership package (Admin)',
            'PUT /api/members/memberships/:id': 'Update membership package (Admin)',
            'DELETE /api/members/memberships/:id': 'Delete membership package (Admin)',
            'GET /api/members/memberships/:id/statistics': 'Get membership statistics (Admin)',
            'GET /api/members/memberships/analytics/revenue': 'Get revenue analytics (Admin)',
            
            // Class endpoints (New!)
            'GET /api/classes/types': 'Get all class types',
            'GET /api/classes': 'Get all classes (filter by type, trainer, day)',
            'GET /api/classes/schedules': 'Get class schedules (filter by date)',
            'POST /api/classes/schedules/:id/enroll': 'Enroll in class',
            'POST /api/classes/schedules/:id/checkin': 'Check-in to class'
        },
        improvements: [
            '✅ Service Layer Architecture',
            '✅ Async Error Handling',
            '✅ Input Validation with Joi',
            '✅ Custom Error Classes',
            '✅ Consistent Error Responses',
            '✅ Performance Optimized',
            '✅ Class Management System' // New!
        ]
    });
});

// Handle undefined routes
app.all('*', (req, res, next) => {
    const { NotFoundError } = require('./middleware/errorHandler');
    next(new NotFoundError(`Route ${req.originalUrl} not found`));
});

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

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
        const { 
            User, 
            RefreshToken, 
            Member, 
            Membership, 
            MembershipHistory,
            ClassType,
            Class,
            ClassSchedule,
            ClassEnrollment
        } = require('./models');
        
        console.log('✅ Models loaded:', { 
            User: !!User, 
            RefreshToken: !!RefreshToken,
            Member: !!Member,
            Membership: !!Membership,
            MembershipHistory: !!MembershipHistory,
            ClassType: !!ClassType,
            Class: !!Class,
            ClassSchedule: !!ClassSchedule,
            ClassEnrollment: !!ClassEnrollment
        });
        
       // Sync database models - SIMPLE FORCE SYNC
console.log('🔄 Syncing database (force=true for clean database)...');

// Force sync - will recreate all tables in correct order
await sequelize.sync({ force: true, logging: false });
console.log('✅ Database synchronized!');
        
        // Create default admin
        await createDefaultAdmin(User);
        
        // Seed membership packages
        await seedMembershipPackages();
        
        // Seed class types
        await seedClassTypes();
        
        const PORT = process.env.PORT || 3000;
        const server = app.listen(PORT, () => {
            console.log('');
            console.log('🎉 ========================================');
            console.log('✅ Gym Manager API v1.4.0 Started!');
            console.log('🎉 ========================================');
            console.log('');
            console.log(`🌐 Main API: http://localhost:${PORT}`);
            console.log(`💚 Health: http://localhost:${PORT}/api/health`);
            console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
            console.log(`👥 Members: http://localhost:${PORT}/api/members`);
            console.log(`📦 Memberships: http://localhost:${PORT}/api/members/memberships/all`);
            console.log(`🏃 Classes: http://localhost:${PORT}/api/classes (Coming Soon!)`);
            console.log(`📱 Frontend: http://localhost:${PORT}/index.html`);
            console.log('');
            console.log('🏗️ Architecture:');
            console.log('   ✅ Service Layer Pattern');
            console.log('   ✅ Async Error Handling');
            console.log('   ✅ Input Validation (Joi)');
            console.log('   ✅ Custom Error Classes');
            console.log('   ✅ Consistent API Responses');
            console.log('   ✅ Class Management System');
            console.log('');
            console.log('📋 Default Admin Account:');
            console.log('   📧 Email: admin@gym.com');
            console.log('   🔑 Password: admin123');
            console.log('');
            console.log('🚀 Ready for Class Management development!');
            console.log('');
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('👋 SIGTERM received');
            console.log('🔄 Shutting down gracefully');
            server.close(() => {
                console.log('✅ Process terminated');
            });
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        console.error('Stack trace:', error.stack);
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

// Seed class types
async function seedClassTypes() {
    try {
        console.log('🌱 Seeding class types...');
        
        const { ClassType } = require('./models');
        
        // Check if class types already exist
        const existingCount = await ClassType.count();
        if (existingCount > 0) {
            console.log('✅ Class types already exist');
            return;
        }

        const classTypes = [
            {
                name: 'Yoga',
                description: 'Lớp yoga thư giãn và rèn luyện sự dẻo dai',
                duration: 60,
                maxParticipants: 20,
                equipment: ['yoga mat', 'yoga block', 'yoga strap'],
                difficulty: 'beginner',
                color: '#9b59b6'
            },
            {
                name: 'HIIT Cardio',
                description: 'High Intensity Interval Training - Đốt cháy calo nhanh chóng',
                duration: 45,
                maxParticipants: 15,
                equipment: ['dumbbells', 'resistance bands', 'step platform'],
                difficulty: 'intermediate',
                color: '#e74c3c'
            },
            {
                name: 'Weight Training',
                description: 'Tập tạ và rèn luyện sức mạnh',
                duration: 90,
                maxParticipants: 10,
                equipment: ['barbells', 'dumbbells', 'weight plates', 'bench'],
                difficulty: 'intermediate',
                color: '#34495e'
            },
            {
                name: 'Zumba Dance',
                description: 'Múa Zumba năng động và vui nhộn',
                duration: 60,
                maxParticipants: 25,
                equipment: ['sound system', 'microphone'],
                difficulty: 'beginner',
                color: '#f39c12'
            },
            {
                name: 'Boxing',
                description: 'Tập boxing cơ bản và nâng cao',
                duration: 75,
                maxParticipants: 12,
                equipment: ['boxing gloves', 'punching bags', 'hand wraps'],
                difficulty: 'intermediate',
                color: '#c0392b'
            },
            {
                name: 'Pilates',
                description: 'Pilates cho sự uyển chuyển và sức mạnh cốt lõi',
                duration: 60,
                maxParticipants: 15,
                equipment: ['pilates mat', 'pilates ball', 'resistance bands'],
                difficulty: 'beginner',
                color: '#16a085'
            }
        ];

        await ClassType.bulkCreate(classTypes);
        console.log(`✅ Created ${classTypes.length} class types`);

        // Log the created class types
        const createdClassTypes = await ClassType.findAll({
            order: [['name', 'ASC']]
        });

        console.log('🏃 Available class types:');
        createdClassTypes.forEach(classType => {
            console.log(`   - ${classType.name}: ${classType.duration}min, max ${classType.maxParticipants} people (${classType.difficulty})`);
        });

    } catch (error) {
        console.error('⚠️  Failed to seed class types:', error.message);
    }
}

// Initialize server
startServer();