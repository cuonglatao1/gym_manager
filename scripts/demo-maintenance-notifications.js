/**
 * Demo script for Maintenance Notification System
 * This script creates sample equipment and schedules to demonstrate the notification features
 */

const { Equipment, MaintenanceSchedule } = require('../models');
const maintenanceSchedulerService = require('../services/maintenanceSchedulerService');
const notificationService = require('../services/notificationService');

async function createDemoData() {
    console.log('🚀 Creating demo data for maintenance notification system...');
    
    try {
        // Create sample equipment with different priorities
        const equipment1 = await Equipment.create({
            name: 'Máy chạy bộ Technogym',
            equipmentCode: 'TM-001',
            category: 'cardio',
            priority: 'high',
            status: 'active',
            location: 'Tầng 1 - Khu vực Cardio',
            purchaseDate: '2024-01-15',
            purchasePrice: 50000000,
            brand: 'Technogym',
            model: 'Run Race 1400',
            isActive: true
        });

        const equipment2 = await Equipment.create({
            name: 'Xe đạp tập Matrix',
            equipmentCode: 'BK-002',
            category: 'cardio',
            priority: 'medium',
            status: 'active',
            location: 'Tầng 1 - Khu vực Cardio',
            purchaseDate: '2024-02-01',
            purchasePrice: 30000000,
            brand: 'Matrix',
            model: 'U30 XER',
            isActive: true
        });

        const equipment3 = await Equipment.create({
            name: 'Tạ đòn Olympic',
            equipmentCode: 'BB-003',
            category: 'free_weights',
            priority: 'low',
            status: 'active',
            location: 'Tầng 2 - Khu vực Free Weight',
            purchaseDate: '2024-01-20',
            purchasePrice: 2000000,
            brand: 'Rogue',
            model: 'Olympic Barbell',
            isActive: true
        });

        // Create maintenance schedules for equipment
        console.log('📅 Creating maintenance schedules...');
        
        await maintenanceSchedulerService.createSchedulesForEquipment(equipment1.id, 'high');
        await maintenanceSchedulerService.createSchedulesForEquipment(equipment2.id, 'medium');
        await maintenanceSchedulerService.createSchedulesForEquipment(equipment3.id, 'low');

        // Create some overdue schedules for demo
        console.log('⚠️ Creating overdue maintenance schedules for demo...');
        
        // Make equipment1 have overdue maintenance
        await MaintenanceSchedule.update(
            { nextDueDate: '2024-08-10' }, // 9 days ago
            { where: { equipmentId: equipment1.id, maintenanceType: 'cleaning' } }
        );

        await MaintenanceSchedule.update(
            { nextDueDate: '2024-08-15' }, // 4 days ago
            { where: { equipmentId: equipment2.id, maintenanceType: 'inspection' } }
        );

        // Make equipment3 have maintenance due today
        const today = new Date().toISOString().split('T')[0];
        await MaintenanceSchedule.update(
            { nextDueDate: today },
            { where: { equipmentId: equipment3.id, maintenanceType: 'maintenance' } }
        );

        console.log('✅ Demo data created successfully!');
        
        // Trigger notification check
        console.log('🔔 Checking for maintenance notifications...');
        await notificationService.checkMaintenanceNotifications();
        
        const summary = notificationService.getNotificationSummary();
        console.log('📊 Notification Summary:', summary);
        
        const notifications = notificationService.getNotifications({ unreadOnly: true });
        console.log(`📋 Generated ${notifications.length} notifications`);
        
        notifications.forEach((notification, index) => {
            console.log(`${index + 1}. [${notification.priority.toUpperCase()}] ${notification.title} - ${notification.message}`);
        });

        console.log('\n🎯 Demo Instructions:');
        console.log('1. Start the server: npm start');
        console.log('2. Open admin interface: http://localhost:3000/demo/admin-equipment.html');
        console.log('3. Go to "Thông báo" tab to see maintenance notifications');
        console.log('4. Click "Xác nhận hoàn thành" to complete maintenance and auto-reschedule');
        console.log('5. Observe how the next maintenance schedule is automatically set');

    } catch (error) {
        console.error('❌ Error creating demo data:', error);
    }
}

// Run the demo
if (require.main === module) {
    createDemoData().then(() => {
        console.log('🏁 Demo setup completed!');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Demo setup failed:', error);
        process.exit(1);
    });
}

module.exports = { createDemoData };