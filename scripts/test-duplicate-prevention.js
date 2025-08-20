const { MaintenanceSchedule, Equipment } = require('../models');
const maintenanceScheduler = require('../services/maintenanceSchedulerService');

async function testDuplicatePrevention() {
    try {
        console.log('🧪 Testing Duplicate Prevention Logic...\n');

        // 1. Find an active schedule
        const activeSchedule = await MaintenanceSchedule.findOne({
            where: { isActive: true },
            include: [{
                model: Equipment,
                as: 'equipment'
            }]
        });

        if (!activeSchedule) {
            console.log('❌ No active schedules found');
            return;
        }

        const equipmentId = activeSchedule.equipmentId;
        const maintenanceType = activeSchedule.maintenanceType;
        const equipmentName = activeSchedule.equipment?.name || 'Unknown';

        console.log(`1. Testing with: ${equipmentName}`);
        console.log(`   Type: ${maintenanceType}`);
        console.log(`   Due: ${activeSchedule.nextDueDate}\n`);

        // 2. Try to manually create a duplicate schedule (simulating a bug)
        console.log('2. Attempting to create a duplicate schedule...');
        try {
            const duplicate = await MaintenanceSchedule.create({
                equipmentId: equipmentId,
                maintenanceType: maintenanceType,
                priority: activeSchedule.priority,
                intervalDays: activeSchedule.intervalDays,
                nextDueDate: activeSchedule.nextDueDate, // Same date!
                description: activeSchedule.description,
                isActive: true,
                notes: 'DUPLICATE TEST SCHEDULE - SHOULD BE CLEANED'
            });
            
            console.log(`   ⚠️ Duplicate created with ID: ${duplicate.id}\n`);

            // 3. Count duplicates
            const duplicateCount = await MaintenanceSchedule.count({
                where: {
                    equipmentId: equipmentId,
                    maintenanceType: maintenanceType,
                    isActive: true
                }
            });
            
            console.log(`3. Current duplicate count: ${duplicateCount} (should be 2)\n`);

            // 4. Complete one of the schedules - this should clean up ALL duplicates
            console.log('4. Completing maintenance (should clean all duplicates)...');
            const result = await maintenanceScheduler.completeMaintenance(activeSchedule.id, {
                notes: 'Test completion to clean duplicates',
                performedBy: 1
            });

            if (result.success) {
                console.log('   ✅ Maintenance completed\n');

                // 5. Check final state
                const finalCount = await MaintenanceSchedule.count({
                    where: {
                        equipmentId: equipmentId,
                        maintenanceType: maintenanceType,
                        isActive: true
                    }
                });

                console.log(`5. Final active count: ${finalCount} (should be 1)`);

                if (finalCount === 1) {
                    console.log('🎉 SUCCESS! Duplicate prevention working correctly');
                } else {
                    console.log('❌ FAILED! Still have duplicates');
                }
            } else {
                console.log(`   ❌ Completion failed: ${result.error}`);
            }

        } catch (error) {
            console.log(`   ❌ Failed to create duplicate: ${error.message}`);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testDuplicatePrevention().then(() => {
    console.log('\n👋 Duplicate prevention test finished');
    process.exit(0);
}).catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
});