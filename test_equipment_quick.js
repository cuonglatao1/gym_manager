const { Equipment, EquipmentMaintenance } = require('./models');

async function testEquipment() {
    try {
        console.log('🧪 Testing Equipment Management...');

        // Test 1: Create new equipment
        console.log('\n1️⃣ Testing Equipment Creation...');
        const newEquipment = await Equipment.create({
            name: 'Test Equipment ABC',
            category: 'accessories',
            brand: 'TestBrand',
            location: 'Test Location',
            status: 'active',
            condition: 'excellent'
        });
        console.log('✅ Equipment created:', newEquipment.name);

        // Test 2: List all equipment
        console.log('\n2️⃣ Testing Equipment List...');
        const allEquipment = await Equipment.findAll();
        console.log(`✅ Found ${allEquipment.length} equipment items`);

        // Test 3: Create maintenance
        console.log('\n3️⃣ Testing Maintenance Creation...');
        const newMaintenance = await EquipmentMaintenance.create({
            equipmentId: newEquipment.id,
            scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            title: 'Test Maintenance',
            description: 'Testing maintenance creation',
            estimatedDuration: 30
        });
        console.log('✅ Maintenance created:', newMaintenance.title);

        // Test 4: List all maintenance
        console.log('\n4️⃣ Testing Maintenance List...');
        const allMaintenance = await EquipmentMaintenance.findAll({
            include: [{ model: Equipment, as: 'equipment' }]
        });
        console.log(`✅ Found ${allMaintenance.length} maintenance records`);

        console.log('\n🎉 All tests passed! Equipment Management is working correctly.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        throw error;
    }
}

testEquipment()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));