const { Promotion, PromotionUsage, Member, User } = require('../models');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

const promotionService = {
    // Tạo promotion mới
    async createPromotion(promotionData) {
        const {
            code,
            name,
            description,
            type,
            discountValue,
            maxDiscountAmount,
            minOrderValue,
            applicableFor,
            membershipTypes,
            startDate,
            endDate,
            usageLimit,
            perUserLimit,
            conditions,
            createdBy
        } = promotionData;

        // Kiểm tra code đã tồn tại chưa
        const existingPromotion = await Promotion.findOne({
            where: { code: code.toUpperCase() }
        });

        if (existingPromotion) {
            throw new ValidationError('Mã khuyến mãi đã tồn tại');
        }

        const promotion = await Promotion.create({
            code: code.toUpperCase(),
            name,
            description,
            type,
            discountValue,
            maxDiscountAmount,
            minOrderValue,
            applicableFor,
            membershipTypes,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            usageLimit,
            perUserLimit,
            conditions,
            createdBy
        });

        return promotion;
    },

    // Lấy danh sách promotions
    async getAllPromotions(options = {}) {
        const { page = 1, limit = 20, isActive, applicableFor } = options;

        const whereClause = {};

        if (isActive !== undefined) {
            whereClause.isActive = isActive;
        }

        if (applicableFor) {
            whereClause[Op.or] = [
                { applicableFor: applicableFor },
                { applicableFor: 'all' }
            ];
        }

        const offset = (page - 1) * limit;

        const { count, rows } = await Promotion.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'fullName']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        return {
            promotions: rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(count / limit),
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        };
    },

    // Lấy promotions có hiệu lực
    async getValidPromotions(applicableFor = 'all') {
        return await Promotion.getValidPromotions(applicableFor);
    },

    // Tìm promotion theo mã
    async findPromotionByCode(code) {
        const promotion = await Promotion.findByCode(code);
        if (!promotion) {
            throw new NotFoundError('Không tìm thấy mã khuyến mãi');
        }
        return promotion;
    },

    // Kiểm tra và áp dụng promotion
    async applyPromotion(promotionCode, orderData, userId) {
        const { amount, applicableFor, membershipId, classId, memberId } = orderData;

        const promotion = await this.findPromotionByCode(promotionCode);

        // Kiểm tra promotion có hợp lệ không
        if (!promotion.isValid()) {
            if (!promotion.isActive) {
                throw new ValidationError('Mã khuyến mãi đã bị vô hiệu hóa');
            }
            if (new Date() < new Date(promotion.startDate)) {
                throw new ValidationError('Mã khuyến mãi chưa có hiệu lực');
            }
            if (new Date() > new Date(promotion.endDate)) {
                throw new ValidationError('Mã khuyến mãi đã hết hạn');
            }
            if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
                throw new ValidationError('Mã khuyến mãi đã hết lượt sử dụng');
            }
        }

        // Kiểm tra user có thể sử dụng không
        const canUse = await promotion.canUserUse(userId);
        if (!canUse) {
            throw new ValidationError('Bạn đã sử dụng hết lượt cho mã khuyến mãi này');
        }

        // Kiểm tra áp dụng cho loại nào
        if (promotion.applicableFor !== 'all' && promotion.applicableFor !== applicableFor) {
            throw new ValidationError(`Mã khuyến mãi chỉ áp dụng cho ${promotion.applicableFor}`);
        }

        // Kiểm tra membership types nếu có
        if (promotion.membershipTypes && applicableFor === 'membership') {
            if (!promotion.membershipTypes.includes(membershipId)) {
                throw new ValidationError('Mã khuyến mãi không áp dụng cho gói tập này');
            }
        }

        // Kiểm tra điều kiện đặc biệt
        if (promotion.conditions) {
            await this.validatePromotionConditions(promotion.conditions, userId, memberId);
        }

        // Tính toán discount
        const discountAmount = promotion.calculateDiscount(amount);

        return {
            promotion,
            originalAmount: amount,
            discountAmount,
            finalAmount: amount - discountAmount,
            savings: Math.round((discountAmount / amount) * 100)
        };
    },

    // Sử dụng promotion
    async usePromotion(promotionId, usageData) {
        const {
            userId,
            memberId,
            invoiceId,
            paymentId,
            originalAmount,
            discountAmount,
            finalAmount,
            appliedFor,
            referenceId,
            notes
        } = usageData;

        // Tạo bản ghi sử dụng
        const usage = await PromotionUsage.create({
            promotionId,
            userId,
            memberId,
            invoiceId,
            paymentId,
            originalAmount,
            discountAmount,
            finalAmount,
            appliedFor,
            referenceId,
            notes
        });

        // Tăng usage count
        const promotion = await Promotion.findByPk(promotionId);
        await promotion.incrementUsage();

        return usage;
    },

    // Validate điều kiện đặc biệt
    async validatePromotionConditions(conditions, userId, memberId) {
        // Student verification
        if (conditions.student_id_required) {
            // Ở đây có thể check student ID trong member profile
            // hoặc yêu cầu upload ảnh thẻ sinh viên
        }

        // Age range
        if (conditions.age_range) {
            const member = await Member.findByPk(memberId);
            if (member && member.dateOfBirth) {
                const age = new Date().getFullYear() - new Date(member.dateOfBirth).getFullYear();
                const { min, max } = conditions.age_range;
                if (age < min || age > max) {
                    throw new ValidationError(`Khuyến mãi chỉ áp dụng cho độ tuổi ${min}-${max}`);
                }
            }
        }

        // Time restrictions
        if (conditions.time_restrictions) {
            const now = new Date();
            const currentHour = now.getHours();
            const { start_hour, end_hour } = conditions.time_restrictions;
            if (currentHour < start_hour || currentHour > end_hour) {
                throw new ValidationError(`Khuyến mãi chỉ áp dụng từ ${start_hour}h đến ${end_hour}h`);
            }
        }

        // Day of week restrictions
        if (conditions.day_restrictions) {
            const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
            if (!conditions.day_restrictions.includes(dayOfWeek)) {
                const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
                const allowedDays = conditions.day_restrictions.map(d => days[d]).join(', ');
                throw new ValidationError(`Khuyến mãi chỉ áp dụng vào: ${allowedDays}`);
            }
        }
    },

    // Lấy lịch sử sử dụng promotion
    async getPromotionUsageHistory(options = {}) {
        const { promotionId, userId, memberId, page = 1, limit = 20 } = options;

        const whereClause = {};

        if (promotionId) whereClause.promotionId = promotionId;
        if (userId) whereClause.userId = userId;
        if (memberId) whereClause.memberId = memberId;

        const offset = (page - 1) * limit;

        const { count, rows } = await PromotionUsage.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Promotion,
                    as: 'promotion',
                    attributes: ['id', 'code', 'name', 'type', 'discountValue']
                },
                {
                    model: Member,
                    as: 'member',
                    attributes: ['id', 'memberCode', 'fullName']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        return {
            usages: rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(count / limit),
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        };
    },

    // Cập nhật promotion
    async updatePromotion(promotionId, updateData) {
        const promotion = await Promotion.findByPk(promotionId);
        if (!promotion) {
            throw new NotFoundError('Không tìm thấy khuyến mãi');
        }

        // Không cho phép thay đổi code đã sử dụng
        if (updateData.code && promotion.usageCount > 0) {
            throw new ValidationError('Không thể thay đổi mã khuyến mãi đã được sử dụng');
        }

        await promotion.update(updateData);
        return promotion;
    },

    // Tạo một số promotion mẫu
    async createSamplePromotions() {
        const samplePromotions = [
            {
                code: 'STUDENT40',
                name: 'Ưu đãi sinh viên',
                description: 'Giảm 40% cho sinh viên có thẻ',
                type: 'percentage',
                discountValue: 40,
                applicableFor: 'membership',
                startDate: new Date(),
                endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 năm
                conditions: { student_id_required: true }
            },
            {
                code: 'SUMMER20',
                name: 'Khuyến mãi hè',
                description: 'Giảm 20% gói tập mùa hè',
                type: 'percentage',
                discountValue: 20,
                maxDiscountAmount: 200000,
                applicableFor: 'membership',
                startDate: new Date('2025-06-01'),
                endDate: new Date('2025-08-31'),
                usageLimit: 100
            },
            {
                code: 'EARLYBIRD',
                name: 'Early Bird Special',
                description: 'Giảm 10% cho ai tập sớm (6h-8h sáng)',
                type: 'percentage',
                discountValue: 10,
                applicableFor: 'all',
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày
                conditions: { time_restrictions: { start_hour: 6, end_hour: 8 } }
            },
            {
                code: 'BRINGFRIEND',
                name: 'Bring a Friend',
                description: 'Giảm 150.000đ khi giới thiệu bạn',
                type: 'fixed_amount',
                discountValue: 150000,
                minOrderValue: 500000,
                applicableFor: 'membership',
                startDate: new Date(),
                endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 tháng
                perUserLimit: 3
            },
            {
                code: 'WEEKEND15',
                name: 'Weekend Warrior',
                description: 'Giảm 15% cho ai chỉ tập cuối tuần',
                type: 'percentage',
                discountValue: 15,
                applicableFor: 'membership',
                startDate: new Date(),
                endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 2 tháng
                conditions: { day_restrictions: [0, 6] } // Chỉ chủ nhật và thứ 7
            }
        ];

        const createdPromotions = [];
        for (const promoData of samplePromotions) {
            try {
                const existing = await Promotion.findOne({ where: { code: promoData.code } });
                if (!existing) {
                    const promotion = await Promotion.create(promoData);
                    createdPromotions.push(promotion);
                }
            } catch (error) {
                console.log(`Skipped creating ${promoData.code}: ${error.message}`);
            }
        }

        return createdPromotions;
    }
};

module.exports = promotionService;