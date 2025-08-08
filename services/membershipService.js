// services/membershipService.js
const { Membership, MembershipHistory, Member } = require('../models');
const { Op } = require('sequelize');

class MembershipService {
    // Get all memberships
    async getAllMemberships(isActive = 'all') {
        const whereCondition = {};
        if (isActive !== 'all') {
            whereCondition.isActive = isActive === 'true';
        }

        return Membership.findAll({
            where: whereCondition,
            order: [['price', 'ASC']]
        });
    }

    // Get membership by ID
    async getMembershipById(id) {
        const membership = await Membership.findByPk(id);
        if (!membership) {
            throw new Error('Không tìm thấy gói membership');
        }
        return membership;
    }

    // Check if membership name exists
    async checkNameExists(name, excludeId = null) {
        const whereCondition = { name };
        if (excludeId) {
            whereCondition.id = { [Op.ne]: excludeId };
        }
        
        const existing = await Membership.findOne({ where: whereCondition });
        return !!existing;
    }

    // Create new membership
    async createMembership(membershipData) {
        const {
            name,
            description,
            duration,
            price,
            benefits,
            maxClasses,
            hasPersonalTrainer
        } = membershipData;

        return Membership.create({
            name,
            description,
            duration,
            price,
            benefits: Array.isArray(benefits) ? benefits : [],
            maxClasses,
            hasPersonalTrainer: hasPersonalTrainer || false
        });
    }

    // Update membership
    async updateMembership(id, updateData) {
        const membership = await Membership.findByPk(id);
        if (!membership) {
            throw new Error('Không tìm thấy gói membership');
        }

        const {
            name,
            description,
            duration,
            price,
            benefits,
            maxClasses,
            hasPersonalTrainer,
            isActive
        } = updateData;

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

        return membership;
    }

    // Delete or deactivate membership
    async deleteMembership(id) {
        const membership = await Membership.findByPk(id);
        if (!membership) {
            throw new Error('Không tìm thấy gói membership');
        }

        // Check if membership is being used
        const membershipHistoryCount = await MembershipHistory.count({
            where: { membershipId: id }
        });

        if (membershipHistoryCount > 0) {
            // Don't delete, just deactivate
            await membership.update({ isActive: false });
            return {
                deleted: false,
                message: 'Đã vô hiệu hóa gói membership (không thể xóa vì đã có người sử dụng)'
            };
        }

        await membership.destroy();
        return {
            deleted: true,
            message: 'Xóa gói membership thành công'
        };
    }

    // Get membership statistics
    async getMembershipStatistics(id) {
        const membership = await this.getMembershipById(id);

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
                model: Member,
                as: 'member',
                attributes: ['id', 'memberCode', 'fullName', 'phone']
            }],
            order: [['createdAt', 'DESC']],
            limit: 5
        });

        return {
            membership,
            statistics: {
                totalPurchases,
                activePurchases,
                expiredPurchases: totalPurchases - activePurchases,
                totalRevenue: totalRevenue || 0
            },
            recentPurchases
        };
    }

    // Get popular memberships
    async getPopularMemberships(limit = 5) {
        const memberships = await Membership.findAll({
            attributes: [
                'id',
                'name',
                'price',
                'duration',
                [
                    require('sequelize').fn('COUNT', require('sequelize').col('membershipHistory.id')),
                    'purchaseCount'
                ]
            ],
            include: [{
                model: MembershipHistory,
                as: 'membershipHistory',
                attributes: [],
                required: false
            }],
            group: ['Membership.id'],
            order: [[require('sequelize').fn('COUNT', require('sequelize').col('membershipHistory.id')), 'DESC']],
            limit: parseInt(limit)
        });

        return memberships;
    }

    // Get revenue by membership
    async getRevenueByMembership(startDate = null, endDate = null) {
        const whereCondition = {
            paymentStatus: 'paid'
        };

        if (startDate && endDate) {
            whereCondition.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        const revenue = await MembershipHistory.findAll({
            attributes: [
                [require('sequelize').fn('SUM', require('sequelize').col('price')), 'totalRevenue'],
                [require('sequelize').fn('COUNT', require('sequelize').col('MembershipHistory.id')), 'totalSales']
            ],
            include: [{
                model: Membership,
                as: 'membership',
                attributes: ['id', 'name']
            }],
            where: whereCondition,
            group: ['membership.id', 'membership.name'],
            order: [[require('sequelize').fn('SUM', require('sequelize').col('price')), 'DESC']]
        });

        return revenue;
    }
}

module.exports = new MembershipService();