// scripts/testClassEnrollmentNew.js
const { sequelize } = require('../config/database');
const classService = require('../services/classService');
const { Member, Class, ClassSchedule, Invoice, ClassEnrollment } = require('../models');

async function testClassEnrollmentNew() {
    try {
        console.log('🧪 Testing class enrollment with invoice integration (new schedule)...');
        
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
        
        // Find a class that has a price > 0
        const paidClass = await Class.findOne({
            where: { 
                isActive: true,
                price: { [require('sequelize').Op.gt]: 0 }
            }
        });
        
        if (!paidClass) {
            console.log('❌ No paid class found');
            return;
        }
        
        console.log(`💰 Found paid class: ${paidClass.name} - ${paidClass.price}đ`);
        
        // Create a new schedule for testing
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        
        console.log('\n📅 Creating test schedule for tomorrow...');
        const newSchedule = await classService.createClassSchedule({
            classId: paidClass.id,
            date: dateStr,
            startTime: '10:30',
            endTime: '11:30',
            trainerId: 2, // Assuming trainer user ID 2 exists
            maxParticipants: 15,
            room: 'Test Room A',
            notes: 'Test schedule for invoice integration'
        });
        
        console.log(`✅ Created schedule ID: ${newSchedule.id} for ${newSchedule.date}`);
        
        // Test class enrollment
        console.log('\n📝 Testing class enrollment...');
        const enrollmentResult = await classService.enrollInClass(newSchedule.id, member.userId);
        
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
            limit: 5,
            attributes: ['id', 'invoiceNumber', 'subtotal', 'totalAmount', 'status', 'notes']
        });
        
        recentInvoices.forEach(invoice => {
            const shortNotes = invoice.notes?.substring(0, 80) || 'No notes';
            console.log(`   ${invoice.invoiceNumber}: ${invoice.totalAmount}đ (${invoice.status})`);
            console.log(`     ${shortNotes}${invoice.notes && invoice.notes.length > 80 ? '...' : ''}`);
        });
        
        // Clean up - cancel the enrollment for future tests
        console.log('\n🧹 Cleaning up test enrollment...');
        await ClassEnrollment.update(
            { status: 'cancelled' },
            { where: { id: enrollmentResult.enrollment.id } }
        );
        console.log('✅ Test enrollment cancelled');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Test error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    testClassEnrollmentNew();
}

module.exports = testClassEnrollmentNew;