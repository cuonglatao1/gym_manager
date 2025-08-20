/**
 * Script to reset maintenance schedules to current dates
 * This will remove overdue notifications created by demo script
 */

const { MaintenanceSchedule } = require('../models');

async function resetMaintenanceSchedulesToCurrent() {
    console.log('🔄 Resetting maintenance schedules to current dates...');
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfterTomorrow = new Date();
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
        
        // Reset overdue schedules to future dates
        await MaintenanceSchedule.update(
            { nextDueDate: tomorrow.toISOString().split('T')[0] },
            { where: { nextDueDate: { [require('sequelize').Op.lt]: today } } }
        );
        
        console.log('✅ All overdue maintenance schedules have been reset to tomorrow');
        console.log('🔔 This will eliminate "quá hạn" notifications');
        
        // Force notification service to refresh
        const notificationService = require('../services/notificationService');
        await notificationService.checkMaintenanceNotifications();
        
    } catch (error) {
        console.error('❌ Error resetting maintenance schedules:', error);
    }
}

// Run the reset
if (require.main === module) {
    resetMaintenanceSchedulesToCurrent().then(() => {
        console.log('🏁 Reset completed!');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Reset failed:', error);
        process.exit(1);
    });
}

module.exports = { resetMaintenanceSchedulesToCurrent };