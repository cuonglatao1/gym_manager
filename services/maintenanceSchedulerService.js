/**
 * Maintenance Scheduler Service - Automatic maintenance scheduling based on equipment priority
 * 
 * Logic:
 * 1. Equipment có priority (low, medium, high, critical) 
 * 2. Dựa trên priority tạo MaintenanceSchedule tự động
 * 3. Priority càng cao → lịch bảo trì càng dày (nhiều loại, chu kỳ ngắn)
 * 4. Khi đến hạn → thông báo → admin xác nhận → tạo lịch mới tự động
 */

const { Equipment, MaintenanceSchedule, MaintenanceHistory } = require('../models');
const { Op } = require('sequelize');

class MaintenanceSchedulerService {
    constructor() {
        this.maintenanceTemplates = this.getMaintenanceTemplates();
        this.init();
    }

    init() {
        console.log('📅 Maintenance Scheduler Service initialized');
        
        // Schedule daily check for new equipment needing schedules
        setInterval(() => {
            this.checkForNewEquipment();
        }, 24 * 60 * 60 * 1000); // Daily
        
        // Initial check after 10 seconds
        setTimeout(() => {
            this.checkForNewEquipment();
        }, 10000);
    }

    // Define maintenance templates based on priority
    getMaintenanceTemplates() {
        return {
            'critical': [
                { type: 'cleaning', intervalDays: 1, description: 'Vệ sinh thiết bị, lau chùi bề mặt, khử trùng các điểm tiếp xúc' },
                { type: 'inspection', intervalDays: 3, description: 'Kiểm tra ốc vít, dây cáp, các bộ phận chuyển động, tình trạng hoạt động' },
                { type: 'maintenance', intervalDays: 7, description: 'Bảo dưỡng, tra dầu, cân chỉnh, kiểm tra hệ thống, thay thế phụ tùng nếu cần' }
            ],
            'high': [
                { type: 'cleaning', intervalDays: 1, description: 'Vệ sinh thiết bị, lau chùi bề mặt, khử trùng các điểm tiếp xúc' },
                { type: 'inspection', intervalDays: 7, description: 'Kiểm tra ốc vít, dây cáp, các bộ phận chuyển động, tình trạng hoạt động' },
                { type: 'maintenance', intervalDays: 30, description: 'Bảo dưỡng, tra dầu, cân chỉnh, kiểm tra hệ thống, thay thế phụ tùng nếu cần' }
            ],
            'medium': [
                { type: 'cleaning', intervalDays: 3, description: 'Vệ sinh thiết bị, lau chùi bề mặt, khử trùng các điểm tiếp xúc' },
                { type: 'inspection', intervalDays: 14, description: 'Kiểm tra ốc vít, dây cáp, các bộ phận chuyển động, tình trạng hoạt động' },
                { type: 'maintenance', intervalDays: 60, description: 'Bảo dưỡng, tra dầu, cân chỉnh, kiểm tra hệ thống, thay thế phụ tùng nếu cần' }
            ],
            'low': [
                { type: 'cleaning', intervalDays: 7, description: 'Vệ sinh thiết bị, lau chùi bề mặt, khử trùng các điểm tiếp xúc' },
                { type: 'inspection', intervalDays: 30, description: 'Kiểm tra ốc vít, dây cáp, các bộ phận chuyển động, tình trạng hoạt động' },
                { type: 'maintenance', intervalDays: 90, description: 'Bảo dưỡng, tra dầu, cân chỉnh, kiểm tra hệ thống, thay thế phụ tùng nếu cần' }
            ]
        };
    }

    // Check for new equipment that needs maintenance schedules
    async checkForNewEquipment() {
        try {
            console.log('🔍 Checking for equipment needing maintenance schedules...');
            
            const equipmentWithoutSchedules = await Equipment.findAll({
                where: {
                    isActive: true,
                    status: { [Op.in]: ['active', 'maintenance'] }
                },
                include: [{
                    model: MaintenanceSchedule,
                    as: 'maintenanceSchedules',
                    required: false
                }]
            });

            let createdCount = 0;
            for (const equipment of equipmentWithoutSchedules) {
                if (!equipment.maintenanceSchedules || equipment.maintenanceSchedules.length === 0) {
                    await this.createSchedulesForEquipment(equipment.id, equipment.priority);
                    createdCount++;
                }
            }

            if (createdCount > 0) {
                console.log(`✅ Created maintenance schedules for ${createdCount} equipment`);
            } else {
                console.log('📋 All equipment already have maintenance schedules');
            }

        } catch (error) {
            console.error('❌ Error checking for new equipment:', error);
        }
    }

