// controllers/membershipController.js
const { Membership, MembershipHistory } = require('../models');
const { Op } = require('sequelize');

const membershipController = {
    // GET /api/memberships - Lấy danh sách gói membership
    getAll: async (req, res) => {
        try {
            const { isActive = 'all' } = req.query;
            
            const whereCondition = {};
            if (isActive !== 'all') {
                whereCondition.isActive = isActive === 'true';
            }

            const memberships = await Membership.findAll({
                where: whereCondition,
                order: [['price', 'ASC']]
            });

            res.json({
                success: true,
                data: memberships
            });

        } catch (error) {
            console.error('Get memberships error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy danh sách gói membership',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    // GET /api/memberships/:id - Lấy chi tiết gói membership
    getById: async (req, res) => {
        try {
            const { id } = req.params;

            const membership = await Membership.findByPk(id);

            if (!membership) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy gói membership'
                });
            }

            res.json({
                success: true,
                data: membership
            });

        } catch (error) {
            console.error('Get membership by id error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy thông tin gói membership',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    // POST /api/memberships - Tạo gói membership mới (Admin only)
    create: async (req, res) => {
        try {
            const {
                name,
                description,
                duration,
                price,
                benefits,
                maxClasses,
                hasPersonalTrainer
            } = req.body;

            // Validate required fields
            if (!name || !duration || !price) {
                return res.status(400).json({
                    success: false,
                    message: 'Tên gói, thời hạn và giá là bắt buộc'
                });
            }

            // Check if name already exists
            const existingMembership = await Membership.findOne({
                where: { name }
            });

            if (existingMembership) {
                return res.status(400).json({
                    success: false,
                    message: 'Tên gói membership đã tồn tại'
                });
            }

            const membership = await Membership.create({
                name,
                description,
                duration,
                price,
                benefits: Array.isArray(benefits) ? benefits : [],
                maxClasses,
                hasPersonalTrainer: hasPersonalTrainer || false
            });

            res.status(201).json({
                success: true,
                message: 'Tạo gói membership thành công',
                data: membership
            });

        } catch (error) {
            console.error('Create membership error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi tạo gói membership',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    // PUT /api/memberships/:id - Cập nhật gói membership (Admin only)
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                name,
                description,
                duration,
                price,
                benefits,
                maxClasses,
                hasPersonalTrainer,
                isActive
            } = req.body;

            const membership = await Membership.findByPk(id);
            if (!membership) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy gói membership'
                });
            }

            // Check if name exists (exclude current membership)
            if (name && name !== membership.name) {
                const existingName = await Membership.findOne({
                    where: { 
                        name,
                        id: { [Op.ne]: id }
                    }
                });
                
                if (existingName) {
                    return res.status(400).json({
                        success: false,
                        message: 'Tên gói membership đã được sử dụng'
                    });
                }
            }

            // Update membership
            await membership.update({
                name: name || membership.name,
                description: description || membership.description,
                duration: duration || membership.duration,
                price: price || membership.price,
                benefits: benefits !== undefined ? (Array.isArray(benefits) ? benefits : []) : membership.benefits,
                maxClasses: maxClasses !== undefined ? maxClasses : membership.maxClasses,
                hasPersonalTrainer: hasPersonalTrainer !== undefined ? hasPersonalTrainer : membership.hasPersonalTrainer,
                isActive: isActive !== undefined ? isActive : membership.isActive
            });

            res.json({
                success: true,
                message: 'Cập nhật gói membership thành công',
                data: membership
            });

        } catch (error) {
            console.error('Update membership error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi cập nhật gói membership',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    // DELETE /api/memberships/:id - Xóa gói membership (Admin only)
    delete: async (req, res) => {
        try {
            const { id } = req.params;

            const membership = await Membership.findByPk(id);
            if (!membership) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy gói membership'
                });
            }

            // Check if membership is being used
            const membershipHistoryCount = await MembershipHistory.count({
                where: { membershipId: id }
            });

            if (membershipHistoryCount > 0) {
                // Don't delete, just deactivate
                await membership.update({ isActive: false });
                return res.json({
                    success: true,
                    message: 'Đã vô hiệu hóa gói membership (không thể xóa vì đã có người sử dụng)'
                });
            }

            await membership.destroy();

            res.json({
                success: true,
                message: 'Xóa gói membership thành công'
            });

        } catch (error) {
            console.error('Delete membership error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi xóa gói membership',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    // GET /api/memberships/:id/statistics - Thống kê gói membership
    getStatistics: async (req, res) => {
        try {
            const { id } = req.params;

            const membership = await Membership.findByPk(id);
            if (!membership) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy gói membership'
                });
            }

            // Get statistics
            const totalPurchases = await MembershipHistory.count({
                where: { membershipId: id }
            });

            const activePurchases = await MembershipHistory.count({
                where: { 
                    membershipId: id,
                    status: 'active',
                    endDate: { [Op.gte]: new Date() }
                }
            });

            const totalRevenue = await MembershipHistory.sum('price', {
                where: { 
                    membershipId: id,
                    paymentStatus: 'paid'
                }
            });

            const recentPurchases = await MembershipHistory.findAll({
                where: { membershipId: id },
                include: [{
                    model: require('../models').Member,
                    as: 'member',
                    attributes: ['id', 'memberCode', 'fullName', 'phone']
                }],
                order: [['createdAt', 'DESC']],
                limit: 5
            });

            res.json({
                success: true,
                data: {
                    membership,
                    statistics: {
                        totalPurchases,
                        activePurchases,
                        expiredPurchases: totalPurchases - activePurchases,
                        totalRevenue: totalRevenue || 0
                    },
                    recentPurchases
                }
            });

        } catch (error) {
            console.error('Get membership statistics error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy thống kê gói membership',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
};

module.exports = membershipController;