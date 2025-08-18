const { Equipment } = require('./models');
const { Op } = require('sequelize');

async function testPriorities() {
    try {
        console.log('🔍 Testing equipment priorities...');
        
        // Get all equipment with their priorities
        const allEquipment = await Equipment.findAll({
            attributes: ['id', 'name', 'priority'],
            limit: 10
        });
        
        console.log('📋 All equipment (sample 10):');
        allEquipment.forEach(eq => {
            console.log(`  ${eq.id}: ${eq.name} - Priority: ${eq.priority}`);
        });
        
        // Test filtering by priority
        const highPriority = await Equipment.findAll({
            where: { priority: 'high' },
            attributes: ['id', 'name', 'priority']
        });
        
        const mediumPriority = await Equipment.findAll({
            where: { priority: 'medium' },
            attributes: ['id', 'name', 'priority']
        });
        
        const lowPriority = await Equipment.findAll({
            where: { priority: 'low' },
            attributes: ['id', 'name', 'priority']
        });
        
        console.log(`\n📊 Priority counts:`);
        console.log(`  🔴 High: ${highPriority.length} items`);
        console.log(`  🟡 Medium: ${mediumPriority.length} items`);
        console.log(`  🟢 Low: ${lowPriority.length} items`);
        
        if (highPriority.length > 0) {
            console.log(`\n🔴 High priority equipment:`);
            highPriority.forEach(eq => {
                console.log(`  ${eq.id}: ${eq.name}`);
            });
        }
        
        if (lowPriority.length > 0) {
            console.log(`\n🟢 Low priority equipment:`);
            lowPriority.forEach(eq => {
                console.log(`  ${eq.id}: ${eq.name}`);
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testPriorities();