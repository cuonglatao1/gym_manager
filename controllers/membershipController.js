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

        // Handle empty string fields
        if (updateData.maxClasses === '') {
            updateData.maxClasses = null;
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

        // Check for pending MEMBERSHIP invoices before allowing membership purchase
        const { Invoice } = require('../models');
        const pendingMembershipInvoices = await Invoice.findAll({
            where: {
                memberId: member.id,
                status: 'pending',
                description: {
                    [require('sequelize').Op.like]: '%Membership%'
                }
            }
        });
        
        console.log(`🔍 [MEMBERSHIP VALIDATION] Member ID: ${member.id} has ${pendingMembershipInvoices.length} pending membership invoices`);
        
        if (pendingMembershipInvoices.length > 0) {
            console.log(`❌ [MEMBERSHIP BLOCKED] Preventing membership purchase due to pending membership invoices`);
            return res.status(400).json({
                success: false,
                message: `Bạn cần thanh toán ${pendingMembershipInvoices.length} hóa đơn membership chưa thanh toán trước khi đổi gói membership.`,
                pendingInvoices: pendingMembershipInvoices.map(inv => ({
                    id: inv.id,
                    invoiceNumber: inv.invoiceNumber,
                    totalAmount: inv.totalAmount,
                    description: inv.description,
                    dueDate: inv.dueDate
                }))
            });
        }
        
        console.log(`✅ [MEMBERSHIP ALLOWED] No pending invoices, proceeding`);

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
            status: 'pending', // Changed from 'active' to 'pending'
            price: membership.price,
            paymentStatus: 'pending' // Add paymentStatus field
        });

        // Create invoice instead of auto-completed payment
        const invoiceService = require('../services/invoiceService');
        const invoice = await invoiceService.generateMembershipInvoice(member.id, {
            membershipId: membership.id,
            duration: membership.duration,
            price: membership.price,
            startDate: startDate
        });

        // Update membership history with invoice reference
        await membershipHistory.update({
            notes: `Invoice: ${invoice.invoiceNumber}`
        });

        res.status(201).json({
            success: true,
            message: invoice ? 
                'Đăng ký gói membership thành công! Vui lòng thanh toán hóa đơn.' : 
                'Đăng ký gói membership thành công!',
            data: {
                membershipHistory,
                invoice,
                membership: {
                    name: membership.name,
                    discountPercent: membership.classDiscountPercent,
                    validUntil: endDate
                }
            },
            redirectToPayment: !!invoice,
            invoiceId: invoice?.id
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