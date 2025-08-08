// seeders/classTypeSeeder.js
const { ClassType } = require('../models');

const classTypeSeeder = async () => {
    try {
        console.log('🌱 Seeding class types...');

        // Check if class types already exist
        const existingCount = await ClassType.count();
        if (existingCount > 0) {
            console.log('✅ Class types already seeded');
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
            },
            {
                name: 'Spinning',
                description: 'Đạp xe trong nhà với âm nhạc sôi động',
                duration: 45,
                maxParticipants: 20,
                equipment: ['stationary bikes', 'heart rate monitors'],
                difficulty: 'intermediate',
                color: '#3498db'
            },
            {
                name: 'Functional Training',
                description: 'Tập luyện chức năng cho hoạt động hàng ngày',
                duration: 60,
                maxParticipants: 12,
                equipment: ['kettlebells', 'medicine balls', 'TRX straps', 'agility ladder'],
                difficulty: 'advanced',
                color: '#8e44ad'
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
        console.error('❌ Error seeding class types:', error);
        throw error;
    }
};

module.exports = classTypeSeeder;