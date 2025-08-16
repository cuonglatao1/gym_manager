// scripts/seedPromotions.js
const { sequelize } = require('../config/database');
const promotionService = require('../services/promotionService');

async function seedPromotions() {
    try {
        console.log('🌱 Seeding sample promotions...');
        
        // Connect to database
        await sequelize.authenticate();
        console.log('✅ Database connected');
        
        // Create sample promotions
        const createdPromotions = await promotionService.createSamplePromotions();
        
        console.log(`✅ Created ${createdPromotions.length} sample promotions:`);
        createdPromotions.forEach(promo => {
            console.log(`   - ${promo.code}: ${promo.name} (${promo.type} - ${promo.discountValue}${promo.type === 'percentage' ? '%' : 'đ'})`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding promotions:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    seedPromotions();
}

module.exports = seedPromotions;