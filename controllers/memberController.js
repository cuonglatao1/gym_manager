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

    // GET /api/members/trainers - Get all trainers (public endpoint for dropdowns)
    getTrainers: asyncHandler(async (req, res) => {
        const trainers = await memberService.getTrainers();
        
        res.json({
            success: true,
            data: trainers
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

    // POST /api/members/my/membership - Member tự mua gói membership
    purchaseMyMembership: asyncHandler(async (req, res) => {
        const { membershipId, startDate } = req.body;
        
        // Get member ID from authenticated user using Member model directly
        const { Member } = require('../models');
        const member = await Member.findOne({
            where: { userId: req.user.userId }
        });
        
        if (!member) {
            throw new NotFoundError('Không tìm thấy thông tin member');
        }

        const membershipHistory = await memberService.purchaseMembership(
            member.id, 
            membershipId, 
            startDate || new Date().toISOString().split('T')[0]
        );

        res.status(201).json({
            success: true,
            message: 'Đăng ký gói membership thành công! Vui lòng thanh toán tại quầy để kích hoạt.',
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

    // GET /api/members/search?q=keyword&field=name,email,phone
    searchMembers: asyncHandler(async (req, res) => {
        console.log('=== SEARCH REQUEST START ===');
        console.log('Full URL:', req.originalUrl);
        console.log('Query params:', req.query);
        console.log('Headers:', req.headers);
        
        try {
            const { q, field = 'name,email,phone', page = 1, limit = 10 } = req.query;
            
            console.log('Parsed params:', { q, field, page, limit });
            
            if (!q || typeof q !== 'string' || q.trim().length === 0) {
                console.log('Validation failed: empty query');
                return res.status(400).json({
                    success: false,
                    message: 'Từ khóa tìm kiếm không được để trống',
                    error: 'EMPTY_QUERY'
                });
            }

            if (q.trim().length < 2) {
                console.log('Validation failed: query too short');
                return res.status(400).json({
                    success: false,
                    message: 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự',
                    error: 'QUERY_TOO_SHORT'
                });
            }

            console.log('Starting member search...');
            
            // Simple search first - get all members and filter
            const { Member, MembershipHistory, Membership } = require('../models');
            const { Op } = require('sequelize');
            
            const cleanQuery = q.trim();
            const searchConditions = [
                { fullName: { [Op.iLike]: `%${cleanQuery}%` } },
                { email: { [Op.iLike]: `%${cleanQuery}%` } },
                { phone: { [Op.like]: `%${cleanQuery}%` } }
            ];

            const members = await Member.findAll({
                where: { [Op.or]: searchConditions },
                attributes: ['id', 'memberCode', 'fullName', 'email', 'phone', 'isActive', 'createdAt'],
                limit: 20,
                order: [['createdAt', 'DESC']]
            });

            console.log('Found members:', members.length);

            res.json({
                success: true,
                data: members,
                pagination: {
                    total: members.length,
                    page: 1,
                    limit: 20,
                    totalPages: 1,
                    hasNext: false,
                    hasPrev: false
                },
                message: `Tìm thấy ${members.length} kết quả cho "${cleanQuery}"`
            });
            
        } catch (error) {
            console.error('Search controller error:', error);
            console.error('Error stack:', error.stack);
            
            res.status(500).json({
                success: false,
                message: error.message || 'Lỗi tìm kiếm member',
                error: error.toString()
            });
        }
        
        console.log('=== SEARCH REQUEST END ===');
    }),

    // GET /api/members/statistics - Get member statistics (Admin only)
    getStatistics: asyncHandler(async (req, res) => {
        const statistics = await memberService.getMemberStatistics();

        res.json({
            success: true,
            data: statistics
        });
    }),

    deleteMember: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const result = await memberService.deleteMember(id);

        res.json({
            success: true,
            message: result.message
        });
    }),

    cancelMembership: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const result = await memberService.cancelCurrentMembership(id);

        res.json({
            success: true,
            message: result.message,
            data: result.membership
        });
    })
};

module.exports = memberController;