const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testEquipmentAdmin() {
    try {
        console.log('🧪 Testing Equipment Admin API...');
        
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
            
            // Test 2: Get maintenance dashboard
            console.log('\n2. Get maintenance dashboard...');
            const dashboardResponse = await axios.get(`${API_BASE}/maintenance-scheduler/dashboard`, { headers });
            console.log('✅ Dashboard data:', JSON.stringify(dashboardResponse.data.data.summary, null, 2));
            
            // Test 3: Get equipment list
            console.log('\n3. Get equipment list...');
            const equipmentResponse = await axios.get(`${API_BASE}/equipment?limit=5`, { headers });
            console.log('✅ Equipment count:', equipmentResponse.data.data?.equipment?.length || 0);
            
            // Test 4: Get maintenance schedules
            console.log('\n4. Get maintenance schedules...');
            const schedulesResponse = await axios.get(`${API_BASE}/maintenance-schedules?limit=5`, { headers });
            console.log('✅ Schedules count:', schedulesResponse.data.data?.schedules?.length || 0);
            
            // Test 5: Get maintenance tasks
            console.log('\n5. Get maintenance tasks...');
            const maintenanceResponse = await axios.get(`${API_BASE}/equipment-maintenance?limit=5`, { headers });
            console.log('✅ Maintenance tasks count:', maintenanceResponse.data.data?.maintenance?.length || 0);
            
            // Test 6: Get maintenance history
            console.log('\n6. Get maintenance history...');
            const historyResponse = await axios.get(`${API_BASE}/maintenance-history?limit=5`, { headers });
            console.log('✅ History records count:', historyResponse.data.data?.history?.length || 0);
            
            // Test 7: Create a test equipment
            console.log('\n7. Create test equipment...');
            const newEquipment = {
                name: 'Test Equipment API',
                category: 'cardio',
                priority: 'medium',
                brand: 'Test Brand',
                location: 'Test Location',
                status: 'active'
            };
            
            const createResponse = await axios.post(`${API_BASE}/equipment`, newEquipment, { headers });
            if (createResponse.data.success) {
                const equipmentId = createResponse.data.data.id;
                console.log('✅ Equipment created with ID:', equipmentId);
                
                // Test 8: Generate tasks for new equipment (wait for schedules to be created)
                setTimeout(async () => {
                    try {
                        console.log('\n8. Generate overdue tasks...');
                        const tasksResponse = await axios.post(`${API_BASE}/maintenance-scheduler/generate-upcoming-tasks`, 
                            { days: 7 }, { headers });
                        console.log('✅ Generated tasks:', tasksResponse.data.data?.length || 0);
                        
                        // Test 9: Clean up - delete test equipment
                        console.log('\n9. Cleanup test equipment...');
                        await axios.delete(`${API_BASE}/equipment/${equipmentId}`, { headers });
                        console.log('✅ Test equipment deleted');
                        
                        console.log('\n🎉 All tests completed successfully!');
                    } catch (error) {
                        console.error('❌ Cleanup error:', error.message);
                    }
                }, 2000);
            } else {
                console.log('❌ Failed to create equipment');
            }
            
        } else {
            console.log('❌ Admin login failed');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Run the test
testEquipmentAdmin();