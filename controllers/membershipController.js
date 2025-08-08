// controllers/membershipController.js - Refactored with Services
const membershipService = require('../services/membershipService');
const asyncHandler = require('../middleware/asyncHandler');
const { ValidationError, NotFoundError, ConflictError } = require('../middleware/errorHandler');

const membershipController = {
    // GET /api/members/memberships/all - Get all memberships
    getAll: asyncHandler(async (req, res) => {
        const { isActive } = req.query;
        
        const memberships = await membershipService.getAllMemberships(isActive);

        res.json({
            success: true,
            data: memberships
        });
    }),

    // GET /api/members/memberships/:id - Get membership by ID
    getById: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const membership = await membershipService.getMembershipById(id);

        res.json({
            success: true,
            data: membership
        });
    }),

    // POST /api/members/memberships - Create new membership (Admin only)
    create: asyncHandler(async (req, res) => {
        const {
            name,
            description,
            duration,
            price,
            benefits,
            maxClasses,
            hasPersonalTrainer
        } = req.body;

        // Check if name already exists
        const nameExists = await membershipService.checkNameExists(name);
        if (nameExists) {
            throw new ConflictError('Tên gói membership đã tồn tại');
        }

        const membership = await membershipService.createMembership({
            name,
            description,
            duration,
            price,
            benefits,
            maxClasses,
            hasPersonalTrainer
        });

        res.status(201).json({
            success: true,
            message: 'Tạo gói membership thành công',
            data: membership
        });
    }),

    // PUT /api/members/memberships/:id - Update membership (Admin only)
    update: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updateData = req.body;

        // Check if name exists (exclude current membership)
        if (updateData.name) {
            const nameExists = await membershipService.checkNameExists(updateData.name, id);
            if (nameExists) {
                throw new ConflictError('Tên gói membership đã được sử dụng');
            }
        }

        const membership = await membershipService.updateMembership(id, updateData);

        res.json({
            success: true,
            message: 'Cập nhật gói membership thành công',
            data: membership
        });
    }),

    // DELETE /api/members/memberships/:id - Delete membership (Admin only)
    delete: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const result = await membershipService.deleteMembership(id);

        res.json({
            success: true,
            message: result.message
        });
    }),

    // GET /api/members/memberships/:id/statistics - Get membership statistics (Admin only)
    getStatistics: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const statistics = await membershipService.getMembershipStatistics(id);

        res.json({
            success: true,
            data: statistics
        });
    }),

    // GET /api/members/memberships/popular - Get popular memberships
    getPopular: asyncHandler(async (req, res) => {
        const { limit } = req.query;

        const popularMemberships = await membershipService.getPopularMemberships(limit);

        res.json({
            success: true,
            data: popularMemberships
        });
    }),

    // GET /api/members/memberships/revenue - Get revenue by membership
    getRevenue: asyncHandler(async (req, res) => {
        const { startDate, endDate } = req.query;

        const revenue = await membershipService.getRevenueByMembership(startDate, endDate);

        res.json({
            success: true,
            data: revenue
        });
    })
};

module.exports = membershipController;