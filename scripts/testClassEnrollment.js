// scripts/testClassEnrollment.js
const { sequelize } = require('../config/database');
const classService = require('../services/classService');
const { Member, Class, ClassSchedule, Invoice } = require('../models');

async function testClassEnrollment() {
    try {
        console.log('🧪 Testing class enrollment with invoice integration...');
        
        await sequelize.authenticate();
        console.log('✅ Database connected');
        
        // Find a test member
        const member = await Member.findOne({
            where: { email: 'member1@gmail.com' },
            include: [{ model: require('../models').User, as: 'user' }]
        });
        
        if (!member) {
            console.log('❌ No test member found');
            return;
        }
        
        console.log(`👤 Testing with member: ${member.fullName} (${member.memberCode})`);
        
        // Find a class schedule that's in the future
        const schedule = await ClassSchedule.findOne({
            where: {
                startTime: { [require('sequelize').Op.gte]: new Date() },
                status: 'scheduled'
            },
            include: [
                {
                    model: Class,
                    as: 'class',
                    where: { isActive: true }
                }
            ],
            order: [['startTime', 'ASC']]
        });
        
        if (!schedule) {
            console.log('❌ No future class schedule found');
            return;
        }
        
        console.log(`📅 Testing with schedule: ${schedule.class.name} on ${schedule.date} at ${schedule.startTime}`);
        console.log(`💰 Class price: ${schedule.class.price}đ`);
        
        // Test class enrollment
        console.log('\n📝 Testing class enrollment...');
        const enrollmentResult = await classService.enrollInClass(schedule.id, member.userId);
        
        console.log('✅ Enrollment result:', {
            enrollmentId: enrollmentResult.enrollment?.id,
            memberName: enrollmentResult.enrollment?.member?.fullName,
            className: enrollmentResult.enrollment?.classSchedule?.class?.name,
            hasInvoice: !!enrollmentResult.invoice,
            invoiceNumber: enrollmentResult.invoice?.invoiceNumber,
            totalAmount: enrollmentResult.invoice?.totalAmount,
            hasPayment: enrollmentResult.hasPayment,
            invoiceError: enrollmentResult.invoiceError
        });
        
        // List recent invoices for this member
        console.log('\n📋 Recent invoices for member:');
        const recentInvoices = await Invoice.findAll({
            where: { memberId: member.id },
            order: [['createdAt', 'DESC']],
            limit: 3,
            attributes: ['id', 'invoiceNumber', 'subtotal', 'totalAmount', 'status', 'notes']
        });
        
        recentInvoices.forEach(invoice => {
            console.log(`   ${invoice.invoiceNumber}: ${invoice.totalAmount}đ (${invoice.status}) - ${invoice.notes?.substring(0, 50) || 'No notes'}`);
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
    testClassEnrollment();
}

module.exports = testClassEnrollment;