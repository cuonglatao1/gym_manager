const { MaintenanceSchedule, Equipment, EquipmentMaintenance, User } = require('../models');
const { Op } = require('sequelize');

class NotificationService {
    constructor() {
        this.notifications = []; // In-memory storage for demo
        this.init();
    }

    // Initialize notification service
    init() {
        console.log('🔔 Notification Service initialized');
        
        // Schedule periodic checks (every 30 minutes in production, every 1 minute for demo)
        setInterval(() => {
            this.checkMaintenanceNotifications();
        }, 60000); // 1 minute for demo
        
        // Initial check
        setTimeout(() => {
            this.checkMaintenanceNotifications();
        }, 5000); // 5 seconds after startup
    }

    // Check for maintenance notifications
    async checkMaintenanceNotifications() {
        try {
            console.log('🔍 Checking maintenance notifications...');
            
            // Check overdue maintenance
            await this.checkOverdueMaintenance();
            
            // Check upcoming maintenance (today and tomorrow)
            await this.checkUpcomingMaintenance();
            
            // Check equipment status alerts
            await this.checkEquipmentStatusAlerts();
            
            console.log(`📋 Total notifications: ${this.notifications.length}`);
        } catch (error) {
            console.error('❌ Error checking maintenance notifications:', error);
        }
    }

