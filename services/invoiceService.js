const { Invoice, InvoiceItem, Member, Payment, User, Promotion, PromotionUsage } = require('../models');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const promotionService = require('./promotionService');

const invoiceService = {
    // Create a new invoice
    async createInvoice(invoiceData) {
        const {
            memberId,
            dueDate,
            items,
            description,
            notes,
            createdBy,
            taxRate = 0,
            discountAmount = 0,
            promotionCode,
            applicableFor
        } = invoiceData;

        // Validate member exists
        const member = await Member.findByPk(memberId);
        if (!member) {
            throw new NotFoundError('Member not found');
        }

        // Validate items
        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new ValidationError('Invoice must have at least one item');
        }

        // Calculate subtotal
        let subtotal = 0;
        items.forEach(item => {
            if (!item.description || !item.quantity || !item.unitPrice) {
                throw new ValidationError('All items must have description, quantity, and unit price');
            }
            subtotal += parseFloat(item.quantity) * parseFloat(item.unitPrice) - (parseFloat(item.discount) || 0);
        });

        // Apply promotion if provided
        let promotionDiscount = 0;
        let appliedPromotion = null;
        
        if (promotionCode) {
            try {
                const promotionResult = await promotionService.applyPromotion(
                    promotionCode, 
                    {
                        amount: subtotal,
                        applicableFor: applicableFor || 'membership',
                        memberId: memberId
                    },
                    member.userId || createdBy
                );
                
                promotionDiscount = promotionResult.discountAmount;
                appliedPromotion = promotionResult.promotion;
            } catch (error) {
                console.warn('Promotion application failed:', error.message);
                // Continue without promotion if it fails
            }
        }

        // Total discount = manual discount + promotion discount
        const totalDiscount = parseFloat(discountAmount) + promotionDiscount;

        // Calculate tax on discounted amount
        const discountedSubtotal = subtotal - totalDiscount;
        const taxAmount = (discountedSubtotal * parseFloat(taxRate)) / 100;

        // Get member's billing address
        const billingAddress = member.address || '';

        // Create invoice
        const invoice = await Invoice.create({
            memberId,
            dueDate: new Date(dueDate),
            subtotal,
            taxAmount,
            discountAmount: totalDiscount,
            totalAmount: subtotal + taxAmount - totalDiscount,
            description,
            billingAddress,
            notes: appliedPromotion ? 
                `${notes || ''}\nÁp dụng khuyến mãi: ${appliedPromotion.code} (${appliedPromotion.name})` : 
                notes,
            createdBy,
            status: 'draft'
        });

        // Create invoice items
        for (const item of items) {
            await InvoiceItem.create({
                invoiceId: invoice.id,
                itemType: item.itemType || 'service',
                itemId: item.itemId || null,
                description: item.description,
                quantity: parseInt(item.quantity),
                unitPrice: parseFloat(item.unitPrice),
                discount: parseFloat(item.discount) || 0,
                taxable: item.taxable !== false,
                taxRate: parseFloat(item.taxRate) || taxRate,
                notes: item.notes || null
            });
        }

        // Record promotion usage if applied
        if (appliedPromotion && promotionDiscount > 0) {
            await promotionService.usePromotion(appliedPromotion.id, {
                userId: member.userId || createdBy,
                memberId: memberId,
                invoiceId: invoice.id,
                originalAmount: subtotal,
                discountAmount: promotionDiscount,
                finalAmount: subtotal - promotionDiscount,
                appliedFor: applicableFor || 'membership',
                notes: `Applied to invoice ${invoice.invoiceNumber}`
            });
        }

        return await this.getInvoiceById(invoice.id);
    },

    // Get invoice by ID
    async getInvoiceById(invoiceId) {
        const invoice = await Invoice.findByPk(invoiceId, {
            include: [
                {
                    model: Member,
                    as: 'member',
                    attributes: ['id', 'memberCode', 'fullName', 'phone', 'email', 'address']
                },
                {
                    model: InvoiceItem,
                    as: 'items'
                },
                {
                    model: Payment,
                    as: 'payments',
                    attributes: ['id', 'amount', 'paymentMethod', 'paymentStatus', 'paymentDate']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'fullName']
                }
            ]
        });

        if (!invoice) {
            throw new NotFoundError('Invoice not found');
        }

        return invoice;
    },

    // Get invoices for a member
    async getMemberInvoices(memberId, options = {}) {
        const { page = 1, limit = 10, status } = options;

        const whereClause = { memberId };

        if (status) {
            whereClause.status = status;
        }

        const offset = (page - 1) * limit;

        const { count, rows } = await Invoice.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: InvoiceItem,
                    as: 'items'
                },
                {
                    model: Payment,
                    as: 'payments',
                    attributes: ['id', 'amount', 'paymentStatus', 'paymentDate']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        return {
            invoices: rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(count / limit),
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        };
    },

    // Get all invoices (admin view)
    async getAllInvoices(options = {}) {
        const { page = 1, limit = 20, status, memberId, startDate, endDate } = options;

        const whereClause = {};

        if (status) {
            whereClause.status = status;
        }

        if (memberId) {
            whereClause.memberId = memberId;
        }

        if (startDate && endDate) {
            whereClause.issueDate = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        const offset = (page - 1) * limit;

        const { count, rows } = await Invoice.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Member,
                    as: 'member',
                    attributes: ['id', 'memberCode', 'fullName', 'phone']
                },
                {
                    model: Payment,
                    as: 'payments',
                    attributes: ['id', 'amount', 'paymentStatus', 'paymentDate']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        return {
            invoices: rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(count / limit),
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        };
    },

    // Update invoice status
    async updateInvoiceStatus(invoiceId, status) {
        const invoice = await Invoice.findByPk(invoiceId);
        if (!invoice) {
            throw new NotFoundError('Invoice not found');
        }

        const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new ValidationError('Invalid invoice status');
        }

        await invoice.update({ status });
        return await this.getInvoiceById(invoiceId);
    },

    // Send invoice to member
    async sendInvoice(invoiceId) {
        const invoice = await this.getInvoiceById(invoiceId);

        if (invoice.status === 'paid' || invoice.status === 'cancelled') {
            throw new ValidationError('Cannot send paid or cancelled invoice');
        }

        await invoice.update({ status: 'sent' });

        // Here you would integrate with email service to send invoice
        console.log(`Invoice ${invoice.invoiceNumber} sent to ${invoice.member.fullName}`);

        return {
            success: true,
            message: 'Invoice sent successfully',
            invoice: await this.getInvoiceById(invoiceId)
        };
    },

    // Generate invoice for membership
    async generateMembershipInvoice(memberId, membershipData) {
        const { membershipId, duration, price, startDate } = membershipData;

        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + 7); // 7 days to pay

        const items = [{
            itemType: 'membership',
            itemId: membershipId,
            description: `Membership - ${duration} months`,
            quantity: 1,
            unitPrice: price,
            discount: 0,
            taxable: true
        }];

        return await this.createInvoice({
            memberId,
            dueDate,
            items,
            description: `Membership Invoice - ${duration} months`,
            notes: 'Membership fee payment'
        });
    },

    // Generate invoice for class enrollment
    async generateClassInvoice(memberId, classData) {
        const { classId, className, sessionCount = 1 } = classData;
        
        // Use PricingService to calculate price with member discount
        const PricingService = require('./pricingService');
        const pricingInfo = await PricingService.calculateClassPrice(classId, memberId);
        
        const basePrice = parseFloat(pricingInfo.pricing.basePrice);
        const finalPrice = parseFloat(pricingInfo.pricing.finalPrice);
        const discountAmount = parseFloat(pricingInfo.pricing.discountAmount);
        const discountPercent = parseFloat(pricingInfo.pricing.discountPercent);

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 3); // 3 days to pay for classes

        const items = [{
            itemType: 'class',
            itemId: classId,
            description: `Class: ${className}${discountPercent > 0 ? ` (Giảm ${discountPercent}%)` : ''}`,
            quantity: sessionCount,
            unitPrice: basePrice,
            discount: discountAmount,
            taxable: true
        }];

        const notes = discountPercent > 0 ? 
            `Class enrollment fee - Áp dụng giảm giá ${discountPercent}% từ gói ${pricingInfo.membershipName}` :
            'Class enrollment fee';

        return await this.createInvoice({
            memberId,
            dueDate,
            items,
            description: `Class Enrollment Invoice - ${className}`,
            notes: notes
        });
    },

    // Get overdue invoices
    async getOverdueInvoices() {
        const overdueInvoices = await Invoice.getOverdueInvoices();
        
        return overdueInvoices.map(invoice => ({
            ...invoice.toJSON(),
            daysOverdue: Math.floor((new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24))
        }));
    },

    // Cancel invoice
    async cancelInvoice(invoiceId, reason) {
        const invoice = await Invoice.findByPk(invoiceId);
        if (!invoice) {
            throw new NotFoundError('Invoice not found');
        }

        if (invoice.status === 'paid') {
            throw new ValidationError('Cannot cancel paid invoice');
        }

        await invoice.update({
            status: 'cancelled',
            notes: `${invoice.notes || ''}\nCancelled: ${reason}`
        });

        return await this.getInvoiceById(invoiceId);
    },

    // Get invoice statistics
    async getInvoiceStats(startDate, endDate) {
        const whereClause = {};

        if (startDate && endDate) {
            whereClause.issueDate = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        // Total invoices
        const totalInvoices = await Invoice.count({ where: whereClause });

        // Invoices by status
        const invoicesByStatus = await Invoice.findAll({
            attributes: [
                'status',
                [Invoice.sequelize.fn('COUNT', Invoice.sequelize.col('id')), 'count'],
                [Invoice.sequelize.fn('SUM', Invoice.sequelize.col('total_amount')), 'totalAmount']
            ],
            where: whereClause,
            group: ['status'],
            raw: true
        });

        // Total revenue from paid invoices
        const totalRevenue = await Invoice.getTotalRevenue(startDate, endDate);

        // Average invoice amount
        const avgInvoiceAmount = await Invoice.findOne({
            attributes: [[Invoice.sequelize.fn('AVG', Invoice.sequelize.col('total_amount')), 'avgAmount']],
            where: whereClause,
            raw: true
        });

        return {
            totalInvoices,
            invoicesByStatus,
            totalRevenue,
            averageInvoiceAmount: parseFloat(avgInvoiceAmount.avgAmount) || 0
        };
    }
};

module.exports = invoiceService;