    // Create maintenance schedules for specific equipment based on priority
    async createSchedulesForEquipment(equipmentId, priority = 'medium') {
        try {
            const equipment = await Equipment.findByPk(equipmentId);
            if (!equipment) {
                throw new Error('Equipment not found');
            }

            const templates = this.maintenanceTemplates[priority] || this.maintenanceTemplates['medium'];
            const today = new Date();
            
            console.log(`📅 Creating maintenance schedules for ${equipment.name} (priority: ${priority})`);

            const schedules = [];
            for (const template of templates) {
                const nextDueDate = new Date(today);
                nextDueDate.setDate(today.getDate() + template.intervalDays);

                const schedule = await MaintenanceSchedule.create({
                    equipmentId: equipmentId,
                    maintenanceType: template.type,
                    priority: priority,
                    intervalDays: template.intervalDays,
                    nextDueDate: nextDueDate.toISOString().split('T')[0],
                    description: template.description,
                    isActive: true,
                    notes: `Auto-generated ${template.type} schedule for ${priority} priority equipment`
                });

                schedules.push(schedule);
            }

            console.log(`✅ Created ${schedules.length} maintenance schedules for ${equipment.name}`);
            return schedules;

        } catch (error) {
            console.error(`❌ Error creating schedules for equipment ${equipmentId}:`, error);
            return [];
        }
    }

