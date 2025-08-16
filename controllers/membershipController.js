const { Membership, MembershipHistory, Member, User } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const { ValidationError, NotFoundError, ConflictError } = require('../middleware/errorHandler');

const membershipController = {
    // GET /api/memberships - Get all memberships
    getAllMemberships: asyncHandler(async (req, res) => {
        const { isActive } = req.query;
        
        const whereClause = {};
        if (isActive !== undefined) {
            whereClause.isActive = isActive === 'true';
        }

        const memberships = await Membership.findAll({
            where: whereClause,
            order: [['priority', 'DESC'], ['price', 'ASC']]
        });

        res.json({
            success: true,
            data: memberships
        });
    }),

    // GET /api/memberships/:id - Get membership by ID
    getMembershipById: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const membership = await Membership.findByPk(id);
        
        if (!membership) {
            throw new NotFoundError('Membership not found');
        }

        res.json({
            success: true,
            data: membership
        });
    }),

    // POST /api/memberships - Create new membership (Admin only)
    createMembership: asyncHandler(async (req, res) => {
        const {
            name,
            description,
            duration,
            price,
            classDiscountPercent,
            maxClasses,
            hasPersonalTrainer,
            freePersonalTrainerSessions,
            canAccessPremiumClasses,
            accessLevel,
            priority,
            features,
            benefits,
            color
        } = req.body;

        // Check if name already exists
        const existingMembership = await Membership.findOne({
            where: { name }
        });

        if (existingMembership) {
            throw new ConflictError('Membership name already exists');
        }

        const membership = await Membership.create({
            name,
            description,
            duration,
            price,
            classDiscountPercent: classDiscountPercent || 0,
            maxClasses,
            hasPersonalTrainer: hasPersonalTrainer || false,
            freePersonalTrainerSessions: freePersonalTrainerSessions || 0,
            canAccessPremiumClasses: canAccessPremiumClasses || false,
            accessLevel: accessLevel || 'basic',
            priority: priority || 0,
            features: features || [],
            benefits: benefits || [],
            color: color || '#3498db',
            isActive: true
        });

        res.status(201).json({
            success: true,
            message: 'Membership created successfully',
            data: membership
        });
    }),

    // PUT /api/memberships/:id - Update membership (Admin only)
    updateMembership: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updateData = req.body;

        const membership = await Membership.findByPk(id);
        
        if (!membership) {
            throw new NotFoundError('Membership not found');
        }

        // Check if name exists (exclude current)
        if (updateData.name && updateData.name !== membership.name) {
            const existingMembership = await Membership.findOne({
                where: { name: updateData.name }
            });

            if (existingMembership) {
                throw new ConflictError('Membership name already exists');
            }
        }

        await membership.update(updateData);

        res.json({
            success: true,
            message: 'Membership updated successfully',
            data: membership
        });
    }),

    // DELETE /api/memberships/:id - Delete/deactivate membership (Admin only)
    deleteMembership: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const membership = await Membership.findByPk(id);
        
        if (!membership) {
            throw new NotFoundError('Membership not found');
        }

        // Check if membership is in use
        const activeMemberships = await MembershipHistory.count({
            where: {
                membershipId: id,
                status: 'active'
            }
        });

        if (activeMemberships > 0) {
            // Just deactivate instead of delete
            await membership.update({ isActive: false });
            
            res.json({
                success: true,
                message: `Membership deactivated. ${activeMemberships} active subscriptions will continue until expiry.`
            });
        } else {
            // Safe to delete
            await membership.destroy();
            
            res.json({
                success: true,
                message: 'Membership deleted successfully'
            });
        }
    }),

    // POST /api/memberships/:id/purchase - Member purchases membership
    purchaseMembership: asyncHandler(async (req, res) => {
        const { id: membershipId } = req.params;
        const { paymentMethod = 'cash' } = req.body;
        const userId = req.user.userId || req.user.id;

        // Get member data
        const member = await Member.findOne({ where: { userId } });
        if (!member) {
            throw new NotFoundError('Member not found');
        }

        // Get membership
        const membership = await Membership.findByPk(membershipId);
        if (!membership || !membership.isActive) {
            throw new NotFoundError('Membership not found or inactive');
        }

        // Check if member already has active membership
        const activeMembership = await MembershipHistory.findOne({
            where: {
                memberId: member.id,
                status: 'active'
            }
        });

        if (activeMembership) {
            throw new ConflictError('Member already has an active membership');
        }

        // Create membership history
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + membership.duration);

        const membershipHistory = await MembershipHistory.create({
            memberId: member.id,
            membershipId: membership.id,
            startDate,
            endDate,
            status: 'active',
            price: membership.price
        });

        // Create payment record
        const { Payment } = require('../models');
        const payment = await Payment.create({
            memberId: member.id,
            amount: membership.price,
            paymentMethod,
            paymentType: 'membership',
            referenceId: membershipHistory.id,
            description: `Membership purchase: ${membership.name}`,
            paymentStatus: 'completed',
            paymentDate: new Date()
        });

        res.status(201).json({
            success: true,
            message: 'Membership purchased successfully',
            data: {
                membershipHistory,
                payment,
                membership: {
                    name: membership.name,
                    discountPercent: membership.classDiscountPercent,
                    validUntil: endDate
                }
            }
        });
    }),

    // GET /api/memberships/statistics - Get membership statistics (Admin only)
    getMembershipStatistics: asyncHandler(async (req, res) => {
        // Total memberships count
        const totalMemberships = await Membership.count();
        
        // Active memberships count
        const activeMemberships = await Membership.count({
            where: { isActive: true }
        });

        // Current subscribers by membership
        const subscriberStats = await MembershipHistory.findAll({
            attributes: [
                'membershipId',
                [MembershipHistory.sequelize.fn('COUNT', MembershipHistory.sequelize.col('id')), 'subscribers']
            ],
            where: { status: 'active' },
            include: [{
                model: Membership,
                as: 'membership',
                attributes: ['name', 'classDiscountPercent']
            }],
            group: ['membershipId', 'membership.id', 'membership.name', 'membership.class_discount_percent']
        });

        // Revenue by membership
        const { Payment } = require('../models');
        const revenueStats = await Payment.findAll({
            attributes: [
                'referenceId',
                [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'totalRevenue']
            ],
            where: { 
                paymentType: 'membership',
                paymentStatus: 'completed'
            },
            group: ['referenceId']
        });

        res.json({
            success: true,
            data: {
                totalMemberships,
                activeMemberships,
                subscriberStats,
                revenueStats
            }
        });
    })
};

module.exports = membershipController;