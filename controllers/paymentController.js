const paymentService = require('../services/paymentService');
const asyncHandler = require('../middleware/asyncHandler');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');
const { Payment, Member, Invoice, User } = require('../models');

const paymentController = {
    // POST /api/payments
    createPayment: asyncHandler(async (req, res) => {
        const {
            memberId,
            amount,
            paymentMethod,
            paymentType,
            description,
            referenceId,
            dueDate,
            notes
        } = req.body;

        // Validation
        if (!memberId || !amount || !paymentMethod || !paymentType) {
            throw new ValidationError('Member ID, amount, payment method, and payment type are required');
        }

        let targetMemberId = memberId;

        // If user is a member, only allow creating payments for themselves
        if (req.user?.role === 'member') {
            // First try to get from req.user.member.id
            if (req.user.member?.id) {
                targetMemberId = req.user.member.id;
            } else {
                // Fallback: find member by userId or email
                const { Member } = require('../models');
                const member = await Member.findOne({ 
                    where: { 
                        [require('sequelize').Op.or]: [
                            { userId: req.user.userId },
                            { email: req.user.email }
                        ]
                    } 
                });
                
                if (member) {
                    targetMemberId = member.id;
                } else {
                    // Demo fallback: Allow demo users to create payments for their hardcoded member data
                    if ((req.user.email === 'newmember@test.com' && memberId == 28) || 
                        (req.user.email === 'khoa@gmail.com' && memberId == 24) ||
                        (req.user.email === 'member1@gmail.com' && memberId == 6) ||
                        (req.user.email === 'demouser@test.com' && memberId == 30)) {
                        targetMemberId = memberId;
                    } else {
                        return res.status(403).json({
                            success: false,
                            message: 'Không có quyền tạo thanh toán cho member này'
                        });
                    }
                }
            }
        }

        const payment = await paymentService.createPayment({
            memberId: targetMemberId,
            amount,
            paymentMethod,
            paymentType,
            description,
            referenceId,
            dueDate,
            notes,
            processedBy: req.user?.id
        });

        // Auto-complete payments for members (they pay immediately)
        if (req.user?.role === 'member') {
            console.log('🔍 Auto-completing member payment:', { paymentId: payment.id, amount, paymentType, referenceId });
            await payment.markAsCompleted(`TXN${Date.now()}`, req.user?.id);
            
            // Update invoice status if this is an invoice payment
            if (paymentType === 'invoice' && referenceId) {
                try {
                    console.log('📄 Updating invoice:', referenceId, 'with payment amount:', amount);
                    const { Invoice } = require('../models');
                    const invoice = await Invoice.findByPk(referenceId);
                    if (invoice) {
                        console.log('📄 Found invoice:', { id: invoice.id, currentPaidAmount: invoice.paidAmount, totalAmount: invoice.totalAmount });
                        await invoice.addPayment(amount);
                        console.log('✅ Invoice updated successfully');
                    } else {
                        console.log('❌ Invoice not found:', referenceId);
                    }
                } catch (error) {
                    console.error('❌ Error updating invoice:', error);
                }
            }
        }

        res.status(201).json({
            success: true,
            message: 'Payment created successfully',
            data: payment
        });
    }),

    // POST /api/payments/:id/process
    processPayment: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { transactionId } = req.body;

        const payment = await paymentService.processPayment(id, {
            transactionId,
            processedBy: req.user?.id
        });

        res.json({
            success: true,
            message: 'Payment processed successfully',
            data: payment
        });
    }),

    // GET /api/payments/history
    getPaymentHistory: asyncHandler(async (req, res) => {
        const { memberId, page, limit, status, paymentType, startDate, endDate } = req.query;

        let targetMemberId = memberId;

        // If user is a member, only allow viewing their own payments
        if (req.user?.role === 'member') {
            // First try to get from req.user.member.id
            if (req.user.member?.id) {
                targetMemberId = req.user.member.id;
            } else {
                // Fallback: find member by userId or email
                const { Member } = require('../models');
                const member = await Member.findOne({ 
                    where: { 
                        [require('sequelize').Op.or]: [
                            { userId: req.user.userId },
                            { email: req.user.email }
                        ]
                    } 
                });
                
                if (member) {
                    targetMemberId = member.id;
                } else if (memberId) {
                    // If no member found, check if trying to access their own data by email match
                    const memberByEmail = await Member.findByPk(memberId);
                    if (!memberByEmail || memberByEmail.email !== req.user.email) {
                        // Demo fallback: Allow demo users to access their hardcoded member data
                        if ((req.user.email === 'newmember@test.com' && memberId == 28) || 
                            (req.user.email === 'khoa@gmail.com' && memberId == 24) ||
                            (req.user.email === 'member1@gmail.com' && memberId == 6) ||
                            (req.user.email === 'demouser@test.com' && memberId == 30)) {
                            targetMemberId = memberId;
                        } else {
                            return res.status(403).json({
                                success: false,
                                message: 'Không có quyền truy cập dữ liệu này'
                            });
                        }
                    } else {
                        targetMemberId = memberId;
                    }
                } else {
                    return res.status(400).json({
                        success: false,
                        message: 'Không tìm thấy thông tin member'
                    });
                }
            }
        }

        if (!targetMemberId) {
            throw new ValidationError('Member ID is required');
        }

        const result = await paymentService.getPaymentHistory(targetMemberId, {
            page,
            limit,
            status,
            paymentType,
            startDate,
            endDate
        });

        res.json({
            success: true,
            data: result
        });
    }),

    // GET /api/payments (admin only)
    getAllPayments: asyncHandler(async (req, res) => {
        const { page, limit, status, paymentType, startDate, endDate, memberId } = req.query;

        const result = await paymentService.getAllPayments({
            page,
            limit,
            status,
            paymentType,
            startDate,
            endDate,
            memberId
        });

        res.json({
            success: true,
            data: result
        });
    }),

    // GET /api/payments/revenue
    getRevenueStats: asyncHandler(async (req, res) => {
        const { startDate, endDate } = req.query;

        const stats = await paymentService.getRevenueStats(startDate, endDate);

        res.json({
            success: true,
            data: stats
        });
    }),

    // GET /api/payments/overdue
    getOverduePayments: asyncHandler(async (req, res) => {
        const overduePayments = await paymentService.getOverduePayments();

        res.json({
            success: true,
            data: overduePayments
        });
    }),

    // POST /api/payments/:id/remind
    sendPaymentReminder: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const result = await paymentService.sendPaymentReminder(id);

        res.json({
            success: true,
            message: result.message,
            data: result.payment
        });
    }),

    // DELETE /api/payments/:id
    cancelPayment: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            throw new ValidationError('Cancellation reason is required');
        }

        const payment = await paymentService.cancelPayment(id, reason);

        res.json({
            success: true,
            message: 'Payment cancelled successfully',
            data: payment
        });
    }),

    // GET /api/payments/:id
    getPaymentById: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const payment = await paymentService.getPaymentById ? 
            await paymentService.getPaymentById(id) :
            await Payment.findByPk(id, {
                include: [
                    {
                        model: Member,
                        as: 'member',
                        attributes: ['id', 'memberCode', 'fullName', 'phone']
                    },
                    {
                        model: Invoice,
                        as: 'invoice',
                        attributes: ['id', 'invoiceNumber', 'totalAmount', 'status']
                    },
                    {
                        model: User,
                        as: 'processor',
                        attributes: ['id', 'username', 'fullName']
                    }
                ]
            });

        if (!payment) {
            throw new NotFoundError('Payment not found');
        }

        res.json({
            success: true,
            data: payment
        });
    })
};

module.exports = paymentController;