    // Complete maintenance and create next schedule
    async completeMaintenance(scheduleId, details = {}) {
        try {
            const schedule = await MaintenanceSchedule.findByPk(scheduleId, {
                include: [{
                    model: Equipment,
                    as: 'equipment'
                }]
            });

            if (!schedule) {
                throw new Error('Maintenance schedule not found');
            }

            // Check if this schedule is already completed
            if (!schedule.isActive) {
                throw new Error('This maintenance schedule has already been completed');
            }

            // STEP 1: Calculate next due date first
            const nextDueDate = new Date();
            nextDueDate.setDate(nextDueDate.getDate() + schedule.intervalDays);
            const nextDueDateStr = nextDueDate.toISOString().split('T')[0];

            // STEP 2: Deactivate ALL active schedules of the same type for this equipment
            // This includes the current schedule AND any duplicates
            const completedDate = new Date().toISOString().split('T')[0]; // Thời gian thực khi ấn hoàn thành
            const deactivatedCount = await MaintenanceSchedule.update(
                { 
                    isActive: false, 
                    lastCompletedDate: completedDate,
                    notes: details.notes || 'Hoàn thành bảo trì định kỳ'
                },
                {
                    where: {
                        equipmentId: schedule.equipmentId,
                        maintenanceType: schedule.maintenanceType,
                        isActive: true
                    }
                }
            );
            
            console.log(`🧹 Deactivated ${deactivatedCount[0]} schedules of type ${schedule.maintenanceType}`);

            // STEP 3: Check if a schedule for the next due date already exists
            const existingScheduleForDate = await MaintenanceSchedule.findOne({
                where: {
                    equipmentId: schedule.equipmentId,
                    maintenanceType: schedule.maintenanceType,
                    nextDueDate: nextDueDateStr,
                    isActive: true
                }
            });

            let nextSchedule;
            if (existingScheduleForDate) {
                console.log(`⚠️ Schedule for ${nextDueDateStr} already exists, reusing it`);
                // Make sure existing schedule has completion date
                if (!existingScheduleForDate.lastCompletedDate) {
                    await existingScheduleForDate.update({ lastCompletedDate: completedDate });
                }
                nextSchedule = existingScheduleForDate;
            } else {
                // STEP 4: Create new schedule only if none exists for this date
                nextSchedule = await MaintenanceSchedule.create({
                    equipmentId: schedule.equipmentId,
                    maintenanceType: schedule.maintenanceType,
                    priority: schedule.priority,
                    intervalDays: schedule.intervalDays,
                    nextDueDate: nextDueDateStr,
                    description: schedule.description,
                    isActive: true,
                    lastCompletedDate: completedDate, // ALWAYS set completion date
                    notes: `Auto-generated next ${schedule.maintenanceType} schedule`,
                    previousScheduleId: schedule.id
                });
                console.log(`✅ Created new schedule for ${nextDueDateStr} with lastCompletedDate: ${completedDate}`);
            }

            // Create maintenance history record
            const historyRecord = await MaintenanceHistory.create({
                equipmentId: schedule.equipmentId,
                maintenanceType: schedule.maintenanceType,
                performedDate: completedDate,
                performedBy: details.performedBy || 1, // Default to admin user ID
                duration: details.duration,
                workPerformed: details.notes || `${this.getMaintenanceTypeText(schedule.maintenanceType)} - Hoàn thành theo lịch`,
                notes: details.notes || `Lịch bảo trì ${this.getMaintenanceTypeText(schedule.maintenanceType)} đã hoàn thành`,
                cost: details.cost || 0,
                result: 'completed',
                priority: schedule.equipment?.priority || 'medium',
                equipmentConditionBefore: 'good',
                equipmentConditionAfter: details.conditionAfter || 'good',
                scheduleId: schedule.id
            });

            console.log(`✅ Completed maintenance for ${schedule.equipment?.name} and created next schedule`);

            return {
                success: true,
                completedSchedule: schedule,
                nextSchedule: nextSchedule,
                historyRecord: historyRecord
            };

        } catch (error) {
            console.error('❌ Error completing maintenance:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Skip/Delete overdue maintenance
    async skipOverdueMaintenance(scheduleId, reason = 'Bỏ qua do quá hạn') {
        try {
            const schedule = await MaintenanceSchedule.findByPk(scheduleId);
            if (!schedule) {
                throw new Error('Maintenance schedule not found');
            }

            // Check if this schedule is already inactive
            if (!schedule.isActive) {
                throw new Error('This maintenance schedule has already been processed');
            }

            // STEP 1: Calculate next due date
            const nextDueDate = new Date();
            nextDueDate.setDate(nextDueDate.getDate() + schedule.intervalDays);
            const nextDueDateStr = nextDueDate.toISOString().split('T')[0];

            // STEP 2: Deactivate ALL active schedules of the same type for this equipment
            const deactivatedCount = await MaintenanceSchedule.update(
                { 
                    isActive: false,
                    status: 'skipped',
                    completionNotes: reason
                },
                {
                    where: {
                        equipmentId: schedule.equipmentId,
                        maintenanceType: schedule.maintenanceType,
                        isActive: true
                    }
                }
            );
            
            console.log(`🧹 Deactivated ${deactivatedCount[0]} schedules during skip`);

            // STEP 3: Check if a schedule for the next due date already exists
            const existingScheduleForDate = await MaintenanceSchedule.findOne({
                where: {
                    equipmentId: schedule.equipmentId,
                    maintenanceType: schedule.maintenanceType,
                    nextDueDate: nextDueDateStr,
                    isActive: true
                }
            });

            let nextSchedule;
            if (existingScheduleForDate) {
                console.log(`⚠️ Schedule for ${nextDueDateStr} already exists after skip, reusing it`);
                nextSchedule = existingScheduleForDate;
            } else {
                // STEP 4: Create new schedule only if none exists for this date
                nextSchedule = await MaintenanceSchedule.create({
                    equipmentId: schedule.equipmentId,
                    maintenanceType: schedule.maintenanceType,
                    priority: schedule.priority,
                    intervalDays: schedule.intervalDays,
                    nextDueDate: nextDueDateStr,
                    description: schedule.description,
                    isActive: true,
                    lastCompletedDate: null, // Skipped, so no completion date
                    notes: `Auto-generated after skipping overdue schedule`,
                    previousScheduleId: schedule.id
                });
                console.log(`✅ Created new schedule after skip for ${nextDueDateStr}`);
            }

            console.log(`⏭️ Skipped overdue maintenance and created next schedule`);

            return {
                success: true,
                skippedSchedule: schedule,
                nextSchedule: nextSchedule
            };

        } catch (error) {
            console.error('❌ Error skipping maintenance:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get maintenance type text in Vietnamese
    getMaintenanceTypeText(type) {
        const types = {
            'cleaning': 'vệ sinh',
            'inspection': 'kiểm tra',
            'maintenance': 'bảo dưỡng'
        };
        return types[type] || type;
    }

    // Clean up duplicate maintenance schedules
    async cleanupDuplicateSchedules() {
        try {
            console.log('🧹 Starting cleanup of duplicate maintenance schedules...');
            
            // Find all active schedules grouped by equipment and maintenance type
            const duplicateGroups = await MaintenanceSchedule.findAll({
                where: { isActive: true },
                order: [['createdAt', 'DESC']] // Keep the newest ones
            });

            // Group by equipmentId + maintenanceType
            const groupedSchedules = {};
            duplicateGroups.forEach(schedule => {
                const key = `${schedule.equipmentId}_${schedule.maintenanceType}`;
                if (!groupedSchedules[key]) {
                    groupedSchedules[key] = [];
                }
                groupedSchedules[key].push(schedule);
            });

            let cleanedCount = 0;
            for (const [key, schedules] of Object.entries(groupedSchedules)) {
                if (schedules.length > 1) {
                    // Keep the newest, deactivate the rest
                    const toDeactivate = schedules.slice(1); // All except the first (newest)
                    
                    if (toDeactivate.length > 0) {
                        await MaintenanceSchedule.update(
                            { 
                                isActive: false, 
                                notes: 'Deactivated during duplicate cleanup - ' + new Date().toISOString()
                            },
                            {
                                where: {
                                    id: { [Op.in]: toDeactivate.map(s => s.id) }
                                }
                            }
                        );
                        cleanedCount += toDeactivate.length;
                        console.log(`🧹 Cleaned ${toDeactivate.length} duplicates for ${key}`);
                    }
                }
            }

            console.log(`✅ Cleanup completed. Deactivated ${cleanedCount} duplicate schedules`);
            return { success: true, cleanedCount };

        } catch (error) {
            console.error('❌ Error during duplicate cleanup:', error);
            return { success: false, error: error.message, cleanedCount: 0 };
        }
    }

    // Get maintenance dashboard data
    async getMaintenanceDashboard() {
        try {
            const today = new Date().toISOString().split('T')[0];

            const summary = {
                total: await MaintenanceSchedule.count({ where: { isActive: true } }),
                overdue: await MaintenanceSchedule.count({
                    where: {
                        isActive: true,
                        nextDueDate: { [Op.lt]: today }
                    }
                }),
                dueToday: await MaintenanceSchedule.count({
                    where: {
                        isActive: true,
                        nextDueDate: today
                    }
                }),
                upcoming: await MaintenanceSchedule.count({
                    where: {
                        isActive: true,
                        nextDueDate: { [Op.gt]: today }
                    }
                })
            };

            // Get equipment counts by priority
            const equipmentByPriority = await Equipment.findAll({
                attributes: [
                    'priority',
                    [Equipment.sequelize.fn('COUNT', Equipment.sequelize.col('id')), 'count']
                ],
                where: { isActive: true },
                group: ['priority'],
                raw: true
            });

            const priorityCounts = {
                critical: 0,
                high: 0,
                medium: 0,
                low: 0
            };

            equipmentByPriority.forEach(item => {
                priorityCounts[item.priority] = parseInt(item.count);
            });

            return {
                summary,
                equipmentByPriority: priorityCounts
            };

        } catch (error) {
            console.error('❌ Error getting maintenance dashboard:', error);
            return { 
                summary: { total: 0, overdue: 0, dueToday: 0, upcoming: 0 },
                equipmentByPriority: { critical: 0, high: 0, medium: 0, low: 0 }
            };
        }
    }

    // Get maintenance schedules summary
    async getMaintenanceSchedulesSummary() {
        try {
            const today = new Date().toISOString().split('T')[0];

            const summary = {
                total: await MaintenanceSchedule.count({ where: { isActive: true } }),
                overdue: await MaintenanceSchedule.count({
                    where: {
                        isActive: true,
                        nextDueDate: { [Op.lt]: today }
                    }
                }),
                dueToday: await MaintenanceSchedule.count({
                    where: {
                        isActive: true,
                        nextDueDate: today
                    }
                }),
                upcoming: await MaintenanceSchedule.count({
                    where: {
                        isActive: true,
                        nextDueDate: { [Op.gt]: today }
                    }
                })
            };

            return summary;

        } catch (error) {
            console.error('❌ Error getting maintenance schedules summary:', error);
            return { total: 0, overdue: 0, dueToday: 0, upcoming: 0 };
        }
    }
}

// Create singleton instance
const maintenanceSchedulerService = new MaintenanceSchedulerService();

module.exports = maintenanceSchedulerService;