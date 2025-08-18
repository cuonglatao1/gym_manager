const { sequelize } = require('../config/database');
const Equipment = require('../models/Equipment');
const MaintenanceSchedule = require('../models/MaintenanceSchedule');

async function generateMaintenanceSchedulesForAllEquipment() {
    try {
        console.log('🔄 Starting maintenance schedule generation for all equipment...');
        
        // Get all equipment that don't have maintenance schedules
        const equipment = await Equipment.findAll({
            where: { isActive: true }
        });
        
        console.log(`📊 Found ${equipment.length} equipment items`);
        
        let created = 0;
        let skipped = 0;
        
        for (const item of equipment) {
            console.log(`\n🔧 Processing: ${item.name} (ID: ${item.id}, Priority: ${item.priority})`);
            
            // Check if schedules already exist
            const existingSchedules = await MaintenanceSchedule.findAll({
                where: { equipmentId: item.id }
            });
            
            if (existingSchedules.length > 0) {
                console.log(`   ⏭️  Skipped - already has ${existingSchedules.length} schedules`);
                skipped++;
                continue;
            }
            
            // Create schedules using the model method
            try {
                const schedules = await MaintenanceSchedule.createSchedulesForEquipment(
                    item.id,
                    item.priority,
                    item.purchaseDate || new Date()
                );
                
                console.log(`   ✅ Created ${schedules.length} maintenance schedules:`);
                schedules.forEach(schedule => {
                    console.log(`      - ${schedule.maintenanceType}: every ${schedule.intervalDays} days, next due: ${schedule.nextDueDate}`);
                });
                created++;
                
            } catch (error) {
                console.error(`   ❌ Error creating schedules for ${item.name}:`, error.message);
            }
        }
        
        console.log(`\n🎉 Summary:`);
        console.log(`   ✅ Equipment with new schedules: ${created}`);
        console.log(`   ⏭️  Equipment skipped (already had schedules): ${skipped}`);
        console.log(`   📊 Total equipment processed: ${equipment.length}`);
        
        // Show breakdown by priority
        const priorityBreakdown = equipment.reduce((acc, item) => {
            acc[item.priority] = (acc[item.priority] || 0) + 1;
            return acc;
        }, {});
        
        console.log(`\n📈 Equipment by priority:`);
        Object.entries(priorityBreakdown).forEach(([priority, count]) => {
            const icon = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
            console.log(`   ${icon} ${priority}: ${count} equipment`);
        });
        
    } catch (error) {
        console.error('❌ Error in maintenance schedule generation:', error);
    }
}

// Run the script
generateMaintenanceSchedulesForAllEquipment()
    .then(() => {
        console.log('\n✅ Maintenance schedule generation completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });