// scripts/testMembershipPurchase.js
const { sequelize } = require('../config/database');
const memberService = require('../services/memberService');
const { Member, Membership, Invoice, Payment } = require('../models');

async function testMembershipPurchase() {
    try {
        console.log('🧪 Testing membership purchase with promotion...');
        
        await sequelize.authenticate();
        console.log('✅ Database connected');
        
        // Find a test member
        const member = await Member.findOne({
            where: { email: 'member1@gmail.com' }
        });
        
        if (!member) {
            console.log('❌ No test member found');
            return;
        }
        
        console.log(`👤 Testing with member: ${member.fullName} (${member.memberCode})`);
        
        // Find a membership
        const membership = await Membership.findOne({
            where: { isActive: true }
        });
        
        if (!membership) {
            console.log('❌ No active membership found');
            return;
        }
        
        console.log(`💪 Testing with membership: ${membership.name} - ${membership.price}đ`);
        
        // Test 1: Purchase without promotion
        console.log('\n📝 Test 1: Purchase without promotion');
        const result1 = await memberService.purchaseMembership(member.id, membership.id, {
            startDate: new Date(),
            createdBy: 1
        });
        
        console.log('✅ Purchase result:', {
            membershipHistory: result1.membershipHistory.id,
            invoice: result1.invoice ? result1.invoice.invoiceNumber : 'None',
            totalAmount: result1.invoice ? result1.invoice.totalAmount : 'N/A'
        });
        
        // Test 2: Purchase with promotion code
        console.log('\n📝 Test 2: Purchase with promotion code SUMMER20');
        const result2 = await memberService.purchaseMembership(member.id, membership.id, {
            startDate: new Date(),
            promotionCode: 'SUMMER20',
            createdBy: 1
        });
        
        console.log('✅ Purchase with promotion result:', {
            membershipHistory: result2.membershipHistory.id,
            invoice: result2.invoice ? result2.invoice.invoiceNumber : 'None',
            totalAmount: result2.invoice ? result2.invoice.totalAmount : 'N/A',
            originalAmount: result2.invoice ? result2.invoice.subtotal : 'N/A',
            discountAmount: result2.invoice ? result2.invoice.discountAmount : 'N/A',
            promotionApplied: result2.promotionApplied
        });
        
        // List recent invoices
        console.log('\n📋 Recent invoices:');
        const recentInvoices = await Invoice.findAll({
            where: { memberId: member.id },
            order: [['createdAt', 'DESC']],
            limit: 3,
            attributes: ['id', 'invoiceNumber', 'subtotal', 'discountAmount', 'totalAmount', 'status']
        });
        
        recentInvoices.forEach(invoice => {
            console.log(`   ${invoice.invoiceNumber}: ${invoice.subtotal}đ - ${invoice.discountAmount}đ = ${invoice.totalAmount}đ (${invoice.status})`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Test error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    testMembershipPurchase();
}

module.exports = testMembershipPurchase;