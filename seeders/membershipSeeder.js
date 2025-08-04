// seeders/membershipSeeder.js
const { Membership } = require('../models');

const membershipSeeder = async () => {
    try {
        console.log('🌱 Seeding memberships...');

        // Check if memberships already exist
        const existingCount = await Membership.count();
        if (existingCount > 0) {
            console.log('✅ Memberships already seeded');
            return;
        }

        const memberships = [
            {
                name: 'Basic Monthly',
                description: 'Gói cơ bản 1 tháng - Sử dụng thiết bị gym và khu vực cardio',
                duration: 30, // 30 days
                price: 500000, // 500k VND
                benefits: [
                    'Sử dụng thiết bị gym',
                    'Khu vực cardio',
                    'Phòng thay đồ và tắm',
                    'WiFi miễn phí'
                ],
                maxClasses: 4, // 4 classes per month
                hasPersonalTrainer: false
            },
            {
                name: 'Premium Monthly',
                description: 'Gói cao cấp 1 tháng - Bao gồm các lớp tập và hỗ trợ PT',
                duration: 30,
                price: 800000, // 800k VND
                benefits: [
                    'Tất cả quyền lợi của gói Basic',
                    'Tham gia tất cả lớp tập',
                    '2 buổi tư vấn với PT',
                    'Đo chỉ số cơ thể miễn phí',
                    'Khăn tắm miễn phí'
                ],
                maxClasses: null, // Unlimited classes
                hasPersonalTrainer: true
            },
            {
                name: 'VIP Monthly',
                description: 'Gói VIP 1 tháng - Dịch vụ hoàn hảo với PT riêng',
                duration: 30,
                price: 1200000, // 1.2M VND
                benefits: [
                    'Tất cả quyền lợi của gói Premium',
                    '8 buổi PT 1-1 riêng',
                    'Chế độ dinh dưỡng cá nhân',
                    'Ưu tiên đặt lịch',
                    'Massage thư giãn 2 lần/tháng',
                    'Nước uống miễn phí'
                ],
                maxClasses: null,
                hasPersonalTrainer: true
            },
            {
                name: 'Basic Quarterly',
                description: 'Gói cơ bản 3 tháng - Tiết kiệm 15%',
                duration: 90, // 90 days
                price: 1275000, // 1.275M VND (save 15%)
                benefits: [
                    'Sử dụng thiết bị gym',
                    'Khu vực cardio',
                    'Phòng thay đồ và tắm',
                    'WiFi miễn phí',
                    'Tiết kiệm 15% so với gói tháng'
                ],
                maxClasses: 12, // 4 classes per month
                hasPersonalTrainer: false
            },
            {
                name: 'Premium Quarterly',
                description: 'Gói cao cấp 3 tháng - Tiết kiệm 20%',
                duration: 90,
                price: 1920000, // 1.92M VND (save 20%)
                benefits: [
                    'Tất cả quyền lợi của gói Premium',
                    'Tiết kiệm 20% so với gói tháng',
                    '6 buổi tư vấn với PT',
                    'Đo chỉ số cơ thể hàng tháng'
                ],
                maxClasses: null,
                hasPersonalTrainer: true
            },
            {
                name: 'Basic Yearly',
                description: 'Gói cơ bản 1 năm - Tiết kiệm 25%',
                duration: 365, // 1 year
                price: 4500000, // 4.5M VND (save 25%)
                benefits: [
                    'Tất cả quyền lợi của gói Basic',
                    'Tiết kiệm 25% so với gói tháng',
                    'Tặng áo thun gym',
                    'Ưu tiên gia hạn'
                ],
                maxClasses: 48, // 4 classes per month
                hasPersonalTrainer: false
            },
            {
                name: 'Premium Yearly',
                description: 'Gói cao cấp 1 năm - Tiết kiệm 30%',
                duration: 365,
                price: 6720000, // 6.72M VND (save 30%)
                benefits: [
                    'Tất cả quyền lợi của gói Premium',
                    'Tiết kiệm 30% so với gói tháng',
                    'Tặng bộ đồ tập cao cấp',
                    '24 buổi tư vấn với PT',
                    'Health check-up miễn phí'
                ],
                maxClasses: null,
                hasPersonalTrainer: true
            },
            {
                name: 'Student Monthly',
                description: 'Gói sinh viên 1 tháng - Ưu đãi đặc biệt',
                duration: 30,
                price: 300000, // 300k VND
                benefits: [
                    'Sử dụng thiết bị gym cơ bản',
                    'Khu vực cardio',
                    'Phòng thay đồ',
                    'Giảm 40% cho sinh viên'
                ],
                maxClasses: 2, // 2 classes per month
                hasPersonalTrainer: false
            }
        ];

        await Membership.bulkCreate(memberships);
        console.log(`✅ Created ${memberships.length} membership packages`);

        // Log the created memberships
        const createdMemberships = await Membership.findAll({
            order: [['price', 'ASC']]
        });

        console.log('📦 Available membership packages:');
        createdMemberships.forEach(membership => {
            console.log(`   - ${membership.name}: ${membership.price.toLocaleString()}đ (${membership.duration} days)`);
        });

    } catch (error) {
        console.error('❌ Error seeding memberships:', error);
        throw error;
    }
};

module.exports = membershipSeeder;