const express = require('express');
const router = express.Router();
const maintenanceScheduler = require('../services/maintenanceSchedulerService');
const { authenticate, authorize } = require('../middleware/auth');

// Protected routes - require authentication
router.use(authenticate);

// Admin only routes - Maintenance scheduler is admin-only functionality
router.use(authorize('admin'));

// Scheduler management routes
router.get('/dashboard', async (req, res) => {
    try {
        const dashboardData = await maintenanceScheduler.getMaintenanceDashboard();
        res.json({
            success: true,
            data: dashboardData
        });
    } catch (error) {
        console.error('Error getting maintenance dashboard:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
});

// Generate overdue maintenance tasks
router.post('/generate-overdue-tasks', async (req, res) => {
    try {
        const { assignedTo, maxTasks = 50 } = req.body;
        const tasks = await maintenanceScheduler.generateOverdueTasks(assignedTo, maxTasks);
        
        res.json({
            success: true,
            data: tasks,
            message: `Generated ${tasks.length} overdue maintenance tasks`
        });
    } catch (error) {
        console.error('Error generating overdue tasks:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
});

// Generate upcoming maintenance tasks
router.post('/generate-upcoming-tasks', async (req, res) => {
    try {
        const { days = 7, assignedTo } = req.body;
        const tasks = await maintenanceScheduler.generateUpcomingTasks(days, assignedTo);
        
        res.json({
            success: true,
            data: tasks,
            message: `Generated ${tasks.length} upcoming maintenance tasks`
        });
    } catch (error) {
        console.error('Error generating upcoming tasks:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
});

// Complete maintenance and update schedule
router.post('/complete-maintenance/:maintenanceId', async (req, res) => {
    try {
        const { maintenanceId } = req.params;
        const performedBy = req.user.userId;
        const workDetails = req.body;
        
        const result = await maintenanceScheduler.completeMaintenance(
            maintenanceId, 
            performedBy, 
            workDetails
        );
        
        res.json({
            success: true,
            data: result,
            message: 'Maintenance completed and schedule updated'
        });
    } catch (error) {
        console.error('Error completing maintenance:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
});

// Auto-assign maintenance tasks
router.post('/auto-assign-tasks', async (req, res) => {
    try {
        const { taskIds } = req.body;
        const assignments = await maintenanceScheduler.autoAssignTasks(taskIds);
        
        res.json({
            success: true,
            data: assignments,
            message: `Auto-assigned ${assignments.length} maintenance tasks`
        });
    } catch (error) {
        console.error('Error auto-assigning tasks:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
});

// Update equipment priority and regenerate schedules
router.post('/equipment/:equipmentId/update-priority', async (req, res) => {
    try {
        const { equipmentId } = req.params;
        const { priority } = req.body;
        
        if (!['high', 'medium', 'low'].includes(priority)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid priority. Must be high, medium, or low'
            });
        }
        
        const newSchedules = await maintenanceScheduler.updateSchedulesForPriorityChange(
            equipmentId, 
            priority
        );
        
        res.json({
            success: true,
            data: newSchedules,
            message: `Updated equipment priority and regenerated ${newSchedules.length} schedules`
        });
    } catch (error) {
        console.error('Error updating equipment priority:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
});

// Run full maintenance scheduler (for cron jobs)
router.post('/run-scheduler', async (req, res) => {
    try {
        const { 
            generateOverdue = true, 
            generateUpcoming = true, 
            autoAssign = true,
            upcomingDays = 3
        } = req.body;
        
        const results = {};
        
        if (generateOverdue) {
            results.overdueTasks = await maintenanceScheduler.generateOverdueTasks();
        }
        
        if (generateUpcoming) {
            results.upcomingTasks = await maintenanceScheduler.generateUpcomingTasks(upcomingDays);
        }
        
        if (autoAssign) {
            const allTaskIds = [
                ...(results.overdueTasks || []).map(t => t.id),
                ...(results.upcomingTasks || []).map(t => t.id)
            ];
            
            if (allTaskIds.length > 0) {
                results.assignments = await maintenanceScheduler.autoAssignTasks(allTaskIds);
            }
        }
        
        const totalTasks = (results.overdueTasks?.length || 0) + (results.upcomingTasks?.length || 0);
        
        res.json({
            success: true,
            data: results,
            message: `Scheduler run completed. Generated ${totalTasks} tasks, assigned ${results.assignments?.length || 0}`
        });
    } catch (error) {
        console.error('Error running scheduler:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
});

// Get scheduler statistics
router.get('/stats', async (req, res) => {
    try {
        const dashboard = await maintenanceScheduler.getMaintenanceDashboard();
        
        res.json({
            success: true,
            data: {
                summary: dashboard.summary,
                equipmentByPriority: dashboard.equipmentByPriority,
                totalEquipment: Object.values(dashboard.equipmentByPriority).reduce((a, b) => a + b, 0)
            }
        });
    } catch (error) {
        console.error('Error getting scheduler stats:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
});

module.exports = router;