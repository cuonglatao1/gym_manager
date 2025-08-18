const { Equipment, EquipmentMaintenance } = require('./models');

async function testAutoMaintenance() {
    try {
        console.log('🧪 Testing Auto Maintenance Scheduling...');

        // Test equipment data with different priorities
        const testEquipment = [
            {
                name: 'Máy chạy bộ Test Pro',
                category: 'cardio',
                priority: 'high',
                brand: 'TestBrand',
                location: 'Test Area',
                status: 'active',
                maintenanceInterval: 7
            },
            {
                name: 'Tạ tay Test Set',
                category: 'free_weights',
                priority: 'low',
                brand: 'TestBrand',
                location: 'Free Weight Area',
                status: 'active',
                maintenanceInterval: 30
            }
        ];

        for (const equipData of testEquipment) {
            console.log(`\n🔧 Creating equipment: ${equipData.name} (Priority: ${equipData.priority})`);
            
            const equipment = await Equipment.create(equipData);
            console.log(`✅ Equipment created with ID: ${equipment.id}`);

            // Check created maintenance schedules
            const maintenanceSchedules = await EquipmentMaintenance.findAll({
                where: { equipmentId: equipment.id }
            });

            console.log(`📅 Auto-created ${maintenanceSchedules.length} maintenance schedules:`);
            maintenanceSchedules.forEach(schedule => {
                console.log(`   - ${schedule.title}: ${schedule.scheduledDate.toDateString()}`);
            });
        }

        console.log('\n✅ Auto maintenance test completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

testAutoMaintenance();