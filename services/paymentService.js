const { Payment, Invoice, InvoiceItem, Member, User } = require('../models');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

const paymentService = {
    // Create a new payment
    async createPayment(paymentData) {
        const {
            memberId,
            amount,
            paymentMethod,
            paymentType,
            description,
            referenceId,
            dueDate,
            notes,
            processedBy
        } = paymentData;

        // Validate member exists
        const member = await Member.findByPk(memberId);
        if (!member) {
            throw new NotFoundError('Member not found');
        }

        // Create payment
        const payment = await Payment.create({
            memberId,
            amount,
            paymentMethod,
            paymentType,
            description,
            referenceId,
            dueDate,
            notes,
            processedBy
        });

        return await Payment.findByPk(payment.id, {
            include: [
                {
                    model: Member,
                    as: 'member',
                    attributes: ['id', 'memberCode', 'fullName', 'phone']
                },
                {
                    model: User,
                    as: 'processor',
                    attributes: ['id', 'username', 'fullName']
                }
            ]
        });
    },

    // Process payment (mark as completed)
    async processPayment(paymentId, transactionData) {
        const { transactionId, processedBy } = transactionData;

        const payment = await Payment.findByPk(paymentId);
        if (!payment) {
            throw new NotFoundError('Payment not found');
        }

        if (payment.paymentStatus === 'completed') {
            throw new ValidationError('Payment already completed');
        }

        await payment.markAsCompleted(transactionId, processedBy);

        // If payment is linked to an invoice, update invoice status
        if (payment.invoiceId) {
            const invoice = await Invoice.findByPk(payment.invoiceId);
            if (invoice) {
                await invoice.addPayment(payment.amount);
            }
        }

        return await Payment.findByPk(paymentId, {
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
                }
            ]
        });
    },

    // Get payment history for a member
    async getPaymentHistory(memberId, options = {}) {
        const { page = 1, limit = 10, status, paymentType, startDate, endDate } = options;

        const whereClause = { memberId };

        if (status) {
            whereClause.paymentStatus = status;
        }

        if (paymentType) {
            whereClause.paymentType = paymentType;
        }

        if (startDate && endDate) {
            whereClause.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        const offset = (page - 1) * limit;

        const { count, rows } = await Payment.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Invoice,
                    as: 'invoice',
                    attributes: ['id', 'invoiceNumber', 'totalAmount', 'status']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        return {
            payments: rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(count / limit),
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        };
    },

    // Get all payments (admin view)
    async getAllPayments(options = {}) {
        const { page = 1, limit = 20, status, paymentType, startDate, endDate, memberId } = options;

        const whereClause = {};

        if (status) {
            whereClause.paymentStatus = status;
        }

        if (paymentType) {
            whereClause.paymentType = paymentType;
        }

        if (memberId) {
            whereClause.memberId = memberId;
        }

        if (startDate && endDate) {
            whereClause.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        const offset = (page - 1) * limit;

        const { count, rows } = await Payment.findAndCountAll({
            where: whereClause,
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
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        return {
            payments: rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(count / limit),
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        };
    },

    // Get revenue statistics
    async getRevenueStats(startDate, endDate) {
        const whereClause = {
            paymentStatus: 'completed'
        };

        if (startDate && endDate) {
            whereClause.paymentDate = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        // Total revenue
        const totalRevenue = await Payment.getTotalRevenue(startDate, endDate);

        // Revenue by type
        const revenueByType = await Payment.getRevenueByType(startDate, endDate);

        // Revenue by payment method
        const revenueByMethod = await Payment.findAll({
            attributes: [
                'paymentMethod',
                [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'totalAmount'],
                [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'count']
            ],
            where: whereClause,
            group: ['paymentMethod'],
            raw: true
        });

        // Monthly revenue (last 12 months) - PostgreSQL compatible
        const monthlyRevenue = await Payment.findAll({
            attributes: [
                [Payment.sequelize.fn('TO_CHAR', Payment.sequelize.col('payment_date'), 'YYYY-MM'), 'month'],
                [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'totalAmount'],
                [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'count']
            ],
            where: {
                paymentStatus: 'completed',
                paymentDate: {
                    [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 12))
                }
            },
            group: [Payment.sequelize.fn('TO_CHAR', Payment.sequelize.col('payment_date'), 'YYYY-MM')],
            order: [[Payment.sequelize.fn('TO_CHAR', Payment.sequelize.col('payment_date'), 'YYYY-MM'), 'ASC']],
            raw: true
        });

        return {
            totalRevenue,
            revenueByType,
            revenueByMethod,
            monthlyRevenue
        };
    },

    // Get overdue payments
    async getOverduePayments() {
        return await Payment.findAll({
            where: {
                paymentStatus: 'pending',
                dueDate: {
                    [Op.lt]: new Date()
                }
            },
            include: [
                {
                    model: Member,
                    as: 'member',
                    attributes: ['id', 'memberCode', 'fullName', 'phone', 'email']
                }
            ],
            order: [['dueDate', 'ASC']]
        });
    },

    // Send payment reminder
    async sendPaymentReminder(paymentId) {
        const payment = await Payment.findByPk(paymentId, {
            include: [
                {
                    model: Member,
                    as: 'member',
                    attributes: ['id', 'memberCode', 'fullName', 'phone', 'email']
                }
            ]
        });

        if (!payment) {
            throw new NotFoundError('Payment not found');
        }

        if (payment.paymentStatus !== 'pending') {
            throw new ValidationError('Payment reminder can only be sent for pending payments');
        }

        // Here you would integrate with SMS/Email service
        // For now, we'll just return success
        console.log(`Payment reminder sent to ${payment.member.fullName} for payment ${payment.id}`);

        return {
            success: true,
            message: 'Payment reminder sent successfully',
            payment: payment
        };
    },

    // Cancel payment
    async cancelPayment(paymentId, reason) {
        const payment = await Payment.findByPk(paymentId);
        if (!payment) {
            throw new NotFoundError('Payment not found');
        }

        if (payment.paymentStatus === 'completed') {
            throw new ValidationError('Cannot cancel completed payment');
        }

        await payment.update({
            paymentStatus: 'failed',
            notes: `Cancelled: ${reason}`
        });

        return payment;
    }
};

module.exports = paymentService;