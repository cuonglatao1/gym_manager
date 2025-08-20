/**
 * Script to create demo EquipmentMaintenance tasks
 * This will create notifications from EquipmentMaintenance instead of MaintenanceSchedule
 */

const { Equipment, EquipmentMaintenance } = require('../models');

async function createEquipmentMaintenanceDemo() {
    console.log('🔧 Creating demo EquipmentMaintenance tasks...');
    
    try {
        // Get some equipment
        const equipment = await Equipment.findAll({
            where: { isActive: true },
            limit: 5
        });

        if (equipment.length === 0) {
            console.log('❌ No equipment found. Please add equipment first.');
            return;
        }

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const twoDaysAgo = new Date(today);
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Create overdue maintenance tasks
        await EquipmentMaintenance.create({
            equipmentId: equipment[0].id,
            maintenanceType: 'daily_clean',
            status: 'scheduled',
            priority: 'high',
            scheduledDate: twoDaysAgo.toISOString().split('T')[0],
            title: `Vệ sinh ${equipment[0].name} - Quá hạn`,
            description: 'Vệ sinh và khử trùng thiết bị hàng ngày',
            estimatedDuration: 30,
            estimatedCost: 0
        });

        await EquipmentMaintenance.create({
            equipmentId: equipment[1].id,
            maintenanceType: 'weekly_check',
            status: 'scheduled', 
            priority: 'medium',
            scheduledDate: yesterday.toISOString().split('T')[0],
            title: `Kiểm tra ${equipment[1].name} - Quá hạn`,
            description: 'Kiểm tra chức năng và an toàn thiết bị hàng tuần',
            estimatedDuration: 45,
            estimatedCost: 0
        });

        // Create due today tasks
        await EquipmentMaintenance.create({
            equipmentId: equipment[2].id,
            maintenanceType: 'daily_clean',
            status: 'scheduled',
            priority: 'high',
            scheduledDate: today.toISOString().split('T')[0],
            title: `Vệ sinh ${equipment[2].name} - Hôm nay`,
            description: 'Vệ sinh hàng ngày',
            estimatedDuration: 20,
            estimatedCost: 0
        });

        await EquipmentMaintenance.create({
            equipmentId: equipment[3].id,
            maintenanceType: 'repair',
            status: 'scheduled',
            priority: 'critical',
            scheduledDate: today.toISOString().split('T')[0],
            title: `SỬA CHỮA KHẨN CẤP ${equipment[3].name}`,
            description: 'Sửa chữa lỗi phát hiện từ kiểm tra định kỳ',
            estimatedDuration: 120,
            estimatedCost: 500000
        });

        // Create upcoming tasks
        await EquipmentMaintenance.create({
            equipmentId: equipment[4].id,
            maintenanceType: 'monthly_maintenance',
            status: 'scheduled',
            priority: 'medium',
            scheduledDate: tomorrow.toISOString().split('T')[0],
            title: `Bảo dưỡng ${equipment[4].name} - Ngày mai`, 
            description: 'Bảo dưỡng định kỳ hàng tháng',
            estimatedDuration: 90,
            estimatedCost: 200000
        });

        console.log('✅ Created 5 demo EquipmentMaintenance tasks');
        console.log('   - 2 overdue tasks');
        console.log('   - 2 due today tasks'); 
        console.log('   - 1 upcoming task');

        // Trigger notification check
        const notificationService = require('../services/notificationService');
        await notificationService.checkMaintenanceNotifications();
        
        console.log('🔔 Notifications updated!');

    } catch (error) {
        console.error('❌ Error creating demo maintenance tasks:', error);
    }
}

// Run the demo
if (require.main === module) {
    createEquipmentMaintenanceDemo().then(() => {
        console.log('🏁 Demo EquipmentMaintenance tasks created!');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Demo creation failed:', error);
        process.exit(1);
    });
}

module.exports = { createEquipmentMaintenanceDemo };