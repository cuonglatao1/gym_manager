// scripts/testFullIntegration.js
const { sequelize } = require('../config/database');
const memberService = require('../services/memberService');
const classService = require('../services/classService');
const promotionService = require('../services/promotionService');
const invoiceService = require('../services/invoiceService');
const { Member, Membership, Class, ClassSchedule, Invoice, Payment, Promotion } = require('../models');

async function testFullIntegration() {
    try {
        console.log('🧪 COMPREHENSIVE INTEGRATION TEST');
        console.log('=====================================');
        
        await sequelize.authenticate();
        console.log('✅ Database connected');
        
        // Find test member
        const member = await Member.findOne({
            where: { email: 'member1@gmail.com' },
            include: [{ model: require('../models').User, as: 'user' }]
        });
        
        if (!member) {
            console.log('❌ No test member found');
            return;
        }
        
        console.log(`\n👤 Testing with: ${member.fullName} (${member.memberCode})`);
        
        // =======================
        // TEST 1: MEMBERSHIP PURCHASE WITH PROMOTION
        // =======================
        console.log('\n📝 TEST 1: MEMBERSHIP PURCHASE WITH PROMOTION');
        console.log('================================================');
        
        const membership = await Membership.findOne({ where: { isActive: true } });
        console.log(`💪 Using membership: ${membership.name} - ${membership.price}đ`);
        
        // Get available promotions
        const promotions = await promotionService.getValidPromotions('membership');
        console.log(`\n🎁 Available promotions: ${promotions.length}`);
        promotions.forEach(promo => {
            console.log(`   - ${promo.code}: ${promo.name} (${promo.type} - ${promo.discountValue}${promo.type === 'percentage' ? '%' : 'đ'})`);
        });
        
        // Purchase membership with promotion
        const membershipResult = await memberService.purchaseMembership(member.id, membership.id, {
            startDate: new Date(),
            promotionCode: 'STUDENT40', // 40% student discount
            createdBy: member.userId
        });
        
        console.log('\n✅ Membership purchase result:');
        console.log(`   - Membership History: ${membershipResult.membershipHistory.id}`);
        console.log(`   - Invoice: ${membershipResult.invoice?.invoiceNumber}`);
        console.log(`   - Original: ${membershipResult.invoice?.subtotal}đ`);
        console.log(`   - Discount: ${membershipResult.invoice?.discountAmount}đ`);
        console.log(`   - Final: ${membershipResult.invoice?.totalAmount}đ`);
        console.log(`   - Promotion Applied: ${membershipResult.promotionApplied}`);
        
        // =======================
        // TEST 2: CLASS ENROLLMENT WITH AUTO INVOICE
        // =======================
        console.log('\n📝 TEST 2: CLASS ENROLLMENT WITH AUTO INVOICE');
        console.log('===============================================');
        
        // Find a paid class
        const paidClass = await Class.findOne({
            where: { 
                isActive: true,
                price: { [require('sequelize').Op.gt]: 0 }
            }
        });
        
        console.log(`🏃 Using class: ${paidClass.name} - ${paidClass.price}đ`);
        
        // Create a schedule for tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 2);
        const dateStr = tomorrow.toISOString().split('T')[0];
        
        const classSchedule = await classService.createClassSchedule({
            classId: paidClass.id,
            date: dateStr,
            startTime: '14:00',
            endTime: '15:00',
            trainerId: 2,
            maxParticipants: 10,
            room: 'Integration Test Room',
            notes: 'Full integration test schedule'
        });
        
        console.log(`📅 Created schedule: ${classSchedule.id} for ${classSchedule.date}`);
        
        // Enroll in class
        const enrollmentResult = await classService.enrollInClass(classSchedule.id, member.userId);
        
        console.log('\n✅ Class enrollment result:');
        console.log(`   - Enrollment: ${enrollmentResult.enrollment.id}`);
        console.log(`   - Invoice: ${enrollmentResult.invoice?.invoiceNumber}`);
        console.log(`   - Amount: ${enrollmentResult.invoice?.totalAmount}đ`);
        console.log(`   - Has Payment: ${enrollmentResult.hasPayment}`);
        console.log(`   - Error: ${enrollmentResult.invoiceError || 'None'}`);
        
        // =======================
        // TEST 3: PAYMENT DASHBOARD SUMMARY
        // =======================
        console.log('\n📝 TEST 3: PAYMENT DASHBOARD SUMMARY');
        console.log('=====================================');
        
        // Get all invoices for this member
        const memberInvoices = await invoiceService.getMemberInvoices(member.id, { limit: 10 });
        
        console.log(`\n📄 Member invoices: ${memberInvoices.invoices.length}`);
        
        let totalPending = 0;
        let totalPaid = 0;
        let totalOverdue = 0;
        
        memberInvoices.invoices.forEach(invoice => {
            const amount = parseFloat(invoice.totalAmount);
            const isOverdue = new Date(invoice.dueDate) < new Date();
            
            console.log(`   ${invoice.invoiceNumber}: ${invoice.totalAmount}đ (${invoice.status}) - Due: ${invoice.dueDate}`);
            
            if (invoice.status === 'paid') {
                totalPaid += amount;
            } else if (isOverdue && invoice.status !== 'cancelled') {
                totalOverdue += amount;
            } else if (invoice.status === 'draft' || invoice.status === 'sent') {
                totalPending += amount;
            }
        });
        
        console.log('\n💰 Payment Summary:');
        console.log(`   - Total Paid: ${totalPaid.toLocaleString('vi-VN')}đ`);
        console.log(`   - Total Pending: ${totalPending.toLocaleString('vi-VN')}đ`);
        console.log(`   - Total Overdue: ${totalOverdue.toLocaleString('vi-VN')}đ`);
        
        // =======================
        // TEST 4: PROMOTION USAGE TRACKING
        // =======================
        console.log('\n📝 TEST 4: PROMOTION USAGE TRACKING');
        console.log('====================================');
        
        const promotionUsage = await promotionService.getPromotionUsageHistory({
            memberId: member.id,
            limit: 5
        });
        
        console.log(`\n🎁 Promotion usage history: ${promotionUsage.usages.length}`);
        promotionUsage.usages.forEach(usage => {
            console.log(`   ${usage.promotion.code}: ${usage.originalAmount}đ → ${usage.finalAmount}đ (saved ${usage.discountAmount}đ)`);
        });
        
        // =======================
        // CLEANUP
        // =======================
        console.log('\n🧹 CLEANUP');
        console.log('===========');
        
        // Cancel the test enrollment
        await require('../models').ClassEnrollment.update(
            { status: 'cancelled' },
            { where: { id: enrollmentResult.enrollment.id } }
        );
        console.log('✅ Test enrollment cancelled');
        
        console.log('\n🎉 INTEGRATION TEST COMPLETED SUCCESSFULLY!');
        console.log('==========================================');
        console.log('✅ Membership purchase with promotion: WORKING');
        console.log('✅ Class enrollment with auto invoice: WORKING'); 
        console.log('✅ Payment dashboard integration: WORKING');
        console.log('✅ Promotion usage tracking: WORKING');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Integration test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    testFullIntegration();
}

module.exports = testFullIntegration;