    // Check overdue maintenance
    async checkOverdueMaintenance() {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            const overdueSchedules = await MaintenanceSchedule.findAll({
                where: {
                    nextDueDate: { [Op.lt]: today },
                    isActive: true
                },
                include: [{
                    model: Equipment,
                    as: 'equipment',
                    where: { 
                        status: { [Op.in]: ['active', 'maintenance'] },
                        isActive: true 
                    }
                }],
                order: [['nextDueDate', 'ASC']]
            });

            for (const schedule of overdueSchedules) {
                const daysOverdue = this.getDaysOverdue(schedule.nextDueDate);
                
                // Create notification for overdue maintenance
                this.addNotification({
                    type: 'overdue_maintenance',
                    priority: daysOverdue > 7 ? 'critical' : daysOverdue > 3 ? 'high' : 'medium',
                    title: `Bảo trì quá hạn ${daysOverdue} ngày`,
                    message: `${schedule.equipment.name} (${schedule.equipment.equipmentCode}) cần ${this.getMaintenanceTypeText(schedule.maintenanceType)}`,
                    equipmentId: schedule.equipmentId,
                    scheduleId: schedule.id,
                    daysOverdue: daysOverdue,
                    category: 'maintenance'
                });
            }

            console.log(`⚠️ Found ${overdueSchedules.length} overdue maintenance items`);
        } catch (error) {
            console.error('Error checking overdue maintenance:', error);
        }
    }

    // Check upcoming maintenance
    async checkUpcomingMaintenance() {
        try {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dayAfterTomorrow = new Date(today);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
            
            const upcomingSchedules = await MaintenanceSchedule.findAll({
                where: {
                    nextDueDate: {
                        [Op.between]: [
                            today.toISOString().split('T')[0],
                            dayAfterTomorrow.toISOString().split('T')[0]
                        ]
                    },
                    isActive: true
                },
                include: [{
                    model: Equipment,
                    as: 'equipment',
                    where: { 
                        status: { [Op.in]: ['active', 'maintenance'] },
                        isActive: true 
                    }
                }]
            });

            for (const schedule of upcomingSchedules) {
                const dueDate = new Date(schedule.nextDueDate);
                const isToday = dueDate.toDateString() === today.toDateString();
                const isTomorrow = dueDate.toDateString() === tomorrow.toDateString();
                
                this.addNotification({
                    type: 'upcoming_maintenance',
                    priority: isToday ? 'high' : 'medium',
                    title: isToday ? 'Bảo trì hôm nay' : isTomorrow ? 'Bảo trì ngày mai' : 'Bảo trì sắp tới',
                    message: `${schedule.equipment.name} (${schedule.equipment.equipmentCode}) cần ${this.getMaintenanceTypeText(schedule.maintenanceType)}`,
                    equipmentId: schedule.equipmentId,
                    scheduleId: schedule.id,
                    dueDate: schedule.nextDueDate,
                    category: 'maintenance'
                });
            }

            console.log(`📅 Found ${upcomingSchedules.length} upcoming maintenance items`);
        } catch (error) {
            console.error('Error checking upcoming maintenance:', error);
        }
    }

    // Check equipment status alerts
    async checkEquipmentStatusAlerts() {
        try {
            // Check broken equipment
            const brokenEquipment = await Equipment.findAll({
                where: {
                    status: 'broken',
                    isActive: true
                }
            });

            for (const equipment of brokenEquipment) {
                this.addNotification({
                    type: 'equipment_broken',
                    priority: 'critical',
                    title: 'Thiết bị hỏng',
                    message: `${equipment.name} (${equipment.equipmentCode}) đang trong trạng thái hỏng`,
                    equipmentId: equipment.id,
                    category: 'equipment_status'
                });
            }

            // Check equipment in maintenance too long
            const maintenanceEquipment = await Equipment.findAll({
                where: {
                    status: 'maintenance',
                    isActive: true,
                    updatedAt: { [Op.lt]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 days ago
                }
            });

            for (const equipment of maintenanceEquipment) {
                this.addNotification({
                    type: 'maintenance_too_long',
                    priority: 'medium',
                    title: 'Bảo trì quá lâu',
                    message: `${equipment.name} (${equipment.equipmentCode}) đang bảo trì quá 7 ngày`,
                    equipmentId: equipment.id,
                    category: 'equipment_status'
                });
            }

            console.log(`🔧 Found ${brokenEquipment.length} broken and ${maintenanceEquipment.length} long-maintenance equipment`);
        } catch (error) {
            console.error('Error checking equipment status alerts:', error);
        }
    }

    // Add notification (avoid duplicates)
    addNotification(notification) {
        const existing = this.notifications.find(n => 
            n.type === notification.type && 
            n.equipmentId === notification.equipmentId &&
            n.scheduleId === notification.scheduleId
        );

        if (!existing) {
            this.notifications.push({
                id: Date.now() + Math.random(),
                createdAt: new Date(),
                read: false,
                ...notification
            });

            // Keep only last 100 notifications
            if (this.notifications.length > 100) {
                this.notifications = this.notifications.slice(-100);
            }
        }
    }

    // Get all notifications
    getNotifications(filters = {}) {
        let filtered = [...this.notifications];

        // Filter by read status
        if (filters.unreadOnly) {
            filtered = filtered.filter(n => !n.read);
        }

        // Filter by priority
        if (filters.priority) {
            filtered = filtered.filter(n => n.priority === filters.priority);
        }

        // Filter by category
        if (filters.category) {
            filtered = filtered.filter(n => n.category === filters.category);
        }

        // Sort by priority and date
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        filtered.sort((a, b) => {
            const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        return filtered;
    }

    // Mark notification as read
    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            return true;
        }
        return false;
    }

    // Mark all notifications as read
    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        return this.notifications.length;
    }

    // Clear old notifications
    clearOldNotifications(daysOld = 7) {
        const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
        const originalLength = this.notifications.length;
        
        this.notifications = this.notifications.filter(n => 
            new Date(n.createdAt) > cutoffDate
        );
        
        return originalLength - this.notifications.length;
    }

    // Get notification summary
    getNotificationSummary() {
        const unread = this.notifications.filter(n => !n.read);
        const critical = unread.filter(n => n.priority === 'critical');
        const high = unread.filter(n => n.priority === 'high');
        const medium = unread.filter(n => n.priority === 'medium');

        return {
            total: this.notifications.length,
            unread: unread.length,
            critical: critical.length,
            high: high.length,
            medium: medium.length,
            byCategory: {
                maintenance: unread.filter(n => n.category === 'maintenance').length,
                equipment_status: unread.filter(n => n.category === 'equipment_status').length
            }
        };
    }

    // Generate maintenance tasks from overdue notifications
    async generateTasksFromNotifications() {
        try {
            const overdueNotifications = this.notifications.filter(n => 
                n.type === 'overdue_maintenance' && !n.read
            );

            let generatedCount = 0;
            for (const notification of overdueNotifications) {
                try {
                    // Check if task already exists
                    const existingTask = await EquipmentMaintenance.findOne({
                        where: {
                            equipmentId: notification.equipmentId,
                            status: { [Op.in]: ['scheduled', 'in_progress'] }
                        }
                    });

                    if (!existingTask) {
                        const schedule = await MaintenanceSchedule.findByPk(notification.scheduleId);
                        if (schedule) {
                            await schedule.generateMaintenanceTask();
                            generatedCount++;
                            
                            // Mark notification as read
                            this.markAsRead(notification.id);
                        }
                    }
                } catch (error) {
                    console.error(`Error generating task for notification ${notification.id}:`, error);
                }
            }

            return generatedCount;
        } catch (error) {
            console.error('Error generating tasks from notifications:', error);
            return 0;
        }
    }

    // Helper methods
    getDaysOverdue(dueDateString) {
        const today = new Date();
        const dueDate = new Date(dueDateString);
        const diffTime = today - dueDate;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    getMaintenanceTypeText(type) {
        const types = {
            'cleaning': 'vệ sinh',
            'inspection': 'kiểm tra',
            'maintenance': 'bảo dưỡng'
        };
        return types[type] || type;
    }

    // Real-time notification methods (for WebSocket/SSE integration)
    subscribeToNotifications(callback) {
        // This would integrate with WebSocket or Server-Sent Events
        // For now, just return current notifications
        return this.getNotifications({ unreadOnly: true });
    }

    // Simulate real-time updates
    simulateRealTimeUpdate() {
        // This would trigger WebSocket updates to connected clients
        console.log('📡 Broadcasting notification update to connected clients');
    }
}

// Create singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;