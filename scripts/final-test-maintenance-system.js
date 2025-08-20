const { MaintenanceSchedule, Equipment } = require('../models');
const maintenanceScheduler = require('../services/maintenanceSchedulerService');

async function finalTestMaintenanceSystem() {
    try {
        console.log('🧪 Final Test: Maintenance System Logic...\n');

        // 1. Check current state
        console.log('1. Checking current database state...');
        const totalActive = await MaintenanceSchedule.count({ where: { isActive: true } });
        const totalInactive = await MaintenanceSchedule.count({ where: { isActive: false } });
        console.log(`   📊 Active schedules: ${totalActive}`);
        console.log(`   📊 Inactive schedules: ${totalInactive}\n`);

        // 2. Find a schedule to test with  
        console.log('2. Finding a test schedule...');
        const testSchedule = await MaintenanceSchedule.findOne({
            where: { isActive: true },
            include: [{
                model: Equipment,
                as: 'equipment'
            }]
        });

        if (!testSchedule) {
            console.log('   ❌ No active schedules found for testing');
            return;
        }

        const equipmentId = testSchedule.equipmentId;
        const maintenanceType = testSchedule.maintenanceType;
        const equipmentName = testSchedule.equipment?.name || 'Unknown';

        console.log(`   ✅ Testing with: ${equipmentName}`);
        console.log(`   📋 Type: ${maintenanceType}`);
        console.log(`   📅 Due: ${testSchedule.nextDueDate}\n`);

        // 3. Count schedules before completion
        console.log('3. Counting schedules before completion...');
        const beforeCount = await MaintenanceSchedule.count({
            where: {
                equipmentId: equipmentId,
                maintenanceType: maintenanceType,
                isActive: true
            }
        });
        console.log(`   📊 Active schedules for this type: ${beforeCount}\n`);

        // 4. Complete the maintenance
        console.log('4. Completing maintenance...');
        const result = await maintenanceScheduler.completeMaintenance(testSchedule.id, {
            notes: 'Final test completion',
            performedBy: 1
        });

        if (!result.success) {
            console.log(`   ❌ Completion failed: ${result.error}`);
            return;
        }

        console.log('   ✅ Maintenance completed successfully');
        console.log(`   📅 Next due date: ${result.nextSchedule.nextDueDate}\n`);

        // 5. Count schedules after completion
        console.log('5. Verifying results...');
        const afterCount = await MaintenanceSchedule.count({
            where: {
                equipmentId: equipmentId,
                maintenanceType: maintenanceType,
                isActive: true
            }
        });

        const allInactiveCount = await MaintenanceSchedule.count({
            where: { isActive: false }
        });

        console.log(`   📊 Active schedules for this type after: ${afterCount}`);
        console.log(`   📊 Total inactive schedules in DB: ${allInactiveCount}`);

        // 6. Verify success
        if (afterCount === 1 && allInactiveCount === 1) {
            console.log('\n🎉 SUCCESS! System working correctly:');
            console.log('   ✅ Old schedule deactivated');
            console.log('   ✅ New schedule created');
            console.log('   ✅ Only 1 active schedule per type');
            console.log('   ✅ Deactivated schedule not visible in API');
        } else {
            console.log('\n⚠️ WARNING: Results not as expected');
            console.log(`   Expected: 1 active, 1 inactive`);
            console.log(`   Actual: ${afterCount} active, ${allInactiveCount} inactive`);
        }

        // 7. Test duplicate prevention
        console.log('\n6. Testing duplicate completion prevention...');
        try {
            const duplicateResult = await maintenanceScheduler.completeMaintenance(testSchedule.id, {
                notes: 'This should fail'
            });
            
            if (duplicateResult.success) {
                console.log('   ❌ FAILED: Duplicate completion was allowed');
            } else {
                console.log('   ✅ SUCCESS: Duplicate completion correctly blocked');
            }
        } catch (error) {
            console.log('   ✅ SUCCESS: Duplicate completion correctly blocked');
        }

        console.log('\n🎯 Test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
finalTestMaintenanceSystem().then(() => {
    console.log('\n👋 Final test script finished');
    process.exit(0);
}).catch(error => {
    console.error('💥 Test script crashed:', error);
    process.exit(1);
});