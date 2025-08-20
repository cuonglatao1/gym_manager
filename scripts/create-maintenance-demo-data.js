const { Equipment, MaintenanceSchedule } = require('../models');

async function createMaintenanceDemoData() {
    try {
        console.log('🔧 Creating maintenance demo data...');
        
        // Check if equipment exists
        const equipmentCount = await Equipment.count();
        console.log(`📋 Found ${equipmentCount} equipment items`);
        
        if (equipmentCount === 0) {
            console.log('📝 Creating demo equipment...');
            
            // Create demo equipment
            const equipmentData = [
                {
                    name: 'Máy chạy bộ TM-001',
                    category: 'cardio',
                    brand: 'TechnoGym',
                    model: 'Run Personal',
                    serial_number: 'TM001-2024',
                    status: 'active',
                    purchase_date: '2024-01-15',
                    warranty_expiry: '2026-01-15',
                    location: 'Khu vực Cardio'
                },
                {
                    name: 'Tạ đa năng MS-002',
                    category: 'strength',
                    brand: 'Life Fitness',
                    model: 'Multi Station Pro',
                    serial_number: 'MS002-2024',
                    status: 'active',
                    purchase_date: '2024-02-01',
                    warranty_expiry: '2026-02-01',
                    location: 'Khu vực Strength'
                },
                {
                    name: 'Xe đạp tập BK-003',
                    category: 'cardio',
                    brand: 'Schwinn',
                    model: 'IC4 Indoor Cycling',
                    serial_number: 'BK003-2024',
                    status: 'active',
                    purchase_date: '2024-01-20',
                    warranty_expiry: '2026-01-20',
                    location: 'Khu vực Cardio'
                },
                {
                    name: 'Máy rowing RW-004',
                    category: 'cardio',
                    brand: 'Concept2',
                    model: 'Model D',
                    serial_number: 'RW004-2024',
                    status: 'maintenance',
                    purchase_date: '2023-12-01',
                    warranty_expiry: '2025-12-01',
                    location: 'Khu vực Cardio'
                }
            ];
            
            for (const equip of equipmentData) {
                await Equipment.create(equip);
            }
            
            console.log('✅ Created demo equipment');
        }
        
        // Get all equipment
        const allEquipment = await Equipment.findAll();
        
        // Check if maintenance schedules exist
        const scheduleCount = await MaintenanceSchedule.count();
        console.log(`📋 Found ${scheduleCount} maintenance schedules`);
        
        if (scheduleCount === 0) {
            console.log('📝 Creating demo maintenance schedules...');
            
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);
            
            // Create maintenance schedules with different due dates
            for (const equipment of allEquipment) {
                // Create overdue maintenance (quá hạn)
                await MaintenanceSchedule.create({
                    equipmentId: equipment.id,
                    maintenanceType: 'maintenance',
                    priority: 'high',
                    intervalDays: 30,
                    lastCompletedDate: '2024-07-01',
                    nextDueDate: yesterday.toISOString().split('T')[0], // Quá hạn 1 ngày
                    isActive: true,
                    notes: `Bảo trì định kỳ ${equipment.name} - QUÁCH HẠN`
                });
                
                // Create due today maintenance (hôm nay)
                await MaintenanceSchedule.create({
                    equipmentId: equipment.id,
                    maintenanceType: 'inspection',
                    priority: 'medium',
                    intervalDays: 14,
                    lastCompletedDate: '2024-08-06',
                    nextDueDate: today.toISOString().split('T')[0], // Hôm nay
                    isActive: true,
                    notes: `Kiểm tra an toàn ${equipment.name} - HÔM NAY`
                });
                
                // Create upcoming maintenance (sắp tới)
                await MaintenanceSchedule.create({
                    equipmentId: equipment.id,
                    maintenanceType: 'cleaning',
                    priority: 'low',
                    intervalDays: 7,
                    lastCompletedDate: today.toISOString().split('T')[0],
                    nextDueDate: nextWeek.toISOString().split('T')[0], // Tuần sau
                    isActive: true,
                    notes: `Vệ sinh ${equipment.name} - SẮP TỚI`
                });
            }
            
            console.log('✅ Created demo maintenance schedules');
        }
        
        // Force check notifications to generate them
        console.log('🔔 Triggering notification check...');
        const notificationService = require('../services/notificationService');
        await notificationService.checkMaintenanceNotifications();
        
        console.log('🎉 Maintenance demo data created successfully!');
        
    } catch (error) {
        console.error('❌ Error creating maintenance demo data:', error);
    }
}

// Run if called directly
if (require.main === module) {
    createMaintenanceDemoData().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}

module.exports = createMaintenanceDemoData;