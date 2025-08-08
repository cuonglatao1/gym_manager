// controllers/memberController.js - Refactored with Services
const memberService = require('../services/memberService');
const asyncHandler = require('../middleware/asyncHandler');
const { ValidationError, NotFoundError, ConflictError } = require('../middleware/errorHandler');

const memberController = {
    // POST /api/members/register
    register: asyncHandler(async (req, res) => {
        const {
            fullName,
            phone,
            email,
            dateOfBirth,
            gender,
            address,
            emergencyContact,
            emergencyPhone,
            membershipId,
            notes
        } = req.body;

        // Check if phone already exists
        const phoneExists = await memberService.checkPhoneExists(phone);
        if (phoneExists) {
            throw new ConflictError('Số điện thoại đã được đăng ký');
        }

        // Check if email exists (if provided)
        if (email) {
            const emailExists = await memberService.checkEmailExists(email);
            if (emailExists) {
                throw new ConflictError('Email đã được đăng ký');
            }
        }

        // Create member
        const member = await memberService.createMember({
            fullName,
            phone,
            email,
            dateOfBirth,
            gender,
            address,
            emergencyContact,
            emergencyPhone,
            membershipId,
            notes
        });

        res.status(201).json({
            success: true,
            message: 'Đăng ký hội viên thành công',
            data: member
        });
    }),

    // GET /api/members - Get all members with pagination
    getAll: asyncHandler(async (req, res) => {
        const {
            page,
            limit,
            search,
            status,
            membershipStatus
        } = req.query;

        const result = await memberService.getAllMembers({
            page,
            limit,
            search,
            status,
            membershipStatus
        });

        res.json({
            success: true,
            data: result
        });
    }),

    // GET /api/members/:id - Get member by ID
    getById: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const member = await memberService.getMemberById(id);
        if (!member) {
            throw new NotFoundError('Không tìm thấy hội viên');
        }

        res.json({
            success: true,
            data: member
        });
    }),

    // PUT /api/members/:id - Update member
    update: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updateData = req.body;

        // Check if phone exists (exclude current member)
        if (updateData.phone) {
            const phoneExists = await memberService.checkPhoneExists(updateData.phone, id);
            if (phoneExists) {
                throw new ConflictError('Số điện thoại đã được sử dụng');
            }
        }

        // Check if email exists (exclude current member)
        if (updateData.email) {
            const emailExists = await memberService.checkEmailExists(updateData.email, id);
            if (emailExists) {
                throw new ConflictError('Email đã được sử dụng');
            }
        }

        const updatedMember = await memberService.updateMember(id, updateData);

        res.json({
            success: true,
            message: 'Cập nhật thông tin hội viên thành công',
            data: updatedMember
        });
    }),

    // POST /api/members/:id/membership - Purchase membership
    purchaseMembership: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { membershipId, startDate } = req.body;

        const membershipHistory = await memberService.purchaseMembership(
            id, 
            membershipId, 
            startDate
        );

        res.status(201).json({
            success: true,
            message: 'Mua gói membership thành công',
            data: membershipHistory
        });
    }),

    // GET /api/members/:id/active-membership - Get active membership
    getActiveMembership: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const activeMembership = await memberService.getActiveMembership(id);
        
        res.json({
            success: true,
            data: activeMembership
        });
    }),

    // GET /api/members/statistics - Get member statistics (Admin only)
    getStatistics: asyncHandler(async (req, res) => {
        const statistics = await memberService.getMemberStatistics();

        res.json({
            success: true,
            data: statistics
        });
    })
};

module.exports = memberController;