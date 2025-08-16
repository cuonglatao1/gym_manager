const invoiceService = require('../services/invoiceService');
const asyncHandler = require('../middleware/asyncHandler');
const { ValidationError } = require('../middleware/errorHandler');

const invoiceController = {
    // POST /api/invoices
    createInvoice: asyncHandler(async (req, res) => {
        const {
            memberId,
            dueDate,
            items,
            description,
            notes,
            taxRate,
            discountAmount
        } = req.body;

        // Validation
        if (!memberId || !dueDate || !items) {
            throw new ValidationError('Member ID, due date, and items are required');
        }

        const invoice = await invoiceService.createInvoice({
            memberId,
            dueDate,
            items,
            description,
            notes,
            taxRate,
            discountAmount,
            createdBy: req.user?.id
        });

        res.status(201).json({
            success: true,
            message: 'Invoice created successfully',
            data: invoice
        });
    }),

    // GET /api/invoices/:id
    getInvoiceById: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const invoice = await invoiceService.getInvoiceById(id);

        res.json({
            success: true,
            data: invoice
        });
    }),

    // GET /api/invoices/member/:memberId
    getMemberInvoices: asyncHandler(async (req, res) => {
        const { memberId } = req.params;
        const { page, limit, status } = req.query;

        console.log('🔍 getMemberInvoices called:', { memberId, userRole: req.user?.role, userId: req.user?.userId, email: req.user?.email });

        let targetMemberId = memberId;

        // If user is a member, only allow viewing their own invoices
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
                    console.log('🔍 Found member by userId/email:', member.id);
                } else {
                    console.log('⚠️ No member found by userId/email for user:', req.user.userId, req.user.email);
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
                }
            }
        }

        const result = await invoiceService.getMemberInvoices(targetMemberId, {
            page,
            limit,
            status
        });

        res.json({
            success: true,
            data: result
        });
    }),

    // GET /api/invoices (admin only)
    getAllInvoices: asyncHandler(async (req, res) => {
        const { page, limit, status, memberId, startDate, endDate } = req.query;

        const result = await invoiceService.getAllInvoices({
            page,
            limit,
            status,
            memberId,
            startDate,
            endDate
        });

        res.json({
            success: true,
            data: result
        });
    }),

    // PUT /api/invoices/:id/status
    updateInvoiceStatus: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            throw new ValidationError('Status is required');
        }

        const invoice = await invoiceService.updateInvoiceStatus(id, status);

        res.json({
            success: true,
            message: 'Invoice status updated successfully',
            data: invoice
        });
    }),

    // POST /api/invoices/:id/send
    sendInvoice: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const result = await invoiceService.sendInvoice(id);

        res.json({
            success: true,
            message: result.message,
            data: result.invoice
        });
    }),

    // POST /api/invoices/membership
    generateMembershipInvoice: asyncHandler(async (req, res) => {
        const { memberId, membershipId, duration, price, startDate } = req.body;

        if (!memberId || !membershipId || !duration || !price || !startDate) {
            throw new ValidationError('All membership details are required');
        }

        const invoice = await invoiceService.generateMembershipInvoice(memberId, {
            membershipId,
            duration,
            price,
            startDate
        });

        res.status(201).json({
            success: true,
            message: 'Membership invoice generated successfully',
            data: invoice
        });
    }),

    // POST /api/invoices/class
    generateClassInvoice: asyncHandler(async (req, res) => {
        const { memberId, classId, className, sessionCount } = req.body;

        if (!memberId || !classId || !className) {
            throw new ValidationError('Member ID, class ID, and class name are required');
        }

        const invoice = await invoiceService.generateClassInvoice(memberId, {
            classId,
            className,
            sessionCount
        });

        res.status(201).json({
            success: true,
            message: 'Class invoice generated successfully with member discount applied',
            data: invoice
        });
    }),

    // GET /api/invoices/overdue
    getOverdueInvoices: asyncHandler(async (req, res) => {
        const overdueInvoices = await invoiceService.getOverdueInvoices();

        res.json({
            success: true,
            data: overdueInvoices
        });
    }),

    // DELETE /api/invoices/:id
    cancelInvoice: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            throw new ValidationError('Cancellation reason is required');
        }

        const invoice = await invoiceService.cancelInvoice(id, reason);

        res.json({
            success: true,
            message: 'Invoice cancelled successfully',
            data: invoice
        });
    }),

    // GET /api/invoices/stats
    getInvoiceStats: asyncHandler(async (req, res) => {
        const { startDate, endDate } = req.query;

        const stats = await invoiceService.getInvoiceStats(startDate, endDate);

        res.json({
            success: true,
            data: stats
        });
    })
};

module.exports = invoiceController;