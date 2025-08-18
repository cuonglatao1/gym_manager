const { User, ClassSchedule, Class, ClassType } = require('./models');
const { Op } = require('sequelize');

async function checkTrainerStats() {
    try {
        console.log('🔍 Checking trainer statistics...\n');
        
        // Get all trainers
        const trainers = await User.findAll({
            where: { role: 'trainer', isActive: true },
            attributes: ['id', 'fullName', 'email', 'username']
        });
        
        console.log(`📋 Found ${trainers.length} active trainers:\n`);
        
        for (const trainer of trainers) {
            const name = trainer.fullName || trainer.username;
            console.log(`👨‍🏫 ${name} (ID: ${trainer.id}, Email: ${trainer.email})`);
            
            // Get all schedules for this trainer
            const schedules = await ClassSchedule.findAll({
                where: { trainerId: trainer.id },
                include: [
                    {
                        model: Class,
                        as: 'class',
                        include: [
                            {
                                model: ClassType,
                                as: 'classType',
                                attributes: ['name']
                            }
                        ],
                        attributes: ['name']
                    }
                ],
                attributes: ['id', 'date', 'startTime', 'endTime', 'status'],
                order: [['date', 'ASC'], ['startTime', 'ASC']]
            });
            
            console.log(`  📅 Total schedules: ${schedules.length}`);
            
            if (schedules.length > 0) {
                // Group by class type
                const classByType = {};
                schedules.forEach(schedule => {
                    const className = schedule.class?.classType?.name || schedule.class?.name || 'Unknown';
                    if (!classByType[className]) {
                        classByType[className] = [];
                    }
                    classByType[className].push(schedule);
                });
                
                console.log('  📊 Classes by type:');
                Object.entries(classByType).forEach(([className, classSchedules]) => {
                    console.log(`    • ${className}: ${classSchedules.length} schedules`);
                });
                
                // Show status breakdown
                const statusCount = {};
                schedules.forEach(schedule => {
                    const status = schedule.status || 'unknown';
                    statusCount[status] = (statusCount[status] || 0) + 1;
                });
                
                console.log('  📈 Status breakdown:');
                Object.entries(statusCount).forEach(([status, count]) => {
                    console.log(`    • ${status}: ${count} schedules`);
                });
                
                // Show recent schedules
                console.log('  🕒 Recent schedules:');
                schedules.slice(0, 5).forEach(schedule => {
                    const className = schedule.class?.classType?.name || schedule.class?.name || 'Unknown';
                    console.log(`    • ${schedule.date} ${schedule.startTime}-${schedule.endTime} - ${className} (${schedule.status})`);
                });
                
            } else {
                console.log('  ❌ No schedules found');
            }
            
            console.log(''); // Empty line separator
        }
        
        // Also check if there are any schedules without trainers
        const orphanSchedules = await ClassSchedule.findAll({
            where: { 
                trainerId: {
                    [Op.or]: [null, { [Op.notIn]: trainers.map(t => t.id) }]
                }
            },
            include: [
                {
                    model: Class,
                    as: 'class',
                    include: [
                        {
                            model: ClassType,
                            as: 'classType',
                            attributes: ['name']
                        }
                    ],
                    attributes: ['name']
                }
            ],
            attributes: ['id', 'date', 'startTime', 'trainerId']
        });
        
        if (orphanSchedules.length > 0) {
            console.log(`⚠️  Found ${orphanSchedules.length} schedules without valid trainers:`);
            orphanSchedules.forEach(schedule => {
                const className = schedule.class?.classType?.name || schedule.class?.name || 'Unknown';
                console.log(`  • Schedule ID ${schedule.id}: ${schedule.date} ${schedule.startTime} - ${className} (Trainer ID: ${schedule.trainerId})`);
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkTrainerStats();