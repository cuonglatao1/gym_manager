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

// Debug endpoints (before other routes)
console.log('🔍 Loading debug endpoints...');

// Debug endpoint to check users and members
app.get('/api/debug/users', async (req, res) => {
    try {
        const { User, Member } = require('./models');
        
        const users = await User.findAll({
            attributes: ['id', 'username', 'email', 'fullName', 'role'],
            include: [
                {
                    model: Member,
                    as: 'member',
                    required: false,
                    attributes: ['id', 'memberCode', 'fullName', 'isActive']
                }
            ]
        });
        
        console.log('🔍 Debug - Total users found:', users.length);
        users.forEach(user => {
            console.log(`👤 User: ${user.email} (${user.role}) - Member: ${user.member ? user.member.memberCode : 'NO MEMBER'}`);
        });
        
        res.json({
            success: true,
            data: {
                totalUsers: users.length,
                users: users
            }
        });
    } catch (error) {
        console.error('Debug users error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Debug endpoint to check classes and schedules
app.get('/api/debug/classes', async (req, res) => {
    try {
        const { Class, ClassSchedule, ClassType, User } = require('./models');
        
        const classes = await Class.findAll({
            include: [
                {
                    model: ClassType,
                    as: 'classType',
                    required: false
                },
                {
                    model: User,
                    as: 'trainer',
                    required: false
                }
            ]
        });
        
        const schedules = await ClassSchedule.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']]
        });
        
        console.log('🔍 Debug - Total classes found:', classes.length);
        console.log('🔍 Debug - Total schedules found:', schedules.length);
        
        res.json({
            success: true,
            data: {
                totalClasses: classes.length,
                totalSchedules: schedules.length,
                classes: classes,
                recentSchedules: schedules
            }
        });
    } catch (error) {
        console.error('Debug classes error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Debug endpoint to force create sample members
app.post('/api/debug/create-members', async (req, res) => {
    try {
        console.log('🔧 Force creating sample members...');
        await seedSampleMembers();
        res.json({
            success: true,
            message: 'Sample members creation attempted - check console logs'
        });
    } catch (error) {
        console.error('Force create members error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

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
            force: true,  // Reset database for clean sequential IDs
            logging: false
        });
        
        console.log('✅ All models synchronized successfully!');
        console.log('🔄  Database reset with clean sequential IDs!');
        
        // Create default admin (ID: 1)
        await createDefaultAdmin(User);
        
        // Create trainers immediately after admin for sequential IDs (ID: 2, 3, 4, 5)
        await seedSampleTrainers();
        
        // Seed other data
        await seedMembershipPackages();
        await seedClassTypes();
        await seedSampleClasses();
        await seedSampleSchedules();
        
        // Seed members but don't crash if it fails
        try {
            await seedSampleMembers();
        } catch (memberError) {
            console.error('⚠️  Member seeding failed, but continuing server startup:', memberError.message);
        }
        
        // Update trainer assignments to diversify (trainers should now have sequential IDs)
        await updateScheduleTrainerAssignments();
        
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

        // Handle server errors
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} is already in use`);
                console.error('💡 Try running: npx kill-port ${PORT}');
                console.error('⏳ Waiting 5 seconds then trying again...');
                
                setTimeout(() => {
                    server.close();
                    // Try with next available port
                    const nextPORT = PORT + 1;
                    console.log(`🔄 Trying port ${nextPORT}...`);
                    
                    app.listen(nextPORT, () => {
                        console.log(`✅ Server started on port ${nextPORT} instead`);
                        console.log(`🌐 Server: http://localhost:${nextPORT}`);
                    }).on('error', (err2) => {
                        console.error('❌ Failed to start on alternate port:', err2.message);
                        process.exit(1);
                    });
                }, 5000);
            } else {
                console.error('❌ Server error:', err.message);
                process.exit(1);
            }
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
        const { Member } = require('./models');
        
        const adminExists = await User.findOne({ 
            where: { role: 'admin' },
            logging: false
        });
        
        if (!adminExists) {
            const passwordHash = await bcrypt.hash('admin123', 12);
            
            const adminUser = await User.create({
                username: 'admin',
                email: 'admin@gym.com',
                passwordHash,
                fullName: 'Quản trị viên hệ thống',
                role: 'admin'
            }, { logging: false });

            // Create corresponding Member record for admin (so admin can also enroll)
            await Member.create({
                userId: adminUser.id,
                memberCode: 'ADMIN001',
                fullName: 'Quản trị viên hệ thống',
                phone: '0987654321',
                email: 'admin@gym.com',
                joinDate: new Date(),
                isActive: true
            }, { logging: false });
            
            console.log('👤 Default admin created successfully!');
            console.log('👥 Admin Member record created for enrollment testing');
        } else {
            // Check if admin has Member record
            const adminMember = await Member.findOne({ 
                where: { userId: adminExists.id },
                logging: false 
            });
            
            if (!adminMember) {
                // Create Member record for existing admin
                await Member.create({
                    userId: adminExists.id,
                    memberCode: 'ADMIN001',
                    fullName: adminExists.fullName,
                    phone: '0987654321',
                    email: adminExists.email,
                    joinDate: new Date(),
                    isActive: true
                }, { logging: false });
                
                console.log('👥 Admin Member record created for enrollment testing');
            } else {
                console.log('👤 Admin account and Member record already exist');
            }
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

// Seed sample classes (CLEAN OUTPUT)
async function seedSampleClasses() {
    try {
        console.log('🌱 Seeding sample classes...');
        
        const { Class, ClassType, User } = require('./models');
        
        const existingCount = await Class.count({ logging: false });
        if (existingCount > 0) {
            console.log('✅ Sample classes already exist');
            return;
        }

        // Get actual trainers (not admin)
        const trainers = await User.findAll({ 
            where: { role: 'trainer' },
            logging: false 
        });

        if (trainers.length === 0) {
            console.log('⚠️  No trainers found, using admin as fallback');
            const adminTrainer = await User.findOne({ 
                where: { role: 'admin' },
                logging: false 
            });
            if (!adminTrainer) return;
            trainers.push(adminTrainer);
        }

        // Get class types
        const classTypes = await ClassType.findAll({ logging: false });
        if (classTypes.length === 0) {
            console.log('⚠️  No class types found');
            return;
        }

        const sampleClasses = [];

        // Create classes for each type
        classTypes.forEach(classType => {
            switch (classType.name) {
                case 'Yoga':
                    sampleClasses.push({
                        classTypeId: classType.id,
                        name: 'Morning Yoga Flow',
                        description: 'Lớp yoga buổi sáng nhẹ nhàng, phù hợp với mọi cấp độ',
                        trainerId: trainers[0].id,
                        duration: 60,
                        maxParticipants: 20,
                        price: 150000,
                        room: 'Studio A'
                    });
                    sampleClasses.push({
                        classTypeId: classType.id,
                        name: 'Evening Yoga Relax',
                        description: 'Lớp yoga buổi tối thư giãn, giảm stress',
                        trainerId: trainers[1] ? trainers[1].id : trainers[0].id,
                        duration: 60,
                        maxParticipants: 20,
                        price: 150000,
                        room: 'Studio A'
                    });
                    break;

                case 'HIIT Cardio':
                    sampleClasses.push({
                        classTypeId: classType.id,
                        name: 'Power HIIT',
                        description: 'Lớp HIIT cường độ cao, đốt cháy calo tối đa',
                        trainerId: trainers[Math.floor(Math.random() * trainers.length)].id,
                        duration: 45,
                        maxParticipants: 15,
                        price: 200000,
                        room: 'Gym Area 1'
                    });
                    break;

                case 'Weight Training':
                    sampleClasses.push({
                        classTypeId: classType.id,
                        name: 'Strength Building',
                        description: 'Tập tạ cơ bản cho người mới bắt đầu',
                        trainerId: trainers[Math.floor(Math.random() * trainers.length)].id,
                        duration: 90,
                        maxParticipants: 8,
                        price: 250000,
                        room: 'Weight Room'
                    });
                    break;

                case 'Zumba Dance':
                    sampleClasses.push({
                        classTypeId: classType.id,
                        name: 'Zumba Party',
                        description: 'Nhảy Zumba vui nhộn, năng động',
                        trainerId: trainers[Math.floor(Math.random() * trainers.length)].id,
                        duration: 60,
                        maxParticipants: 25,
                        price: 180000,
                        room: 'Dance Studio'
                    });
                    break;

                case 'Boxing':
                    sampleClasses.push({
                        classTypeId: classType.id,
                        name: 'Boxing Fundamentals',
                        description: 'Học boxing cơ bản, kỹ thuật cơ bản',
                        trainerId: trainers[Math.floor(Math.random() * trainers.length)].id,
                        duration: 75,
                        maxParticipants: 10,
                        price: 220000,
                        room: 'Boxing Ring'
                    });
                    break;

                case 'Pilates':
                    sampleClasses.push({
                        classTypeId: classType.id,
                        name: 'Core Pilates',
                        description: 'Pilates tập trung vào cơ core và sự uyển chuyển',
                        trainerId: trainers[Math.floor(Math.random() * trainers.length)].id,
                        duration: 60,
                        maxParticipants: 15,
                        price: 170000,
                        room: 'Studio B'
                    });
                    break;
            }
        });

        await Class.bulkCreate(sampleClasses, { logging: false });
        console.log(`✅ Created ${sampleClasses.length} sample classes`);

    } catch (error) {
        console.error('⚠️  Failed to seed sample classes:', error.message);
    }
}

// Seed sample schedules (CLEAN OUTPUT)
async function seedSampleSchedules() {
    try {
        console.log('🌱 Seeding sample schedules...');
        
        const { ClassSchedule, Class, User } = require('./models');
        
        const existingCount = await ClassSchedule.count({ logging: false });
        if (existingCount > 0) {
            console.log('✅ Sample schedules already exist');
            return;
        }

        // Get all classes with proper validation
        const classes = await Class.findAll({ 
            include: [{ 
                model: User, 
                as: 'trainer',
                required: true // Ensure every class has a trainer
            }],
            logging: false 
        });

        console.log(`🔍 Found ${classes.length} classes for scheduling`);
        
        if (classes.length === 0) {
            console.log('⚠️  No classes found for scheduling');
            return;
        }

        // Validate that classes have proper data
        const validClasses = classes.filter(cls => {
            const isValid = cls.id && cls.trainerId && cls.duration && cls.maxParticipants && cls.room;
            if (!isValid) {
                console.log('⚠️  Invalid class found:', cls.name, 'Missing required fields');
            }
            return isValid;
        });

        console.log(`✅ Valid classes for scheduling: ${validClasses.length}`);

        if (validClasses.length === 0) {
            console.log('❌ No valid classes found for scheduling');
            return;
        }

        const sampleSchedules = [];
        const today = new Date();
        
        // Create schedules for the next 2 weeks
        for (let day = 0; day < 14; day++) {
            const scheduleDate = new Date(today);
            scheduleDate.setDate(today.getDate() + day);
            const dateStr = scheduleDate.toISOString().split('T')[0];

            // Morning sessions (6:00, 7:00, 8:00, 9:00)
            const morningTimes = ['06:00', '07:00', '08:00', '09:00'];
            
            // Evening sessions (17:00, 18:00, 19:00, 20:00)
            const eveningTimes = ['17:00', '18:00', '19:00', '20:00'];

            const allTimes = [...morningTimes, ...eveningTimes];

            // Schedule 3-4 classes per day randomly
            const dailyClassCount = Math.floor(Math.random() * 2) + 3; // 3-4 classes
            const selectedTimes = allTimes.sort(() => 0.5 - Math.random()).slice(0, dailyClassCount);

            for (let timeSlot of selectedTimes) {
                try {
                    // Pick a random valid class
                    const randomClass = validClasses[Math.floor(Math.random() * validClasses.length)];
                    
                    console.log(`🔧 Creating schedule for class: ${randomClass.name} (ID: ${randomClass.id}) on ${dateStr} at ${timeSlot}`);
                    
                    const [hours, minutes] = timeSlot.split(':').map(Number);
                    const startTime = new Date(scheduleDate);
                    startTime.setHours(hours, minutes, 0, 0);
                    
                    const endTime = new Date(startTime);
                    endTime.setMinutes(startTime.getMinutes() + randomClass.duration);

                    const scheduleData = {
                        classId: randomClass.id,
                        date: dateStr,
                        startTime: startTime.toISOString(),
                        endTime: endTime.toISOString(),
                        trainerId: randomClass.trainerId,
                        maxParticipants: randomClass.maxParticipants,
                        currentParticipants: 0, // Will be updated when members enroll
                        room: randomClass.room,
                        status: day < 0 ? 'completed' : 'scheduled', // Only past schedules are completed, future are scheduled
                        notes: `Lớp ${randomClass.name} - ${timeSlot}`
                    };

                    // Validate required fields before adding
                    if (scheduleData.classId && scheduleData.trainerId && scheduleData.date && 
                        scheduleData.startTime && scheduleData.endTime && scheduleData.maxParticipants) {
                        sampleSchedules.push(scheduleData);
                    } else {
                        console.log('❌ Invalid schedule data, skipping:', scheduleData);
                    }
                } catch (error) {
                    console.log('❌ Error creating schedule:', error.message);
                }
            }
        }

        if (sampleSchedules.length === 0) {
            console.log('❌ No valid schedules to create');
            return;
        }

        // Create schedules one by one for better error handling
        let created = 0;
        for (const scheduleData of sampleSchedules) {
            try {
                await ClassSchedule.create(scheduleData, { logging: false });
                created++;
            } catch (error) {
                console.log(`❌ Failed to create schedule for class ${scheduleData.classId}:`, error.message);
            }
        }

        console.log(`✅ Successfully created ${created}/${sampleSchedules.length} sample schedules over 14 days`);
        console.log('📅 Schedules include morning (6-9AM) and evening (5-8PM) sessions');

    } catch (error) {
        console.error('⚠️  Failed to seed sample schedules:', error.message);
    }
}

// Seed sample trainers (CLEAN OUTPUT)
async function seedSampleTrainers() {
    try {
        console.log('🌱 Seeding sample trainers...');
        
        const { User, Member } = require('./models');
        
        // Check if trainers exist
        const existingTrainer = await User.findOne({
            where: { email: 'trainer1@gym.com' },
            logging: false
        });
        
        if (existingTrainer) {
            console.log('✅ Sample trainers already exist');
            return;
        }

        const bcrypt = require('bcryptjs');

        // Create sample trainer users
        const sampleTrainers = [
            {
                username: 'trainer1',
                email: 'trainer1@gym.com',
                passwordHash: await bcrypt.hash('trainer123', 12),
                fullName: 'Nguyễn Minh Tuấn',
                role: 'trainer'
            },
            {
                username: 'trainer2', 
                email: 'trainer2@gym.com',
                passwordHash: await bcrypt.hash('trainer123', 12),
                fullName: 'Phạm Thị Mai',
                role: 'trainer'
            },
            {
                username: 'trainer3',
                email: 'trainer3@gym.com',
                passwordHash: await bcrypt.hash('trainer123', 12),
                fullName: 'Lê Văn Hùng',
                role: 'trainer'
            },
            {
                username: 'trainer4',
                email: 'trainer4@gym.com',
                passwordHash: await bcrypt.hash('trainer123', 12),
                fullName: 'Trần Thị Lan',
                role: 'trainer'
            }
        ];

        console.log(`🔧 Creating ${sampleTrainers.length} sample trainers...`);
        
        // Create trainer users
        const createdTrainers = [];
        for (let i = 0; i < sampleTrainers.length; i++) {
            const trainerData = sampleTrainers[i];
            console.log(`👤 Creating trainer: ${trainerData.email}`);
            const trainer = await User.create(trainerData, { logging: false });
            createdTrainers.push(trainer);
        }

        console.log(`✅ Created ${createdTrainers.length} trainers`);
        console.log(`👥 Creating corresponding member records for trainers...`);

        // Create Member records for trainers (so they can also enroll in classes if needed)
        for (let index = 0; index < createdTrainers.length; index++) {
            const trainer = createdTrainers[index];
            const memberData = {
                userId: trainer.id,
                memberCode: `TR${String(index + 1).padStart(3, '0')}`,
                fullName: trainer.fullName,
                phone: `091234567${index + 1}`,
                email: trainer.email,
                joinDate: new Date(),
                isActive: true
            };
            
            console.log(`👥 Creating member record: ${memberData.memberCode} for trainer ${trainer.email}`);
            await Member.create(memberData, { logging: false });
        }
        
        console.log(`✅ Created ${createdTrainers.length} sample trainers with member records`);
        console.log('🏋️ Sample trainer accounts:');
        console.log('   📧 trainer1@gym.com / password: trainer123 (Nguyễn Minh Tuấn)');
        console.log('   📧 trainer2@gym.com / password: trainer123 (Phạm Thị Mai)');
        console.log('   📧 trainer3@gym.com / password: trainer123 (Lê Văn Hùng)');
        console.log('   📧 trainer4@gym.com / password: trainer123 (Trần Thị Lan)');

    } catch (error) {
        console.error('⚠️  Failed to seed sample trainers:', error.message);
    }
}

// Seed sample members (CLEAN OUTPUT)
async function seedSampleMembers() {
    try {
        console.log('🌱 Seeding sample members...');
        
        const { User, Member } = require('./models');
        
        const existingMemberCount = await Member.count({ logging: false });
        console.log(`🔍 Existing member count: ${existingMemberCount}`);
        
        // Check if sample member users exist (not just admin)
        const existingSampleUser = await User.findOne({
            where: { email: 'member1@gmail.com' },
            logging: false
        });
        
        if (existingSampleUser) {
            console.log('✅ Sample members already exist');
            return;
        }

        const bcrypt = require('bcryptjs');

        // Create sample member users first
        const sampleUsers = [
            {
                username: 'member1',
                email: 'member1@gmail.com',
                passwordHash: await bcrypt.hash('member123', 12),
                fullName: 'Nguyễn Văn An',
                role: 'member'
            },
            {
                username: 'member2', 
                email: 'member2@gmail.com',
                passwordHash: await bcrypt.hash('member123', 12),
                fullName: 'Trần Thị Bình',
                role: 'member'
            },
            {
                username: 'member3',
                email: 'member3@gmail.com', 
                passwordHash: await bcrypt.hash('member123', 12),
                fullName: 'Lê Hoàng Nam',
                role: 'member'
            }
        ];

        console.log(`🔧 Creating ${sampleUsers.length} sample users...`);
        
        // Create users one by one to get proper IDs
        const createdUsers = [];
        for (let i = 0; i < sampleUsers.length; i++) {
            const userData = sampleUsers[i];
            console.log(`👤 Creating user: ${userData.email}`);
            const user = await User.create(userData, { logging: false });
            createdUsers.push(user);
        }

        console.log(`✅ Created ${createdUsers.length} users`);
        console.log(`👥 Creating corresponding members...`);

        // Create corresponding members
        const createdMembers = [];
        for (let index = 0; index < createdUsers.length; index++) {
            const user = createdUsers[index];
            
            // Check if member already exists for this user
            const existingMember = await Member.findOne({
                where: { userId: user.id },
                logging: false
            });
            
            if (existingMember) {
                console.log(`👥 Member already exists for user ${user.email}: ${existingMember.memberCode}`);
                createdMembers.push(existingMember);
                continue;
            }
            
            // Generate unique phone number with timestamp to avoid conflicts
            const timestamp = Date.now().toString().slice(-4);
            const memberData = {
                userId: user.id,
                memberCode: `MEM${String(index + 1).padStart(3, '0')}`,
                fullName: user.fullName,
                phone: `0987${timestamp}${index}`,
                email: user.email,
                joinDate: new Date(),
                isActive: true
            };
            
            console.log(`👥 Creating member: ${memberData.memberCode} for user ${user.email}`);
            try {
                const member = await Member.create(memberData, { logging: false });
                createdMembers.push(member);
            } catch (memberError) {
                console.error(`❌ Failed to create member for ${user.email}:`, memberError.message);
                // Try with a different phone number
                memberData.phone = `0988${timestamp}${index}`;
                try {
                    const member = await Member.create(memberData, { logging: false });
                    createdMembers.push(member);
                    console.log(`✅ Created member with alternate phone: ${memberData.phone}`);
                } catch (retryError) {
                    console.error(`❌ Failed to create member even with retry:`, retryError.message);
                }
            }
        }
        
        console.log(`✅ Created ${createdMembers.length} sample members`);
        console.log('👤 Sample member accounts:');
        console.log('   📧 member1@gmail.com / password: member123');
        console.log('   📧 member2@gmail.com / password: member123');
        console.log('   📧 member3@gmail.com / password: member123');

    } catch (error) {
        console.error('⚠️  Failed to seed sample members:', error.message);
        console.error('Full error:', error);
        // Continue execution - don't crash the server
    }
}

// Reset and recreate trainers with proper sequential IDs
async function resetTrainersWithSequentialIDs() {
    try {
        console.log('🔧 Resetting trainers with sequential IDs...');
        
        const { User, Member, ClassSchedule } = require('./models');
        
        // Delete existing trainers (but keep their member records)
        const existingTrainers = await User.findAll({
            where: { role: 'trainer' },
            logging: false
        });
        
        console.log(`🗑️  Removing ${existingTrainers.length} existing trainers...`);
        
        // Update schedules to use admin temporarily
        const adminUser = await User.findOne({ where: { role: 'admin' }, logging: false });
        if (adminUser) {
            await ClassSchedule.update(
                { trainerId: adminUser.id }, 
                { where: { trainerId: { [require('sequelize').Op.in]: existingTrainers.map(t => t.id) } }, logging: false }
            );
        }
        
        // Delete trainer users
        for (const trainer of existingTrainers) {
            await User.destroy({ where: { id: trainer.id }, logging: false });
        }
        
        // Create new trainers with sequential IDs starting from 2
        const bcrypt = require('bcryptjs');
        const newTrainers = [
            {
                id: 2,
                username: 'trainer1',
                email: 'trainer1@gym.com', 
                passwordHash: await bcrypt.hash('trainer123', 12),
                fullName: 'Nguyễn Minh Tuấn',
                role: 'trainer'
            },
            {
                id: 3,
                username: 'trainer2',
                email: 'trainer2@gym.com',
                passwordHash: await bcrypt.hash('trainer123', 12), 
                fullName: 'Phạm Thị Mai',
                role: 'trainer'
            },
            {
                id: 4,
                username: 'trainer3',
                email: 'trainer3@gym.com',
                passwordHash: await bcrypt.hash('trainer123', 12),
                fullName: 'Lê Văn Hùng', 
                role: 'trainer'
            },
            {
                id: 5,
                username: 'trainer4',
                email: 'trainer4@gym.com',
                passwordHash: await bcrypt.hash('trainer123', 12),
                fullName: 'Trần Thị Lan',
                role: 'trainer'
            }
        ];
        
        console.log('👤 Creating trainers with sequential IDs...');
        for (const trainerData of newTrainers) {
            await User.create(trainerData, { logging: false });
            console.log(`✅ Created: ${trainerData.fullName} (ID: ${trainerData.id})`);
        }
        
        console.log('✅ Trainers recreated with sequential IDs: 2, 3, 4, 5');
        return newTrainers;
        
    } catch (error) {
        console.error('⚠️  Failed to reset trainers:', error.message);
        return [];
    }
}

// Update trainer assignments for existing schedules
async function updateScheduleTrainerAssignments() {
    try {
        console.log('🔧 Updating trainer assignments for schedules...');
        
        const { ClassSchedule, User } = require('./models');
        
        // Get only trainers (exclude admin)
        const trainers = await User.findAll({
            where: { 
                role: 'trainer'
            },
            logging: false
        });
        
        if (trainers.length === 0) {
            console.log('⚠️  No trainers found to assign to schedules');
            return;
        }
        
        // Get some schedules to update
        const schedules = await ClassSchedule.findAll({
            limit: 20,
            logging: false
        });
        
        let updatedCount = 0;
        for (let i = 0; i < schedules.length; i++) {
            const schedule = schedules[i];
            // Assign trainers in round-robin fashion
            const trainerIndex = i % trainers.length;
            const newTrainerId = trainers[trainerIndex].id;
            
            if (schedule.trainerId !== newTrainerId) {
                await schedule.update({ 
                    trainerId: newTrainerId 
                }, { logging: false });
                updatedCount++;
            }
        }
        
        console.log(`✅ Updated trainer assignments for ${updatedCount} schedules`);
        console.log(`👨‍🏫 Available trainers: ${trainers.map(t => `${t.fullName} (ID: ${t.id})`).join(', ')}`);
        
    } catch (error) {
        console.error('⚠️  Failed to update trainer assignments:', error.message);
    }
}

// Initialize server
startServer();