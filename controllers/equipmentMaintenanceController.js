const equipmentMaintenanceService = require('../services/equipmentMaintenanceService');
const asyncHandler = require('../middleware/asyncHandler');
const { ValidationError, NotFoundError, ConflictError } = require('../middleware/errorHandler');

const equipmentMaintenanceController = {
    // POST /api/equipment-maintenance
    create: asyncHandler(async (req, res) => {
        const {
            equipmentId,
            maintenanceType,
            priority,
            scheduledDate,
            assignedTo,
            reportedBy,
            title,
            description,
            issueDetails,
            estimatedDuration,
            isRecurring,
            recurringInterval,
            notes
        } = req.body;

        // Validate required fields
        if (!equipmentId || !title || !scheduledDate) {
            throw new ValidationError('Equipment ID, title, and scheduled date are required');
        }

        const maintenanceData = {
            equipmentId: parseInt(equipmentId),
            maintenanceType: maintenanceType || 'routine',
            priority: priority || 'medium',
            scheduledDate,
            assignedTo: assignedTo ? parseInt(assignedTo) : null,
            reportedBy: reportedBy ? parseInt(reportedBy) : null,
            title,
            description,
            issueDetails,
            estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : null,
            isRecurring: isRecurring || false,
            recurringInterval: recurringInterval ? parseInt(recurringInterval) : null,
            notes
        };

        const maintenance = await equipmentMaintenanceService.createMaintenance(maintenanceData);

        res.status(201).json({
            success: true,
            message: 'Maintenance record created successfully',
            data: maintenance
        });
    }),

    // GET /api/equipment-maintenance
    getAll: asyncHandler(async (req, res) => {
        const {
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'DESC',
            equipmentId,
            maintenanceType,
            status,
            priority,
            assignedTo,
            reportedBy,
            dateFrom,
            dateTo,
            overdue,
            search
        } = req.query;

        const filters = {};
        if (equipmentId) filters.equipmentId = parseInt(equipmentId);
        if (maintenanceType) filters.maintenanceType = maintenanceType;
        if (status) filters.status = status;
        if (priority) filters.priority = priority;
        if (assignedTo) filters.assignedTo = parseInt(assignedTo);
        if (reportedBy) filters.reportedBy = parseInt(reportedBy);
        if (dateFrom) filters.dateFrom = dateFrom;
        if (dateTo) filters.dateTo = dateTo;
        if (overdue === 'true') filters.overdue = true;
        if (search) filters.search = search;

        const pagination = { page, limit, sortBy, sortOrder };

        const result = await equipmentMaintenanceService.getAllMaintenance(filters, pagination);

        res.json({
            success: true,
            message: 'Maintenance records retrieved successfully',
            data: result.maintenance,
            pagination: result.pagination
        });
    }),

    // GET /api/equipment-maintenance/:id
    getById: asyncHandler(async (req, res) => {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            throw new ValidationError('Valid maintenance ID is required');
        }

        const maintenance = await equipmentMaintenanceService.getMaintenanceById(parseInt(id));

        res.json({
            success: true,
            message: 'Maintenance record retrieved successfully',
            data: maintenance
        });
    }),

    // PUT /api/equipment-maintenance/:id
    update: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updateData = req.body;

        if (!id || isNaN(id)) {
            throw new ValidationError('Valid maintenance ID is required');
        }

        // Convert numeric fields
        if (updateData.equipmentId) updateData.equipmentId = parseInt(updateData.equipmentId);
        if (updateData.assignedTo) updateData.assignedTo = parseInt(updateData.assignedTo);
        if (updateData.reportedBy) updateData.reportedBy = parseInt(updateData.reportedBy);
        if (updateData.estimatedDuration) updateData.estimatedDuration = parseInt(updateData.estimatedDuration);
        if (updateData.actualDuration) updateData.actualDuration = parseInt(updateData.actualDuration);
        if (updateData.recurringInterval) updateData.recurringInterval = parseInt(updateData.recurringInterval);

        const maintenance = await equipmentMaintenanceService.updateMaintenance(parseInt(id), updateData);

        res.json({
            success: true,
            message: 'Maintenance record updated successfully',
            data: maintenance
        });
    }),

    // DELETE /api/equipment-maintenance/:id
    delete: asyncHandler(async (req, res) => {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            throw new ValidationError('Valid maintenance ID is required');
        }

        const result = await equipmentMaintenanceService.deleteMaintenance(parseInt(id));

        res.json({
            success: true,
            message: result.message
        });
    }),

    // POST /api/equipment-maintenance/:id/complete
    complete: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { workPerformed, cost, actualDuration } = req.body;

        if (!id || isNaN(id)) {
            throw new ValidationError('Valid maintenance ID is required');
        }

        const completionData = {
            workPerformed,
            cost: cost ? parseFloat(cost) : null,
            actualDuration: actualDuration ? parseInt(actualDuration) : null
        };

        const maintenance = await equipmentMaintenanceService.completeMaintenance(parseInt(id), completionData);

        res.json({
            success: true,
            message: 'Maintenance marked as completed successfully',
            data: maintenance
        });
    }),

    // POST /api/equipment-maintenance/:id/start
    start: asyncHandler(async (req, res) => {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            throw new ValidationError('Valid maintenance ID is required');
        }

        const maintenance = await equipmentMaintenanceService.startMaintenance(parseInt(id));

        res.json({
            success: true,
            message: 'Maintenance started successfully',
            data: maintenance
        });
    }),

    // POST /api/equipment-maintenance/:id/cancel
    cancel: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { reason } = req.body;

        if (!id || isNaN(id)) {
            throw new ValidationError('Valid maintenance ID is required');
        }

        const maintenance = await equipmentMaintenanceService.cancelMaintenance(parseInt(id), reason);

        res.json({
            success: true,
            message: 'Maintenance cancelled successfully',
            data: maintenance
        });
    }),

    // GET /api/equipment-maintenance/overdue
    getOverdue: asyncHandler(async (req, res) => {
        const maintenance = await equipmentMaintenanceService.getOverdueMaintenance();

        res.json({
            success: true,
            message: 'Overdue maintenance retrieved successfully',
            data: maintenance
        });
    }),

    // GET /api/equipment-maintenance/upcoming
    getUpcoming: asyncHandler(async (req, res) => {
        const { days = 7 } = req.query;

        const maintenance = await equipmentMaintenanceService.getUpcomingMaintenance(parseInt(days));

        res.json({
            success: true,
            message: 'Upcoming maintenance retrieved successfully',
            data: maintenance
        });
    }),

    // GET /api/equipment-maintenance/stats
    getStats: asyncHandler(async (req, res) => {
        const stats = await equipmentMaintenanceService.getMaintenanceStats();

        res.json({
            success: true,
            message: 'Maintenance statistics retrieved successfully',
            data: stats
        });
    }),

    // POST /api/equipment-maintenance/recurring
    createRecurring: asyncHandler(async (req, res) => {
        const {
            equipmentId,
            maintenanceType,
            priority,
            scheduledDate,
            assignedTo,
            title,
            description,
            estimatedDuration,
            recurringInterval
        } = req.body;

        if (!equipmentId || !title || !scheduledDate || !recurringInterval) {
            throw new ValidationError('Equipment ID, title, scheduled date, and recurring interval are required');
        }

        const maintenanceData = {
            maintenanceType: maintenanceType || 'routine',
            priority: priority || 'medium',
            scheduledDate,
            assignedTo: assignedTo ? parseInt(assignedTo) : null,
            title,
            description,
            estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : null,
            recurringInterval: parseInt(recurringInterval)
        };

        const maintenance = await equipmentMaintenanceService.createRecurringMaintenance(parseInt(equipmentId), maintenanceData);

        res.status(201).json({
            success: true,
            message: 'Recurring maintenance created successfully',
            data: maintenance
        });
    }),

    // POST /api/equipment-maintenance/:id/generate-next
    generateNext: asyncHandler(async (req, res) => {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            throw new ValidationError('Valid maintenance ID is required');
        }

        const maintenance = await equipmentMaintenanceService.generateNextRecurringMaintenance(parseInt(id));

        res.status(201).json({
            success: true,
            message: 'Next recurring maintenance generated successfully',
            data: maintenance
        });
    })
};

module.exports = equipmentMaintenanceController;