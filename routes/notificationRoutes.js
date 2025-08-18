const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

// Get all notifications
router.get('/', authenticate, async (req, res) => {
    try {
        const filters = {
            unreadOnly: req.query.unread === 'true',
            priority: req.query.priority,
            category: req.query.category
        };

        const notifications = notificationService.getNotifications(filters);
        
        res.json({
            success: true,
            data: notifications
        });
    } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách thông báo'
        });
    }
});

// Get notification summary
router.get('/summary', authenticate, async (req, res) => {
    try {
        const summary = notificationService.getNotificationSummary();
        
        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('Error getting notification summary:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy tóm tắt thông báo'
        });
    }
});

// Mark notification as read
router.post('/:id/read', authenticate, async (req, res) => {
    try {
        const notificationId = parseFloat(req.params.id);
        const success = notificationService.markAsRead(notificationId);
        
        if (success) {
            res.json({
                success: true,
                message: 'Đã đánh dấu thông báo là đã đọc'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông báo'
            });
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi đánh dấu thông báo'
        });
    }
});

// Mark all notifications as read
router.post('/read-all', authenticate, async (req, res) => {
    try {
        const count = notificationService.markAllAsRead();
        
        res.json({
            success: true,
            message: `Đã đánh dấu ${count} thông báo là đã đọc`,
            data: { count }
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi đánh dấu tất cả thông báo'
        });
    }
});

// Generate maintenance tasks from overdue notifications
router.post('/generate-tasks', authenticate, authorize('admin', 'manager'), async (req, res) => {
    try {
        const generatedCount = await notificationService.generateTasksFromNotifications();
        
        res.json({
            success: true,
            message: `Đã tạo ${generatedCount} công việc bảo trì từ thông báo`,
            data: { generatedCount }
        });
    } catch (error) {
        console.error('Error generating tasks from notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo công việc từ thông báo'
        });
    }
});

// Clear old notifications
router.delete('/cleanup', authenticate, authorize('admin'), async (req, res) => {
    try {
        const daysOld = parseInt(req.query.days) || 7;
        const deletedCount = notificationService.clearOldNotifications(daysOld);
        
        res.json({
            success: true,
            message: `Đã xóa ${deletedCount} thông báo cũ hơn ${daysOld} ngày`,
            data: { deletedCount }
        });
    } catch (error) {
        console.error('Error clearing old notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa thông báo cũ'
        });
    }
});

// Force check notifications
router.post('/check', authenticate, authorize('admin', 'manager'), async (req, res) => {
    try {
        await notificationService.checkMaintenanceNotifications();
        const summary = notificationService.getNotificationSummary();
        
        res.json({
            success: true,
            message: 'Đã kiểm tra và cập nhật thông báo',
            data: summary
        });
    } catch (error) {
        console.error('Error force checking notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi kiểm tra thông báo'
        });
    }
});

module.exports = router;