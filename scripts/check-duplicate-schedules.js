const { MaintenanceSchedule, Equipment } = require('../models');

async function checkDuplicateSchedules() {
    try {
        console.log('🔍 Checking for duplicate maintenance schedules...\n');

        // Get all active schedules
        const allSchedules = await MaintenanceSchedule.findAll({
            where: { isActive: true },
            include: [{
                model: Equipment,
                as: 'equipment',
                attributes: ['name', 'equipmentCode']
            }],
            order: [['equipmentId', 'ASC'], ['maintenanceType', 'ASC'], ['nextDueDate', 'ASC']]
        });

        console.log(`📊 Total active schedules: ${allSchedules.length}\n`);

        // Group by equipmentId + maintenanceType to find duplicates
        const groupedSchedules = {};
        allSchedules.forEach(schedule => {
            const key = `${schedule.equipmentId}_${schedule.maintenanceType}`;
            if (!groupedSchedules[key]) {
                groupedSchedules[key] = [];
            }
            groupedSchedules[key].push(schedule);
        });

        // Find groups with duplicates
        let duplicateCount = 0;
        for (const [key, schedules] of Object.entries(groupedSchedules)) {
            if (schedules.length > 1) {
                duplicateCount++;
                const [equipmentId, maintenanceType] = key.split('_');
                const equipmentName = schedules[0].equipment?.name || 'Unknown';
                
                console.log(`🚨 DUPLICATE FOUND #${duplicateCount}:`);
                console.log(`   Equipment: ${equipmentName} (ID: ${equipmentId})`);
                console.log(`   Type: ${maintenanceType}`);
                console.log(`   Count: ${schedules.length} schedules`);
                
                schedules.forEach((schedule, index) => {
                    console.log(`   ${index + 1}. ID: ${schedule.id}, Due: ${schedule.nextDueDate}, Notes: ${schedule.notes?.substring(0, 50) || 'No notes'}...`);
                });
                console.log('');
            }
        }

        if (duplicateCount === 0) {
            console.log('✅ No duplicates found! Database is clean.\n');
        } else {
            console.log(`❌ Found ${duplicateCount} duplicate groups affecting multiple schedules.\n`);
        }

        // Check for specific case: Ghế tập bụng FlexCore AB-300 inspection
        console.log('🎯 Checking specific case: Ghế tập bụng FlexCore AB-300 inspection...');
        const specificSchedules = await MaintenanceSchedule.findAll({
            where: { 
                isActive: true,
                maintenanceType: 'inspection'
            },
            include: [{
                model: Equipment,
                as: 'equipment',
                where: { name: { [require('sequelize').Op.like]: '%FlexCore AB-300%' } }
            }]
        });

        console.log(`   Found ${specificSchedules.length} inspection schedules for FlexCore AB-300:`);
        specificSchedules.forEach((schedule, index) => {
            console.log(`   ${index + 1}. ID: ${schedule.id}, Due: ${schedule.nextDueDate}, Last: ${schedule.lastCompletedDate || 'Never'}`);
            console.log(`      Notes: ${schedule.notes || 'No notes'}`);
        });

    } catch (error) {
        console.error('❌ Error checking duplicates:', error);
    }
}

// Run the check
checkDuplicateSchedules().then(() => {
    console.log('\n👋 Check completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Check failed:', error);
    process.exit(1);
});