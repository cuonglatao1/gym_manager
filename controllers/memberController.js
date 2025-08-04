// controllers/memberController.js
const { Member, Membership, MembershipHistory, User } = require('../models');
const { Op } = require('sequelize');

const memberController = {
    // POST /api/members/register - Đăng ký hội viên mới
   // Thay thế toàn bộ hàm register trong controllers/memberController.js
register: async (req, res) => {
    try {
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

        // Validate required fields
        if (!fullName || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Họ tên và số điện thoại là bắt buộc'
            });
        }

        // Check if phone already exists
        const existingMember = await Member.findOne({ 
            where: { phone } 
        });
        
        if (existingMember) {
            return res.status(400).json({
                success: false,
                message: 'Số điện thoại đã được đăng ký'
            });
        }

        // Check if email exists (if provided)
        if (email) {
            const existingEmail = await Member.findOne({ 
                where: { email } 
            });
            
            if (existingEmail) {
                return res.status(400).json({
                    success: false,
                    message: 'Email đã được đăng ký'
                });
            }
        }

        // Generate member code
        const generateMemberCode = () => {
            const date = new Date();
            const year = date.getFullYear().toString().slice(-2);
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
            return `GM${year}${month}${random}`;
        };

        // Create new member
        const member = await Member.create({
            memberCode: generateMemberCode(),
            fullName,
            phone,
            email,
            dateOfBirth,
            gender,
            address,
            emergencyContact,
            emergencyPhone,
            notes
        });

        // If membershipId provided, create membership history
        if (membershipId) {
            const membership = await Membership.findByPk(membershipId);
            if (!membership) {
                return res.status(400).json({
                    success: false,
                    message: 'Gói membership không tồn tại'
                });
            }

            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(startDate.getDate() + membership.duration);

            await MembershipHistory.create({
                memberId: member.id,
                membershipId: membership.id,
                startDate,
                endDate,
                price: membership.price
            });
        }

        // Get member with membership info
        const memberWithMembership = await Member.findByPk(member.id, {
            include: [{
                model: MembershipHistory,
                as: 'membershipHistory',
                include: [{
                    model: Membership,
                    as: 'membership'
                }],
                where: { status: 'active' },
                required: false
            }]
        });

        res.status(201).json({
            success: true,
            message: 'Đăng ký hội viên thành công',
            data: memberWithMembership
        });

    } catch (error) {
        console.error('Register member error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đăng ký hội viên',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
},

    // GET /api/members - Xem danh sách hội viên với phân trang
    getAll: async (req, res) => {
        try {
            const {
                page = 1,
                limit = 10,
                search = '',
                status = 'all', // all, active, inactive
                membershipStatus = 'all' // all, active, expired
            } = req.query;

            const offset = (parseInt(page) - 1) * parseInt(limit);
            
            // Build where condition
            const whereCondition = {};
            
            if (search) {
                whereCondition[Op.or] = [
                    { fullName: { [Op.iLike]: `%${search}%` } },
                    { phone: { [Op.iLike]: `%${search}%` } },
                    { email: { [Op.iLike]: `%${search}%` } },
                    { memberCode: { [Op.iLike]: `%${search}%` } }
                ];
            }

            if (status !== 'all') {
                whereCondition.isActive = status === 'active';
            }

            // Include condition for membership history
            const membershipInclude = {
                model: MembershipHistory,
                as: 'membershipHistory',
                include: [{
                    model: Membership,
                    as: 'membership'
                }],
                required: false,
                order: [['endDate', 'DESC']],
                limit: 1
            };

            if (membershipStatus === 'active') {
                membershipInclude.where = {
                    status: 'active',
                    endDate: { [Op.gte]: new Date() }
                };
            } else if (membershipStatus === 'expired') {
                membershipInclude.where = {
                    [Op.or]: [
                        { status: 'expired' },
                        { 
                            status: 'active',
                            endDate: { [Op.lt]: new Date() }
                        }
                    ]
                };
            }

            const { count, rows } = await Member.findAndCountAll({
                where: whereCondition,
                include: [membershipInclude],
                limit: parseInt(limit),
                offset: offset,
                order: [['createdAt', 'DESC']],
                distinct: true
            });

            res.json({
                success: true,
                data: {
                    members: rows,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(count / parseInt(limit)),
                        totalItems: count,
                        itemsPerPage: parseInt(limit)
                    }
                }
            });

        } catch (error) {
            console.error('Get members error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy danh sách hội viên',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    // GET /api/members/:id - Xem chi tiết hội viên
    getById: async (req, res) => {
        try {
            const { id } = req.params;

            const member = await Member.findByPk(id, {
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'username', 'email', 'role']
                    },
                    {
                        model: MembershipHistory,
                        as: 'membershipHistory',
                        include: [{
                            model: Membership,
                            as: 'membership'
                        }],
                        order: [['createdAt', 'DESC']]
                    }
                ]
            });

            if (!member) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy hội viên'
                });
            }

            res.json({
                success: true,
                data: member
            });

        } catch (error) {
            console.error('Get member by id error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy thông tin hội viên',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    // PUT /api/members/:id - Cập nhật thông tin hội viên
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                fullName,
                phone,
                email,
                dateOfBirth,
                gender,
                address,
                emergencyContact,
                emergencyPhone,
                isActive,
                notes
            } = req.body;

            const member = await Member.findByPk(id);
            if (!member) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy hội viên'
                });
            }

            // Check if phone exists (exclude current member)
            if (phone && phone !== member.phone) {
                const existingPhone = await Member.findOne({
                    where: { 
                        phone,
                        id: { [Op.ne]: id }
                    }
                });
                
                if (existingPhone) {
                    return res.status(400).json({
                        success: false,
                        message: 'Số điện thoại đã được sử dụng'
                    });
                }
            }

            // Check if email exists (exclude current member)
            if (email && email !== member.email) {
                const existingEmail = await Member.findOne({
                    where: { 
                        email,
                        id: { [Op.ne]: id }
                    }
                });
                
                if (existingEmail) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email đã được sử dụng'
                    });
                }
            }

            // Update member
            await member.update({
                fullName: fullName || member.fullName,
                phone: phone || member.phone,
                email: email || member.email,
                dateOfBirth: dateOfBirth || member.dateOfBirth,
                gender: gender || member.gender,
                address: address || member.address,
                emergencyContact: emergencyContact || member.emergencyContact,
                emergencyPhone: emergencyPhone || member.emergencyPhone,
                isActive: isActive !== undefined ? isActive : member.isActive,
                notes: notes || member.notes
            });

            // Get updated member with associations
            const updatedMember = await Member.findByPk(id, {
                include: [{
                    model: MembershipHistory,
                    as: 'membershipHistory',
                    include: [{
                        model: Membership,
                        as: 'membership'
                    }],
                    order: [['createdAt', 'DESC']],
                    limit: 1
                }]
            });

            res.json({
                success: true,
                message: 'Cập nhật thông tin hội viên thành công',
                data: updatedMember
            });

        } catch (error) {
            console.error('Update member error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi cập nhật hội viên',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    // POST /api/members/:id/membership - Gia hạn/mua gói membership
    purchaseMembership: async (req, res) => {
        try {
            const { id } = req.params;
            const { membershipId, startDate } = req.body;

            const member = await Member.findByPk(id);
            if (!member) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy hội viên'
                });
            }

            const membership = await Membership.findByPk(membershipId);
            if (!membership) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy gói membership'
                });
            }

            // Calculate dates
            const start = startDate ? new Date(startDate) : new Date();
            const endDate = new Date(start);
            endDate.setDate(start.getDate() + membership.duration);

            // Create membership history
            const membershipHistory = await MembershipHistory.create({
                memberId: member.id,
                membershipId: membership.id,
                startDate: start,
                endDate: endDate,
                price: membership.price
            });

            // Get membership history with membership details
            const membershipWithDetails = await MembershipHistory.findByPk(membershipHistory.id, {
                include: [{
                    model: Membership,
                    as: 'membership'
                }]
            });

            res.status(201).json({
                success: true,
                message: 'Mua gói membership thành công',
                data: membershipWithDetails
            });

        } catch (error) {
            console.error('Purchase membership error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi mua gói membership',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
};

module.exports = memberController;