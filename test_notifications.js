const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testNotifications() {
    try {
        console.log('🧪 Testing Notification System...');
        
        // Test 1: Login as admin
        console.log('\n1. Login as admin...');
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: 'admin@gym.com',
            password: 'admin123'
        });
        
        if (loginResponse.data.success) {
            const token = loginResponse.data.data.token;
            console.log('✅ Admin login successful');
            
            // Setup headers for authenticated requests
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
            
            // Test 2: Force check notifications
            console.log('\n2. Force check notifications...');
            const checkResponse = await axios.post(`${API_BASE}/notifications/check`, {}, { headers });
            console.log('✅ Notification check result:', checkResponse.data.data);
            
            // Test 3: Get notification summary
            console.log('\n3. Get notification summary...');
            const summaryResponse = await axios.get(`${API_BASE}/notifications/summary`, { headers });
            console.log('✅ Notification summary:', summaryResponse.data.data);
            
            // Test 4: Get unread notifications
            console.log('\n4. Get unread notifications...');
            const unreadResponse = await axios.get(`${API_BASE}/notifications?unread=true`, { headers });
            console.log('✅ Unread notifications count:', unreadResponse.data.data?.length || 0);
            
            if (unreadResponse.data.data && unreadResponse.data.data.length > 0) {
                console.log('📋 Sample notifications:');
                unreadResponse.data.data.slice(0, 3).forEach((notification, index) => {
                    console.log(`   ${index + 1}. [${notification.priority.toUpperCase()}] ${notification.title} - ${notification.message}`);
                });
            }
            
            // Test 5: Generate tasks from notifications
            if (unreadResponse.data.data && unreadResponse.data.data.length > 0) {
                console.log('\n5. Generate tasks from notifications...');
                const generateResponse = await axios.post(`${API_BASE}/notifications/generate-tasks`, {}, { headers });
                console.log('✅ Tasks generated:', generateResponse.data.message);
            }
            
            // Test 6: Mark all as read
            console.log('\n6. Mark all notifications as read...');
            const markAllResponse = await axios.post(`${API_BASE}/notifications/read-all`, {}, { headers });
            console.log('✅ Mark all result:', markAllResponse.data.message);
            
            console.log('\n🎉 Notification system tests completed successfully!');
            
        } else {
            console.log('❌ Admin login failed');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Run the test
testNotifications();