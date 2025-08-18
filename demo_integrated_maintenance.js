const { Equipment, EquipmentMaintenance, User } = require('./models');

async function demoIntegratedMaintenance() {
    try {
        console.log('🔧 Demo: Integrated Equipment Maintenance System');
        console.log('================================================\n');

        // 1. Create demo equipment
        console.log('1️⃣ Creating demo equipment...');
        const equipment = await Equipment.create({
            name: 'Demo Treadmill Pro X1',
            category: 'cardio',
            brand: 'FitnessPro',
            model: 'TPX1-2024',
            serialNumber: 'TPX1-DEMO-001',
            location: 'Cardio Zone - Row 1',
            purchaseDate: new Date('2024-01-15'),
            purchasePrice: 8500.00,
            status: 'active',
            condition: 'excellent',
            priority: 'high',
            maintenanceInterval: 7,
            notes: 'Demo equipment for maintenance system testing'
        });
        console.log(`�� Equipment created: ${equipment.name} (ID: ${equipment.id})`);

        // 2. Create maintenance schedules
        console.log('\n2️⃣ Creating maintenance schedules...');
        
        const maintenanceTypes = [
            {
                title: 'Daily Cleaning',
                description: 'Clean and sanitize equipment surfaces',
                scheduledDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
                estimatedDuration: 15,
                maintenanceType: 'daily_clean'
            },
            {
                title: 'Weekly Inspection',
                description: 'Check belts, bolts, and moving parts',
                scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
                estimatedDuration: 45,
                maintenanceType: 'weekly_check'
            },
            {
                title: 'Monthly Service',
                description: 'Full maintenance service and calibration',
                scheduledDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next month
                estimatedDuration: 120,
                maintenanceType: 'monthly_maintenance'
            }
        ];

        const createdMaintenance = [];
        for (const maintenance of maintenanceTypes) {
            const record = await EquipmentMaintenance.create({
                equipmentId: equipment.id,
                ...maintenance
            });
            createdMaintenance.push(record);
            console.log(`✅ Maintenance scheduled: ${record.title} - ${record.scheduledDate.toDateString()}`);
        }

        // 3. Simulate maintenance completion
        console.log('\n3️⃣ Simulating maintenance completion...');
        const dailyMaintenance = createdMaintenance[0];
        
        await dailyMaintenance.update({
            status: 'completed',
            completedDate: new Date(),
            actualDuration: 12,
            notes: 'Equipment cleaned and sanitized. All surfaces wiped down.',
            completedBy: 1 // Assuming admin user ID is 1
        });
        console.log(`✅ Completed: ${dailyMaintenance.title}`);

        // 4. Generate maintenance report
        console.log('\n4️⃣ Generating maintenance report...');
        
        const allMaintenance = await EquipmentMaintenance.findAll({
            where: { equipmentId: equipment.id },
            include: [
                { model: Equipment, as: 'equipment' },
                { model: User, as: 'assignee', required: false },
                { model: User, as: 'reporter', required: false }
            ],
            order: [['scheduledDate', 'ASC']]
        });

        console.log('\n📊 MAINTENANCE REPORT');
        console.log('=====================');
        console.log(`Equipment: ${equipment.name}`);
        console.log(`Location: ${equipment.location}`);
        console.log(`Status: ${equipment.status}`);
        console.log(`Condition: ${equipment.condition}\n`);

        allMaintenance.forEach((maintenance, index) => {
            console.log(`${index + 1}. ${maintenance.title}`);
            console.log(`   Type: ${maintenance.maintenanceType}`);
            console.log(`   Scheduled: ${maintenance.scheduledDate.toDateString()}`);
            console.log(`   Status: ${maintenance.status}`);
            console.log(`   Duration: ${maintenance.estimatedDuration} min (estimated)`);
            if (maintenance.status === 'completed') {
                console.log(`   Completed: ${maintenance.completedDate.toDateString()}`);
                console.log(`   Actual Duration: ${maintenance.actualDuration} min`);
            }
            console.log(`   Description: ${maintenance.description}\n`);
        });

        // 5. Equipment usage simulation
        console.log('5️⃣ Simulating equipment usage...');
        await equipment.update({
            usageHours: equipment.usageHours + 8.5,
            lastUsed: new Date()
        });
        console.log(`✅ Equipment usage updated: ${equipment.usageHours + 8.5} hours total`);

        // 6. Next maintenance prediction
        console.log('\n6️⃣ Next maintenance prediction...');
        const nextMaintenance = await EquipmentMaintenance.findOne({
            where: { 
                equipmentId: equipment.id,
                status: 'scheduled'
            },
            order: [['scheduledDate', 'ASC']]
        });

        if (nextMaintenance) {
            const daysUntil = Math.ceil((nextMaintenance.scheduledDate - new Date()) / (1000 * 60 * 60 * 24));
            console.log(`📅 Next maintenance: ${nextMaintenance.title}`);
            console.log(`📅 Due in: ${daysUntil} days (${nextMaintenance.scheduledDate.toDateString()})`);
            console.log(`⏱️  Estimated duration: ${nextMaintenance.estimatedDuration} minutes`);
        }

        console.log('\n🎉 Demo completed successfully!');
        console.log('\n💡 Key Features Demonstrated:');
        console.log('   ✓ Equipment registration with maintenance intervals');
        console.log('   ✓ Automatic maintenance scheduling');
        console.log('   ✓ Maintenance completion tracking');
        console.log('   ✓ Usage monitoring');
        console.log('   ✓ Comprehensive reporting');
        console.log('   ✓ Next maintenance prediction');

    } catch (error) {
        console.error('❌ Demo failed:', error.message);
        console.error(error.stack);
    }
}

// Run demo if this file is executed directly
if (require.main === module) {
    demoIntegratedMaintenance()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { demoIntegratedMaintenance };