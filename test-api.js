const fetch = require('node-fetch');

async function testAPI() {
    try {
        const token = 'test'; // You'll need to replace with actual token
        
        console.log('🧪 Testing equipment API...');
        
        // Test without filters
        console.log('\n📋 Testing: All equipment');
        let response = await fetch('http://localhost:3001/api/equipment', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        let data = await response.json();
        console.log(`Result: ${data.data?.length || 0} items`);
        
        // Test with high priority filter
        console.log('\n📋 Testing: High priority equipment');
        response = await fetch('http://localhost:3001/api/equipment?priority=high', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        data = await response.json();
        console.log(`Result: ${data.data?.length || 0} items`);
        
        // Test with medium priority filter
        console.log('\n📋 Testing: Medium priority equipment');
        response = await fetch('http://localhost:3001/api/equipment?priority=medium', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        data = await response.json();
        console.log(`Result: ${data.data?.length || 0} items`);
        
        // Test with low priority filter
        console.log('\n📋 Testing: Low priority equipment');
        response = await fetch('http://localhost:3001/api/equipment?priority=low', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        data = await response.json();
        console.log(`Result: ${data.data?.length || 0} items`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testAPI();