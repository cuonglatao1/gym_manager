// services/memberService.js
const { Member, Membership, MembershipHistory, User, ClassEnrollment } = require('../models');
const { Op, sequelize } = require('sequelize');
const { sequelize: db } = require('../config/database');
const invoiceService = require('./invoiceService');

class MemberService {
    // Generate unique member code
    async generateMemberCode() {
        let isUnique = false;
        let memberCode;
        let attempts = 0;
        
        while (!isUnique && attempts < 10) {
            const date = new Date();
            const year = date.getFullYear().toString().slice(-2);
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
            memberCode = `GM${year}${month}${random}`;
            
            const existing = await Member.findOne({ where: { memberCode } });
            if (!existing) {
                isUnique = true;
            } else {
                attempts++;
            }
        }
        
        if (!isUnique) {
            memberCode = `GM${Date.now().toString().slice(-6)}`;
        }
        
        return memberCode;
    }

    // Check if phone exists
    async checkPhoneExists(phone, excludeId = null) {
        const whereCondition = { phone };
        if (excludeId) {
            whereCondition.id = { [Op.ne]: excludeId };
        }
        
        const existing = await Member.findOne({ where: whereCondition });
        return !!existing;
    }

    // Check if email exists
    async checkEmailExists(email, excludeId = null) {
        if (!email) return false;
        
        const whereCondition = { email };
        if (excludeId) {
            whereCondition.id = { [Op.ne]: excludeId };
        }
        
        const existing = await Member.findOne({ where: whereCondition });
        return !!existing;
    }

    // Create new member
    async createMember(memberData) {
        const { membershipId, ...memberInfo } = memberData;
        
        // Generate member code
        const memberCode = await this.generateMemberCode();
        
        // Create member
        const member = await Member.create({
            ...memberInfo,
            memberCode
        });

        // Purchase membership if provided
        if (membershipId) {
            await this.purchaseMembership(member.id, membershipId);
        }

        // Return member with relationships
        return this.getMemberById(member.id);
    }

    // Get member by ID with relationships
    async getMemberById(id) {
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

        return member;
    }

    // Get all trainers for dropdown (public method)
    async getTrainers() {
        const trainers = await User.findAll({
            where: { 
                role: 'trainer',
                isActive: true 
            },
            include: [{
                model: Member,
                as: 'member',
                required: false,
                attributes: ['id', 'memberCode', 'fullName']
            }],
            attributes: ['id', 'fullName', 'email'],
            order: [['fullName', 'ASC']]
        });

        // Format for frontend
        return trainers.map(trainer => ({
            id: trainer.id,
            fullName: trainer.fullName,
            email: trainer.email,
            memberCode: trainer.member?.memberCode || null,
            memberId: trainer.member?.id || null
        }));
    }

