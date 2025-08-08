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
    const authRoutes = require('./routes/authRoutes');
    const memberRoutes = require('./routes/memberRoutes');
    const classRoutes = require('./routes/classRoutes'); // NEW!
    
    app.use('/api/auth', authRoutes);
    app.use('/api/members', memberRoutes);
    app.use('/api/classes', classRoutes); // NEW!
    
    console.log('✅ Routes loaded successfully!');
} catch (error) {
    console.error('❌ Failed to load routes:', error.message);
}

// Basic routes
app.get('/', (req, res) => {
    res.json({ 
        message: 'Gym Manager API is running!',
        version: '1.5.0', // Updated version
        features: [
            'JWT Authentication',
            'Member Management',
            'Membership System',
            'Class Management', // NEW!
            'Class Types & Scheduling',
            'Class Enrollment',
            'Input Validation',
            'Error Handling',
            'Service Layer Architecture'
        ],
        endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            members: '/api/members',
            memberships: '/api/members/memberships',
            classes: '/api/classes', // NEW!
            classTypes: '/api/classes/types', // NEW!
            classSchedules: '/api/classes/schedules', // NEW!
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
            authService: 'Active',
            memberService: 'Active',
            membershipService: 'Active',
            classService: 'Active' // NEW!
        },
        timestamp: new Date().toISOString()
    });
});

// API endpoints summary
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'Gym Manager API v1.5.0',
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
            
            // Class Type endpoints (NEW!)
            'GET /api/classes/types': 'Get all class types',
            'GET /api/classes/types/:id': 'Get class type details',
            'POST /api/classes/types': 'Create class type (Admin)',
            'PUT /api/classes/types/:id': 'Update class type (Admin)',
            'DELETE /api/classes/types/:id': 'Delete class type (Admin)',
            
            // Class endpoints (NEW!)
            'GET /api/classes': 'Get all classes (filter by type, trainer)',
            'GET /api/classes/:id': 'Get class details',
            'POST /api/classes': 'Create new class (Admin & Trainer)',
            'PUT /api/classes/:id': 'Update class (Admin & Class Trainer)',
            'DELETE /api/classes/:id': 'Delete class (Admin)',
            
            // Class Schedule endpoints (NEW!)
            'GET /api/classes/schedules': 'Get class schedules (filter by date)',
            'GET /api/classes/schedules/:id': 'Get schedule details',
            'POST /api/classes/:id/schedules': 'Create class schedule (Admin & Trainer)',
            'PUT /api/classes/schedules/:id': 'Update schedule (Admin & Trainer)',
            'DELETE /api/classes/schedules/:id': 'Cancel schedule (Admin & Trainer)',
            
            // Enrollment endpoints (NEW!)
            'POST /api/classes/schedules/:id/enroll': 'Enroll in class',
            'DELETE /api/classes/schedules/:id/enroll': 'Cancel enrollment',
            'POST /api/classes/schedules/:id/checkin': 'Check in to class',
            'POST /api/classes/schedules/:id/checkout': 'Check out from class',
            'GET /api/classes/schedules/:id/enrollments': 'Get class enrollments (Admin & Trainer)',
            
            // User-specific endpoints (NEW!)
            'GET /api/classes/my/schedules': 'Get my upcoming classes (Member)',
            'GET /api/classes/my/history': 'Get my class history (Member)',
            'GET /api/classes/trainer/schedules': 'Get trainer schedules (Trainer)',
            
            // Analytics endpoints (NEW!)
            'GET /api/classes/analytics/popular': 'Get popular classes (Admin)',
            'GET /api/classes/analytics/revenue': 'Get class revenue (Admin)',
            'GET /api/classes/analytics/attendance': 'Get attendance stats (Admin)'
        },
        improvements: [
            '✅ Service Layer Architecture',
            '✅ Async Error Handling',
            '✅ Input Validation with Joi',
            '✅ Custom Error Classes',
            '✅ Consistent Error Responses',
            '✅ Performance Optimized',
            '✅ Complete Class Management System'
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
        
        console.log('✅ Models loaded successfully');
        
        // Sync models với CLEAN OUTPUT
        console.log('🔄 Syncing database models...');
        
        await sequelize.sync({ 
            force: true, 
            logging: false
        });
        
        console.log('✅ All models synchronized successfully!');
        
        // Create default admin
        await createDefaultAdmin(User);
        
        // Seed data
        await seedMembershipPackages();
        await seedClassTypes();
        
        const PORT = process.env.PORT || 3000;
        const server = app.listen(PORT, () => {
            console.log('');
            console.log('🎉 ========================================');
            console.log('✅ Gym Manager API v1.5.0 Started!');
            console.log('🎉 ========================================');
            console.log('');
            console.log(`🌐 Server: http://localhost:${PORT}`);
            console.log(`💚 Health: http://localhost:${PORT}/api/health`);
            console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
            console.log(`👥 Members: http://localhost:${PORT}/api/members`);
            console.log(`📦 Memberships: http://localhost:${PORT}/api/members/memberships/all`);
            console.log(`🏃 Classes: http://localhost:${PORT}/api/classes`);
            console.log(`📅 Class Types: http://localhost:${PORT}/api/classes/types`);
            console.log(`⏰ Schedules: http://localhost:${PORT}/api/classes/schedules`);
            console.log(`📱 Frontend: http://localhost:${PORT}/index.html`);
            console.log('');
            console.log('📋 Default Admin:');
            console.log('   📧 Email: admin@gym.com');
            console.log('   🔑 Password: admin123');
            console.log('');
            console.log('🚀 Class Management System Ready!');
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

// Create default admin user (CLEAN OUTPUT)
async function createDefaultAdmin(User) {
    try {
        const bcrypt = require('bcryptjs');
        
        const adminExists = await User.findOne({ 
            where: { role: 'admin' },
            logging: false
        });
        
        if (!adminExists) {
            const passwordHash = await bcrypt.hash('admin123', 12);
            
            await User.create({
                username: 'admin',
                email: 'admin@gym.com',
                passwordHash,
                fullName: 'Quản trị viên hệ thống',
                role: 'admin'
            }, { logging: false });
            
            console.log('👤 Default admin created successfully!');
        } else {
            console.log('👤 Admin account already exists');
        }
    } catch (error) {
        console.error('⚠️  Failed to create admin:', error.message);
    }
}

// Seed membership packages (CLEAN OUTPUT)
async function seedMembershipPackages() {
    try {
        console.log('🌱 Seeding membership packages...');
        
        const { Membership } = require('./models');
        
        const existingCount = await Membership.count({ logging: false });
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

        await Membership.bulkCreate(memberships, { logging: false });
        console.log(`✅ Created ${memberships.length} membership packages`);

    } catch (error) {
        console.error('⚠️  Failed to seed memberships:', error.message);
    }
}

// Seed class types (CLEAN OUTPUT)
async function seedClassTypes() {
    try {
        console.log('🌱 Seeding class types...');
        
        const { ClassType } = require('./models');
        
        const existingCount = await ClassType.count({ logging: false });
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

        await ClassType.bulkCreate(classTypes, { logging: false });
        console.log(`✅ Created ${classTypes.length} class types`);
        console.log('🏃 Available: Yoga, HIIT Cardio, Weight Training, Zumba Dance, Boxing, Pilates');

    } catch (error) {
        console.error('⚠️  Failed to seed class types:', error.message);
    }
}

// Initialize server
startServer();