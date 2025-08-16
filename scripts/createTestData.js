const { Invoice, Payment } = require('../models');

async function createTestData() {
    try {
        console.log('Finding or creating test invoices for member 30...');
        
        // Find existing invoices or get their IDs
        let invoice1 = await Invoice.findOne({ where: { invoiceNumber: 'INV-2024-001' } });
        let invoice2 = await Invoice.findOne({ where: { invoiceNumber: 'INV-2024-002' } });
        let invoice3 = await Invoice.findOne({ where: { invoiceNumber: 'INV-2024-003' } });
        
        console.log('Found invoices:', { invoice1: invoice1?.id, invoice2: invoice2?.id, invoice3: invoice3?.id });
        
        // Create test payments
        const payments = await Payment.bulkCreate([
            {
                memberId: 30,
                amount: 500000,
                paymentMethod: 'cash',
                paymentType: 'membership',
                paymentStatus: 'completed',
                description: 'Thanh toán phí thành viên tháng 12/2024',
                referenceId: invoice1?.id,
                transactionId: 'TXN-001-2024',
                paymentDate: new Date('2024-12-01')
            },
            {
                memberId: 30,
                amount: 300000,
                paymentMethod: 'bank_transfer',
                paymentType: 'membership', 
                paymentStatus: 'completed',
                description: 'Thanh toán một phần phí thành viên tháng 1/2025',
                referenceId: invoice2?.id,
                transactionId: 'TXN-002-2024',
                paymentDate: new Date('2025-01-01')
            },
            {
                memberId: 30,
                amount: 150000,
                paymentMethod: 'cash',
                paymentType: 'class',
                paymentStatus: 'completed', 
                description: 'Thanh toán lớp Yoga cá nhân',
                transactionId: 'TXN-003-2024',
                paymentDate: new Date('2024-11-15')
            }
        ]);
        
        console.log('Created payments:', payments.length);
        console.log('Test data creation completed successfully!');
        
    } catch (error) {
        console.error('Error creating test data:', error);
    }
}

createTestData();