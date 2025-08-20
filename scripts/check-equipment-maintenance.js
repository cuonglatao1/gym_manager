/**
 * Script to check EquipmentMaintenance data in database
 */

const { EquipmentMaintenance, Equipment } = require('../models');

async function checkEquipmentMaintenance() {
    console.log('🔍 Checking EquipmentMaintenance data in database...');
    
    try {
        // Count total tasks
        const totalCount = await EquipmentMaintenance.count();
        console.log(`📋 Total EquipmentMaintenance records: ${totalCount}`);

        // Count by status
        const statusCounts = await EquipmentMaintenance.findAll({
            attributes: [
                'status',
                [require('sequelize').fn('COUNT', '*'), 'count']
            ],
            group: ['status'],
            raw: true
        });
        
        console.log('📊 By Status:');
        statusCounts.forEach(s => console.log(`   ${s.status}: ${s.count}`));

        // Count by maintenance type
        const typeCounts = await EquipmentMaintenance.findAll({
            attributes: [
                'maintenanceType',
                [require('sequelize').fn('COUNT', '*'), 'count']
            ],
            group: ['maintenanceType'],
            raw: true
        });
        
        console.log('🔧 By Type:');
        typeCounts.forEach(t => console.log(`   ${t.maintenanceType}: ${t.count}`));

        // Show some sample records
        const sampleRecords = await EquipmentMaintenance.findAll({
            include: [{
                model: Equipment,
                as: 'equipment'
            }],
            limit: 10,
            order: [['createdAt', 'DESC']]
        });

        console.log('\n📝 Sample Records:');
        sampleRecords.forEach((record, index) => {
            console.log(`${index + 1}. ${record.title} - ${record.equipment?.name || 'No Equipment'} - ${record.scheduledDate} (${record.status})`);
        });

        // Check if any have null equipmentId
        const nullEquipment = await EquipmentMaintenance.count({
            where: { equipmentId: null }
        });
        
        if (nullEquipment > 0) {
            console.log(`⚠️ Found ${nullEquipment} records with null equipmentId`);
        }

        // Check associations
        console.log('\n🔗 Testing associations...');
        const firstRecord = await EquipmentMaintenance.findOne({
            include: [{
                model: Equipment,
                as: 'equipment'
            }]
        });
        
        if (firstRecord) {
            console.log(`✅ Association working: ${firstRecord.title} -> ${firstRecord.equipment?.name || 'No Equipment'}`);
        } else {
            console.log('❌ No records found to test association');
        }

    } catch (error) {
        console.error('❌ Error checking equipment maintenance:', error);
    }
}

// Run the check
if (require.main === module) {
    checkEquipmentMaintenance().then(() => {
        console.log('🏁 Check completed!');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Check failed:', error);
        process.exit(1);
    });
}

module.exports = { checkEquipmentMaintenance };