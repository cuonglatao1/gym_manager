/**
 * Script to setup automatic maintenance system based on equipment priority
 * 
 * This script will:
 * 1. Clear old EquipmentMaintenance tasks
 * 2. Create MaintenanceSchedule for each equipment based on priority
 * 3. Initialize notification service to check schedules
 */

const { Equipment, EquipmentMaintenance, MaintenanceSchedule } = require('../models');
const maintenanceSchedulerService = require('../services/maintenanceSchedulerService');
const notificationService = require('../services/notificationService');

async function setupAutomaticMaintenanceSystem() {
    console.log('🚀 Setting up automatic maintenance system...');
    
    try {
        // Step 1: Clear old EquipmentMaintenance tasks
        console.log('🧹 Clearing old EquipmentMaintenance tasks...');
        const deletedTasks = await EquipmentMaintenance.destroy({ where: {} });
        console.log(`✅ Deleted ${deletedTasks} old EquipmentMaintenance tasks`);

        // Step 2: Clear old MaintenanceSchedule
        console.log('🧹 Clearing old MaintenanceSchedule...');
        const deletedSchedules = await MaintenanceSchedule.destroy({ where: {} });
        console.log(`✅ Deleted ${deletedSchedules} old MaintenanceSchedule records`);

        // Step 3: Get all active equipment
        console.log('🔍 Finding all active equipment...');
        const equipment = await Equipment.findAll({
            where: { isActive: true },
            order: [['priority', 'DESC'], ['id', 'ASC']]
        });

        console.log(`📋 Found ${equipment.length} active equipment`);

        // Step 4: Create maintenance schedules for each equipment
        console.log('📅 Creating maintenance schedules based on equipment priority...');
        
        let totalSchedulesCreated = 0;
        
        for (const eq of equipment) {
            console.log(`\n🔧 Processing ${eq.name} (Priority: ${eq.priority || 'medium'})`);
            
            const schedules = await maintenanceSchedulerService.createSchedulesForEquipment(eq.id, eq.priority || 'medium');
            totalSchedulesCreated += schedules.length;
            
            // Show schedule details
            for (const schedule of schedules) {
                const intervalText = schedule.intervalDays === 1 ? 'hàng ngày' :
                                   schedule.intervalDays === 7 ? 'hàng tuần' :
                                   schedule.intervalDays === 30 ? 'hàng tháng' :
                                   `mỗi ${schedule.intervalDays} ngày`;
                
                console.log(`   ✅ ${schedule.maintenanceType} - ${intervalText} (due: ${schedule.nextDueDate})`);
            }
        }

        console.log(`\n📊 Summary:`);
        console.log(`   📋 Equipment processed: ${equipment.length}`);
        console.log(`   📅 Total schedules created: ${totalSchedulesCreated}`);

        // Step 5: Create some overdue schedules for demo
        console.log('\n⚠️ Creating some overdue schedules for demo...');
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        // Make first equipment have overdue cleaning
        if (equipment.length > 0) {
            await MaintenanceSchedule.update(
                { nextDueDate: twoDaysAgo.toISOString().split('T')[0] },
                { 
                    where: { 
                        equipmentId: equipment[0].id, 
                        maintenanceType: 'cleaning' 
                    } 
                }
            );
            console.log(`   ⏰ Made cleaning overdue for ${equipment[0].name}`);
        }

        // Make second equipment have overdue inspection
        if (equipment.length > 1) {
            await MaintenanceSchedule.update(
                { nextDueDate: yesterday.toISOString().split('T')[0] },
                { 
                    where: { 
                        equipmentId: equipment[1].id, 
                        maintenanceType: 'inspection' 
                    } 
                }
            );
            console.log(`   ⏰ Made inspection overdue for ${equipment[1].name}`);
        }

        // Step 6: Generate notifications
        console.log('\n🔔 Generating notifications...');
        notificationService.notifications = []; // Clear existing notifications
        await notificationService.checkMaintenanceNotifications();

        const summary = notificationService.getNotificationSummary();
        console.log('📊 Notification Summary:', summary);

        const notifications = notificationService.getNotifications({ unreadOnly: true });
        console.log(`\n📋 Generated ${notifications.length} notifications:`);
        
        notifications.slice(0, 5).forEach((notification, index) => {
            console.log(`${index + 1}. [${notification.priority.toUpperCase()}] ${notification.title} - ${notification.message}`);
        });
        
        if (notifications.length > 5) {
            console.log(`... and ${notifications.length - 5} more notifications`);
        }

        // Step 7: Show priority breakdown
        console.log('\n📈 Equipment by Priority:');
        const priorityBreakdown = {};
        equipment.forEach(eq => {
            const priority = eq.priority || 'medium';
            priorityBreakdown[priority] = (priorityBreakdown[priority] || 0) + 1;
        });
        
        Object.entries(priorityBreakdown).forEach(([priority, count]) => {
            const templates = maintenanceSchedulerService.maintenanceTemplates[priority] || maintenanceSchedulerService.maintenanceTemplates['medium'];
            console.log(`   🔸 ${priority}: ${count} equipment (${templates.length} schedules each)`);
        });

        console.log('\n🎯 System Ready! Instructions:');
        console.log('1. Equipment priority determines maintenance frequency:');
        console.log('   • Critical: Daily cleaning, 3-day inspection, weekly maintenance');
        console.log('   • High: 2-day cleaning, weekly inspection, monthly maintenance');
        console.log('   • Medium: 3-day cleaning, 2-week inspection, 2-month maintenance');
        console.log('   • Low: Weekly cleaning, monthly inspection, 3-month maintenance');
        console.log('2. Start server: npm start');
        console.log('3. Login to admin: http://localhost:3000/demo/admin-complete.html');
        console.log('4. Navigate to Equipment Management → Notifications');
        console.log('5. Click "XÁC NHẬN HOÀN THÀNH" to complete and auto-create next schedule');
        console.log('6. Use "BỎ QUA" for overdue schedules to skip and create next schedule');

    } catch (error) {
        console.error('❌ Error setting up automatic maintenance system:', error);
    }
}

// Run the setup
if (require.main === module) {
    setupAutomaticMaintenanceSystem().then(() => {
        console.log('🏁 Automatic maintenance system setup completed!');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Setup failed:', error);
        process.exit(1);
    });
}

module.exports = { setupAutomaticMaintenanceSystem };