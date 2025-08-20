/**
 * Script to get admin token for testing
 */

const https = require('https');
const http = require('http');

async function getAdminToken() {
    console.log('🔐 Getting admin token...');
    
    try {
        // Make HTTP request using native modules
        const postData = JSON.stringify({
            email: 'admin@gym.com',
            password: 'admin123'
        });

        const response = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: 3000,
                path: '/api/auth/login',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    resolve({
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        json: () => Promise.resolve(JSON.parse(data))
                    });
                });
            });

            req.on('error', reject);
            req.write(postData);
            req.end();
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Login successful!');
            console.log('🔑 Token:', data.data.accessToken.substring(0, 50) + '...');
            console.log('👤 User:', data.data.user.email, '-', data.data.user.role);
            
            // Test the token with equipment-maintenance endpoint
            console.log('\n🧪 Testing equipment-maintenance endpoint...');
            
            const testResponse = await new Promise((resolve, reject) => {
                const options = {
                    hostname: 'localhost',
                    port: 3000,
                    path: '/api/equipment-maintenance',
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${data.data.accessToken}`
                    }
                };

                const req = http.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                        resolve({
                            ok: res.statusCode >= 200 && res.statusCode < 300,
                            status: res.statusCode,
                            json: () => Promise.resolve(JSON.parse(data)),
                            text: () => Promise.resolve(data)
                        });
                    });
                });

                req.on('error', reject);
                req.end();
            });
            
            if (testResponse.ok) {
                const maintenanceData = await testResponse.json();
                console.log('✅ Equipment-maintenance endpoint works!');
                console.log(`📋 Found ${maintenanceData.data?.length || 0} maintenance records`);
                
                if (maintenanceData.data && maintenanceData.data.length > 0) {
                    console.log('📝 Sample records:');
                    maintenanceData.data.slice(0, 3).forEach((record, index) => {
                        console.log(`${index + 1}. ${record.title} - ${record.equipmentName || record.equipment?.name || 'No Equipment'} - ${record.status}`);
                    });
                }
            } else {
                const errorData = await testResponse.text();
                console.log('❌ Equipment-maintenance endpoint failed:', testResponse.status);
                console.log('Error:', errorData.substring(0, 200));
            }
            
        } else {
            console.log('❌ Login failed:', data.message);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run the test
if (require.main === module) {
    getAdminToken().then(() => {
        console.log('🏁 Test completed!');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Test failed:', error);
        process.exit(1);
    });
}

module.exports = { getAdminToken };