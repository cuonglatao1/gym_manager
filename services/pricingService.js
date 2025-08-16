const { Class, Member, Membership, ClassEnrollment } = require('../models');

class PricingService {
    /**
     * Calculate class price with member discount
     * @param {number} classId - Class ID
     * @param {number} memberId - Member ID
     * @returns {Object} Pricing information
     */
    static async calculateClassPrice(classId, memberId) {
        try {
            // Get class information
            const classData = await Class.findByPk(classId, {
                attributes: ['id', 'name', 'price']
            });

            if (!classData) {
                throw new Error('Class not found');
            }

            // Get member
            const member = await Member.findByPk(memberId);
            if (!member) {
                throw new Error('Member not found');
            }

            // Get active membership
            const activeMembershipHistory = await member.getActiveMembership();
            
            const basePrice = parseFloat(classData.price);
            let discountPercent = 0;
            let discountAmount = 0;
            let finalPrice = basePrice;
            let membershipName = 'No membership';

            // Apply membership discount if member has active membership
            if (activeMembershipHistory && activeMembershipHistory.membership) {
                discountPercent = parseFloat(activeMembershipHistory.membership.classDiscountPercent);
                discountAmount = (basePrice * discountPercent) / 100;
                finalPrice = basePrice - discountAmount;
                membershipName = activeMembershipHistory.membership.name;
            }

            return {
                classId: classData.id,
                className: classData.name,
                memberId: member.id,
                memberName: member.fullName,
                membershipName,
                pricing: {
                    basePrice: basePrice.toFixed(2),
                    discountPercent: discountPercent.toFixed(2),
                    discountAmount: discountAmount.toFixed(2),
                    finalPrice: finalPrice.toFixed(2),
                    currency: 'VND'
                }
            };

        } catch (error) {
            throw new Error(`Pricing calculation failed: ${error.message}`);
        }
    }

    /**
     * Calculate total for multiple classes
     * @param {Array} classIds - Array of class IDs
     * @param {number} memberId - Member ID
     * @returns {Object} Total pricing information
     */
    static async calculateMultipleClassesPrice(classIds, memberId) {
        try {
            const calculations = [];
            let totalBasePrice = 0;
            let totalDiscountAmount = 0;
            let totalFinalPrice = 0;

            for (const classId of classIds) {
                const pricing = await this.calculateClassPrice(classId, memberId);
                calculations.push(pricing);
                
                totalBasePrice += parseFloat(pricing.pricing.basePrice);
                totalDiscountAmount += parseFloat(pricing.pricing.discountAmount);
                totalFinalPrice += parseFloat(pricing.pricing.finalPrice);
            }

            return {
                classes: calculations,
                summary: {
                    totalBasePrice: totalBasePrice.toFixed(2),
                    totalDiscountAmount: totalDiscountAmount.toFixed(2),
                    totalFinalPrice: totalFinalPrice.toFixed(2),
                    currency: 'VND',
                    classCount: classIds.length
                }
            };

        } catch (error) {
            throw new Error(`Multiple classes pricing calculation failed: ${error.message}`);
        }
    }

    /**
     * Validate if member can book a class (check membership limits)
     * @param {number} classId - Class ID
     * @param {number} memberId - Member ID
     * @returns {Object} Validation result
     */
    static async validateClassBooking(classId, memberId) {
        try {
            const member = await Member.findByPk(memberId);
            if (!member) {
                return { canBook: false, reason: 'Member not found' };
            }

            // Get active membership
            const activeMembershipHistory = await member.getActiveMembership();
            
            // If no membership or unlimited classes, allow booking
            if (!activeMembershipHistory || !activeMembershipHistory.membership || !activeMembershipHistory.membership.maxClasses) {
                return { canBook: true };
            }

            // Check monthly class limit
            const currentMonth = new Date();
            const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

            const classesThisMonth = await ClassEnrollment.count({
                where: {
                    memberId: memberId,
                    enrollmentDate: {
                        [require('sequelize').Op.between]: [startOfMonth, endOfMonth]
                    }
                }
            });

            const maxClasses = activeMembershipHistory.membership.maxClasses;
            const remainingClasses = maxClasses - classesThisMonth;

            if (remainingClasses <= 0) {
                return { 
                    canBook: false, 
                    reason: `Monthly class limit reached (${maxClasses}/${maxClasses})`,
                    remainingClasses: 0
                };
            }

            return { 
                canBook: true, 
                remainingClasses,
                maxClasses 
            };

        } catch (error) {
            return { canBook: false, reason: `Validation failed: ${error.message}` };
        }
    }

    /**
     * Create payment record for class booking
     * @param {number} classId - Class ID
     * @param {number} memberId - Member ID
     * @param {string} paymentMethod - Payment method
     * @returns {Object} Payment record
     */
    static async createClassPayment(classId, memberId, paymentMethod = 'cash') {
        try {
            const { Payment } = require('../models');
            
            // Calculate pricing
            const pricing = await this.calculateClassPrice(classId, memberId);
            
            // Create payment record
            const payment = await Payment.create({
                memberId: memberId,
                amount: pricing.pricing.finalPrice,
                paymentMethod: paymentMethod,
                paymentType: 'class',
                referenceId: classId,
                description: `Payment for class: ${pricing.className}`,
                paymentStatus: 'pending'
            });

            return {
                payment: payment,
                pricing: pricing
            };

        } catch (error) {
            throw new Error(`Payment creation failed: ${error.message}`);
        }
    }
}

module.exports = PricingService;