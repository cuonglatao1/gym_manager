const { MaintenanceSchedule, Equipment, User } = require('../models');
const { Op } = require('sequelize');

class NotificationService {
    constructor() {
        this.notifications = []; // In-memory storage for demo
        this.init();
    }

    // Initialize notification service
    init() {
        console.log('🔔 Notification Service initialized');
        
        // Schedule periodic checks (every 30 minutes in production, every 5 minutes for demo)
        setInterval(() => {
            this.checkMaintenanceNotifications();
        }, 300000); // 5 minutes for demo
        
        // Initial check after 10 seconds
        setTimeout(() => {
            this.checkMaintenanceNotifications();
        }, 10000); // 10 seconds after startup
    }

    // Check for maintenance notifications from MaintenanceSchedule
    async checkMaintenanceNotifications() {
        try {
            console.log('🔍 Checking maintenance notifications from MaintenanceSchedule...');
            
            // Check overdue maintenance schedules
            await this.checkOverdueMaintenanceSchedules();
            
            // Check due today maintenance schedules 
            await this.checkUpcomingMaintenanceSchedules();
            
            // Check equipment status alerts
            await this.checkEquipmentStatusAlerts();
            
            console.log(`📋 Total notifications: ${this.notifications.length}`);
        } catch (error) {
            console.error('❌ Error checking maintenance notifications:', error);
        }
    }

    // Check overdue maintenance schedules
    async checkOverdueMaintenanceSchedules() {
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
                
                // Create notification for overdue maintenance schedule
                this.addNotification({
                    type: 'overdue_maintenance',
                    priority: schedule.equipment.priority === 'critical' ? 'critical' : 
                             daysOverdue > 7 ? 'critical' : 
                             daysOverdue > 3 ? 'high' : 'medium',
                    title: `Lịch bảo trì quá hạn ${daysOverdue} ngày`,
                    message: `${schedule.equipment.name} (${schedule.equipment.equipmentCode}) cần ${this.getMaintenanceTypeText(schedule.maintenanceType)}`,
                    equipmentId: schedule.equipmentId,
                    scheduleId: schedule.id,
                    daysOverdue: daysOverdue,
                    category: 'maintenance'
                });
            }

            console.log(`⚠️ Found ${overdueSchedules.length} overdue maintenance schedules`);
        } catch (error) {
            console.error('Error checking overdue maintenance schedules:', error);
        }
    }

    // Check due today maintenance schedules
    async checkUpcomingMaintenanceSchedules() {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            const todaySchedules = await MaintenanceSchedule.findAll({
                where: {
                    nextDueDate: today,
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

            for (const schedule of todaySchedules) {
                this.addNotification({
                    type: 'due_today_maintenance',
                    priority: schedule.equipment.priority === 'critical' ? 'critical' : 'high',
                    title: 'Lịch bảo trì hôm nay',
                    message: `${schedule.equipment.name} (${schedule.equipment.equipmentCode}) cần ${this.getMaintenanceTypeText(schedule.maintenanceType)}`,
                    equipmentId: schedule.equipmentId,
                    scheduleId: schedule.id,
                    dueDate: schedule.nextDueDate,
                    category: 'maintenance'
                });
            }

            console.log(`📅 Found ${todaySchedules.length} due today maintenance schedules`);
        } catch (error) {
            console.error('Error checking due today maintenance schedules:', error);
        }
    }

    // Check equipment status alerts (disabled - user doesn't use equipment status)
    async checkEquipmentStatusAlerts() {
        try {
            // Equipment status checking is disabled per user request
            console.log(`🔧 Equipment status alerts disabled - no status-based notifications`);
        } catch (error) {
            console.error('Error checking equipment status alerts:', error);
        }
    }

    // Add notification (avoid duplicates)
    addNotification(notification) {
        // More robust duplicate check - include title and message
        const existing = this.notifications.find(n => 
            n.type === notification.type && 
            n.equipmentId === notification.equipmentId &&
            n.title === notification.title &&
            (n.scheduleId === notification.scheduleId || n.maintenanceTaskId === notification.maintenanceTaskId)
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

    getEquipmentMaintenanceTypeText(type) {
        const types = {
            'daily_clean': 'vệ sinh hàng ngày',
            'weekly_check': 'kiểm tra hàng tuần', 
            'monthly_maintenance': 'bảo dưỡng hàng tháng',
            'repair': 'sửa chữa',
            'replacement': 'thay mới'
        };
        return types[type] || type;
    }

    // Real-time notification methods (for WebSocket/SSE integration)
    subscribeToNotifications(callback) {
        // This would integrate with WebSocket or Server-Sent Events
        // For now, just return current notifications
        return this.getNotifications({ unreadOnly: true });
    }

    // Complete maintenance schedule from notification
    async completeMaintenance(notificationId, details = {}) {
        try {
            const notification = this.notifications.find(n => n.id === notificationId);
            
            if (!notification) {
                return {
                    success: false,
                    message: 'Không tìm thấy thông báo'
                };
            }

            if (!notification.scheduleId) {
                return {
                    success: false,
                    message: 'Thông báo không có thông tin lịch bảo trì'
                };
            }

            // Use maintenance scheduler service to complete maintenance
            const maintenanceSchedulerService = require('./maintenanceSchedulerService');
            const result = await maintenanceSchedulerService.completeMaintenance(notification.scheduleId, details);

            if (result.success) {
                // Mark notification as read
                this.markAsRead(notificationId);

                // Check for any new notifications after completion
                setTimeout(() => {
                    this.checkMaintenanceNotifications();
                }, 1000);

                return {
                    success: true,
                    message: 'Đã hoàn thành lịch bảo trì và tạo lịch mới thành công',
                    data: {
                        completedSchedule: {
                            id: result.completedSchedule.id,
                            equipmentName: result.completedSchedule.equipment?.name,
                            maintenanceType: this.getMaintenanceTypeText(result.completedSchedule.maintenanceType),
                            completedDate: result.completedSchedule.lastPerformed,
                            status: 'completed'
                        },
                        nextSchedule: {
                            id: result.nextSchedule.id,
                            nextDueDate: result.nextSchedule.nextDueDate,
                            maintenanceType: this.getMaintenanceTypeText(result.nextSchedule.maintenanceType)
                        },
                        historyRecord: result.historyRecord
                    }
                };
            } else {
                return {
                    success: false,
                    message: 'Lỗi khi hoàn thành bảo trì: ' + result.error
                };
            }

        } catch (error) {
            console.error('Error completing maintenance schedule from notification:', error);
            return {
                success: false,
                message: 'Lỗi khi xử lý hoàn thành bảo trì: ' + error.message
            };
        }
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