const equipmentService = require('../services/equipmentService');
const asyncHandler = require('../middleware/asyncHandler');
const { ValidationError, NotFoundError, ConflictError } = require('../middleware/errorHandler');

const equipmentController = {
    // POST /api/equipment
    create: asyncHandler(async (req, res) => {
        const {
            name,
            category,
            brand,
            model,
            serialNumber,
            purchaseDate,
            purchasePrice,
            warrantyEndDate,
            location,
            status,
            condition,
            specifications,
            maintenanceInterval,
            lastMaintenanceDate,
            notes
        } = req.body;

        // Validate required fields
        if (!name || !category) {
            throw new ValidationError('Name and category are required');
        }

        const equipmentData = {
            name,
            category,
            brand,
            model,
            serialNumber,
            purchaseDate,
            purchasePrice,
            warrantyEndDate,
            location,
            status: status || 'active',
            condition: condition || 'excellent',
            specifications,
            maintenanceInterval,
            lastMaintenanceDate,
            notes
        };

        const equipment = await equipmentService.createEquipment(equipmentData);

        res.status(201).json({
            success: true,
            message: 'Equipment created successfully',
            data: equipment
        });
    }),

    // GET /api/equipment
    getAll: asyncHandler(async (req, res) => {
        const {
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'DESC',
            category,
            status,
            condition,
            location,
            brand,
            search,
            maintenanceDue
        } = req.query;

        const filters = {};
        if (category) filters.category = category;
        if (status) filters.status = status;
        if (condition) filters.condition = condition;
        if (location) filters.location = location;
        if (brand) filters.brand = brand;
        if (search) filters.search = search;
        if (maintenanceDue === 'true') filters.maintenanceDue = true;

        const pagination = { page, limit, sortBy, sortOrder };

        const result = await equipmentService.getAllEquipment(filters, pagination);

        res.json({
            success: true,
            message: 'Equipment retrieved successfully',
            data: result.equipment,
            pagination: result.pagination
        });
    }),

    // GET /api/equipment/:id
    getById: asyncHandler(async (req, res) => {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            throw new ValidationError('Valid equipment ID is required');
        }

        const equipment = await equipmentService.getEquipmentById(parseInt(id));

        res.json({
            success: true,
            message: 'Equipment retrieved successfully',
            data: equipment
        });
    }),

    // PUT /api/equipment/:id
    update: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updateData = req.body;

        if (!id || isNaN(id)) {
            throw new ValidationError('Valid equipment ID is required');
        }

        const equipment = await equipmentService.updateEquipment(parseInt(id), updateData);

        res.json({
            success: true,
            message: 'Equipment updated successfully',
            data: equipment
        });
    }),

    // DELETE /api/equipment/:id
    delete: asyncHandler(async (req, res) => {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            throw new ValidationError('Valid equipment ID is required');
        }

        const result = await equipmentService.deleteEquipment(parseInt(id));

        res.json({
            success: true,
            message: result.message
        });
    }),

    // GET /api/equipment/stats
    getStats: asyncHandler(async (req, res) => {
        const stats = await equipmentService.getEquipmentStats();

        res.json({
            success: true,
            message: 'Equipment statistics retrieved successfully',
            data: stats
        });
    }),

    // GET /api/equipment/maintenance-due
    getMaintenanceDue: asyncHandler(async (req, res) => {
        const equipment = await equipmentService.getMaintenanceDueEquipment();

        res.json({
            success: true,
            message: 'Equipment requiring maintenance retrieved successfully',
            data: equipment
        });
    }),

    // POST /api/equipment/:id/use
    incrementUsage: asyncHandler(async (req, res) => {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            throw new ValidationError('Valid equipment ID is required');
        }

        const equipment = await equipmentService.incrementUsage(parseInt(id));

        res.json({
            success: true,
            message: 'Equipment usage incremented successfully',
            data: {
                id: equipment.id,
                name: equipment.name,
                usageCount: equipment.usageCount
            }
        });
    }),

    // GET /api/equipment/check-code/:code
    checkCode: asyncHandler(async (req, res) => {
        const { code } = req.params;

        if (!code) {
            throw new ValidationError('Equipment code is required');
        }

        const exists = await equipmentService.checkEquipmentCodeExists(code);

        res.json({
            success: true,
            data: { exists }
        });
    }),

    // GET /api/equipment/check-serial/:serial
    checkSerial: asyncHandler(async (req, res) => {
        const { serial } = req.params;

        if (!serial) {
            throw new ValidationError('Serial number is required');
        }

        const exists = await equipmentService.checkSerialNumberExists(serial);

        res.json({
            success: true,
            data: { exists }
        });
    })
};

module.exports = equipmentController;