    // Get all members with pagination and search
    async getAllMembers(options = {}) {
        const {
            page = 1,
            limit = 10,
            search = '',
            status = 'all',
            membershipStatus = 'all'
        } = options;

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
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'email', 'role'],
                    required: false
                },
                membershipInclude
            ],
            limit: parseInt(limit),
            offset: offset,
            order: [['createdAt', 'DESC']],
            distinct: true
        });

        return {
            members: rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(count / parseInt(limit)),
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        };
    }

    // Update member
    async updateMember(id, updateData) {
        const member = await Member.findByPk(id);
        if (!member) {
            throw new Error('Không tìm thấy hội viên');
        }

        await member.update(updateData);
        return this.getMemberById(id);
    }

    // Purchase membership for member (updated with invoice & promotion support)
    async purchaseMembership(memberId, membershipId, options = {}) {
        const { startDate = null, promotionCode = null, createdBy = null } = options;
        
        // CRITICAL: Check for pending MEMBERSHIP invoices before allowing membership purchase
        const { Invoice } = require('../models');
        const pendingMembershipInvoices = await Invoice.findAll({
            where: {
                memberId: memberId,
                status: 'pending',
                description: {
                    [require('sequelize').Op.like]: '%Membership%'
                }
            }
        });
        
        console.log(`🔍 [SERVICE VALIDATION] Member ID: ${memberId} has ${pendingMembershipInvoices.length} pending membership invoices`);
        
        if (pendingMembershipInvoices.length > 0) {
            console.log(`❌ [SERVICE BLOCKED] Preventing membership purchase due to pending membership invoices`);
            throw new Error(`Bạn cần thanh toán ${pendingMembershipInvoices.length} hóa đơn membership chưa thanh toán trước khi đổi gói membership.`);
        }
        
        console.log(`✅ [SERVICE ALLOWED] No pending invoices, proceeding with membership purchase`);
        
        // Validate member exists
        const member = await Member.findByPk(memberId);
        if (!member) {
            throw new Error('Không tìm thấy hội viên');
        }

        // Validate membership exists
        const membership = await Membership.findByPk(membershipId);
        if (!membership) {
            throw new Error('Không tìm thấy gói membership');
        }

        if (!membership.isActive) {
            throw new Error('Gói membership hiện không khả dụng');
        }

        // Calculate dates
        const start = startDate ? new Date(startDate) : new Date();
        const endDate = new Date(start);
        endDate.setDate(start.getDate() + membership.duration);

        // Calculate due date (7 days to pay)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        // IMPORTANT: Cancel old active memberships when buying new one
        await MembershipHistory.update(
            { 
                status: 'cancelled',
                endDate: new Date() // End immediately
            },
            {
                where: {
                    memberId: memberId,
                    status: 'active',
                    endDate: { [Op.gt]: new Date() } // Only active future memberships
                }
            }
        );

        console.log(`✅ [MEMBERSHIP REPLACEMENT] Cancelled old active memberships for member ${memberId}`);

        // Create membership history with pending payment status
        const membershipHistory = await MembershipHistory.create({
            memberId,
            membershipId,
            startDate: start,
            endDate: endDate,
            price: membership.price,
            paymentStatus: 'pending'
        });

        try {
            // Create invoice automatically for immediate payment
            const invoiceService = require('./invoiceService');
            
            const invoice = await invoiceService.generateMembershipInvoice(memberId, {
                membershipId,
                duration: membership.duration,
                price: membership.price,
                startDate: start
            });

            // Update membership history with invoice reference
            await membershipHistory.update({
                notes: `Invoice: ${invoice.invoiceNumber}`
            });

            // Return with full details
            return {
                membershipHistory: await MembershipHistory.findByPk(membershipHistory.id, {
                    include: [{
                        model: Membership,
                        as: 'membership'
                    }]
                }),
                invoice: invoice,
                promotionApplied: false
            };

        } catch (error) {
            // If invoice creation fails, still return membership history
            console.warn('Failed to create invoice for membership purchase:', error.message);
            
            return {
                membershipHistory: await MembershipHistory.findByPk(membershipHistory.id, {
                    include: [{
                        model: Membership,
                        as: 'membership'
                    }]
                }),
                invoice: null,
                error: 'Không thể tạo hóa đơn. Vui lòng liên hệ admin.'
            };
        }
    }

    // Get member's active membership
    async getActiveMembership(memberId) {
        return MembershipHistory.findOne({
            where: {
                memberId,
                status: 'active',
                endDate: { [Op.gte]: new Date() }
            },
            include: [{
                model: Membership,
                as: 'membership'
            }],
            order: [['endDate', 'DESC']]
        });
    }

    // Get member statistics
    async getMemberStatistics() {
        const totalMembers = await Member.count();
        const activeMembers = await Member.count({ where: { isActive: true } });
        const inactiveMembers = totalMembers - activeMembers;

        const membersWithActiveMembership = await Member.count({
            include: [{
                model: MembershipHistory,
                as: 'membershipHistory',
                where: {
                    status: 'active',
                    endDate: { [Op.gte]: new Date() }
                },
                required: true
            }]
        });

        return {
            totalMembers,
            activeMembers,
            inactiveMembers,
            membersWithActiveMembership,
            membersWithoutMembership: activeMembers - membersWithActiveMembership
        };
    }

    // Search members by name, email, or phone
    async searchMembers({ query, fields = ['name', 'email', 'phone'], page = 1, limit = 10 }) {
        // Validate inputs
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            throw new Error('Query parameter is required and must be a non-empty string');
        }

        if (query.trim().length < 2) {
            throw new Error('Search query must be at least 2 characters long');
        }

        const cleanQuery = query.trim();
        const cleanPage = Math.max(1, parseInt(page) || 1);
        const cleanLimit = Math.min(50, Math.max(1, parseInt(limit) || 10)); // Limit max to 50
        const offset = (cleanPage - 1) * cleanLimit;
        
        // Validate and normalize fields
        const validFields = ['name', 'fullName', 'email', 'phone'];
        let searchFields = Array.isArray(fields) ? fields : [fields];
        searchFields = searchFields.filter(field => validFields.includes(field));
        
        // Build search conditions
        const searchConditions = [];
        
        if (searchFields.includes('name') || searchFields.includes('fullName')) {
            searchConditions.push({
                fullName: {
                    [Op.iLike]: `%${cleanQuery}%`
                }
            });
        }
        
        if (searchFields.includes('email')) {
            searchConditions.push({
                email: {
                    [Op.iLike]: `%${cleanQuery}%`
                }
            });
        }
        
        if (searchFields.includes('phone')) {
            searchConditions.push({
                phone: {
                    [Op.like]: `%${cleanQuery}%`
                }
            });
        }

        // If no valid fields, search all fields
        if (searchConditions.length === 0) {
            searchConditions.push(
                {
                    fullName: {
                        [Op.iLike]: `%${cleanQuery}%`
                    }
                },
                {
                    email: {
                        [Op.iLike]: `%${cleanQuery}%`
                    }
                },
                {
                    phone: {
                        [Op.like]: `%${cleanQuery}%`
                    }
                }
            );
        }

        try {
            const { count, rows: members } = await Member.findAndCountAll({
                where: {
                    [Op.or]: searchConditions
                },
                attributes: [
                    'id', 'memberCode', 'fullName', 'email', 'phone', 
                    'dateOfBirth', 'gender', 'address', 'isActive', 'createdAt'
                ],
                order: [['createdAt', 'DESC']],
                limit: cleanLimit,
                offset: offset,
                distinct: true
            });

            // Manually fetch membership history for each member to avoid complex include issues
            for (const member of members) {
                try {
                    const membershipHistory = await MembershipHistory.findOne({
                        where: { memberId: member.id },
                        include: [{
                            model: Membership,
                            as: 'membership'
                        }],
                        order: [['endDate', 'DESC']],
                        limit: 1
                    });
                    
                    member.dataValues.membershipHistory = membershipHistory ? [membershipHistory] : [];
                } catch (err) {
                    member.dataValues.membershipHistory = [];
                }
            }

            const totalPages = Math.ceil(count / cleanLimit);

            return {
                members,
                pagination: {
                    total: count,
                    page: cleanPage,
                    limit: cleanLimit,
                    totalPages,
                    hasNext: cleanPage < totalPages,
                    hasPrev: cleanPage > 1
                }
            };
        } catch (error) {
            console.error('Search members error:', error);
            throw new Error(`Database search failed: ${error.message}`);
        }
    }

    async deleteMember(memberId) {
        const transaction = await db.transaction();
        
        try {
            // Check if member exists
            const member = await Member.findByPk(memberId, {
                include: [{
                    model: User,
                    as: 'user'
                }]
            });
            
            if (!member) {
                throw new Error('Không tìm thấy thành viên');
            }

            const user = member.user;
            const memberName = member.fullName;
            const isTrainer = user && user.role === 'trainer';

            console.log(`🗑️ Deleting ${isTrainer ? 'trainer' : 'member'}: ${memberName}`);

            // 1. Delete all enrollments (as member)
            const enrollments = await ClassEnrollment.findAll({
                where: { memberId: memberId }
            });
            
            if (enrollments.length > 0) {
                await ClassEnrollment.destroy({
                    where: { memberId: memberId },
                    transaction
                });
                console.log(`✅ Deleted ${enrollments.length} enrollments`);
            }

            // 2. If trainer: Delete all schedules they teach
            if (isTrainer && user) {
                const { ClassSchedule } = require('../models');
                
                // Find schedules taught by this trainer
                const schedules = await ClassSchedule.findAll({
                    where: { trainerId: user.id }
                });

                if (schedules.length > 0) {
                    // Delete enrollments for these schedules first
                    const scheduleIds = schedules.map(s => s.id);
                    await ClassEnrollment.destroy({
                        where: { 
                            classScheduleId: { [Op.in]: scheduleIds }
                        },
                        transaction
                    });

                    // Delete the schedules
                    await ClassSchedule.destroy({
                        where: { trainerId: user.id },
                        transaction
                    });
                    
                    console.log(`✅ Deleted ${schedules.length} schedules and their enrollments`);
                }
            }

            // 3. Delete membership history
            const { MembershipHistory } = require('../models');
            await MembershipHistory.destroy({
                where: { memberId: memberId },
                transaction
            });

            // 4. Delete member record
            await member.destroy({ transaction });
            console.log(`✅ Deleted member record: ${member.memberCode}`);

            // 5. Delete user account if exists
            if (user) {
                await user.destroy({ transaction });
                console.log(`✅ Deleted user account: ${user.email}`);
            }

            await transaction.commit();

            return {
                message: `Đã xóa hoàn toàn ${isTrainer ? 'huấn luyện viên' : 'thành viên'} ${memberName} và tất cả dữ liệu liên quan`
            };

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Delete error:', error.message);
            throw new Error(`Lỗi xóa: ${error.message}`);
        }
    }

    async cancelCurrentMembership(memberId) {
        // Check if member exists
        const member = await Member.findByPk(memberId);
        if (!member) {
            throw new Error('Không tìm thấy thành viên');
        }

        // Find current active membership
        const currentMembership = await MembershipHistory.findOne({
            where: {
                memberId: memberId,
                status: 'active',
                endDate: { [Op.gt]: new Date() }
            },
            include: [
                {
                    model: Membership,
                    as: 'membership'
                }
            ]
        });

        if (!currentMembership) {
            throw new Error('Không tìm thấy gói thành viên hiện tại');
        }

        // Cancel the membership
        await currentMembership.update({ 
            status: 'cancelled',
            endDate: new Date()
        });

        return {
            message: 'Hủy gói thành viên thành công',
            membership: {
                id: currentMembership.id,
                membershipName: currentMembership.membership.name,
                endDate: currentMembership.endDate,
                status: 'cancelled'
            }
        };
    }
}

module.exports = new MemberService();