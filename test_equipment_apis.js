const axios = require('axios');

// Test configuration
const testConfig = {
    baseURL: 'http://localhost:3000/api',
    adminCredentials: {
        email: 'admin@gym.com',
        password: 'admin123'
    }
};

let authToken = null;

// Helper function for API requests
async function apiRequest(method, endpoint, data = null) {
    try {
        const config = {
            method,
            url: `${testConfig.baseURL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && { 'Authorization': `Bearer ${authToken}` })
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return response;
    } catch (error) {
        console.error(`❌ API Error [${method.toUpperCase()} ${endpoint}]:`, error.response?.data || error.message);
        throw error;
    }
}

// Test functions
async function loginAsAdmin() {
    try {
        console.log('\n🔐 Logging in as admin...');
        const response = await apiRequest('post', '/auth/login', testConfig.adminCredentials);
        authToken = response.data.token;
        console.log('✅ Admin login successful');
        return response.data;
    } catch (error) {
        console.error('❌ Admin login failed');
        throw error;
    }
}

async function testCreateEquipment() {
    console.log('\n📦 Testing Equipment Creation...');

    const equipmentData = {
        name: 'Test Treadmill Advanced',
        category: 'cardio',
        brand: 'TestBrand',
        model: 'TB-2024',
        serialNumber: 'TB202400001',
        location: 'Floor 2 - Test Area',
        purchasePrice: 5000.00,
        maintenanceInterval: 7,
        notes: 'Test equipment for API testing'
    };

    try {
        const response = await apiRequest('post', '/equipment', equipmentData);
        console.log('✅ Equipment created successfully:', response.data.data.name);
        return response.data.data;
    } catch (error) {
        console.error('❌ Equipment creation failed');
        return null;
    }
}

async function testGetAllEquipment() {
    console.log('\n📋 Testing Get All Equipment...');

    try {
        const response = await apiRequest('get', '/equipment');
        console.log(`✅ Retrieved ${response.data.data.length} equipment items`);
        return response.data.data;
    } catch (error) {
        console.error('❌ Get all equipment failed');
        return [];
    }
}

async function testGetEquipmentById(equipmentId) {
    console.log('\n🔍 Testing Get Equipment By ID...');

    try {
        const response = await apiRequest('get', `/equipment/${equipmentId}`);
        console.log('✅ Equipment details retrieved:', response.data.data.name);
        return response.data.data;
    } catch (error) {
        console.error('❌ Get equipment by ID failed');
        return null;
    }
}

async function testUpdateEquipment(equipmentId) {
    console.log('\n✏️ Testing Equipment Update...');

    const updateData = {
        condition: 'good',
        notes: 'Updated for testing - needs minor maintenance'
    };

    try {
        const response = await apiRequest('put', `/equipment/${equipmentId}`, updateData);
        console.log('✅ Equipment updated successfully');
        return response.data.data;
    } catch (error) {
        console.error('❌ Equipment update failed');
        return null;
    }
}

async function testCreateMaintenance(equipmentId) {
    console.log('\n🔧 Testing Maintenance Creation...');

    const maintenanceData = {
        equipmentId,
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
        title: 'Test Routine Maintenance',
        description: 'Regular maintenance check for testing',
        estimatedDuration: 60
    };

    try {
        const response = await apiRequest('post', '/equipment-maintenance', maintenanceData);
        console.log('✅ Maintenance created successfully');
        return response.data.data;
    } catch (error) {
        console.error('❌ Maintenance creation failed');
        return null;
    }
}

async function testGetAllMaintenance() {
    console.log('\n📋 Testing Get All Maintenance...');

    try {
        const response = await apiRequest('get', '/equipment-maintenance');
        console.log(`✅ Retrieved ${response.data.data.length} maintenance records`);
        return response.data.data;
    } catch (error) {
        console.error('❌ Get all maintenance failed');
        return [];
    }
}

async function testCompleteMaintenance(maintenanceId) {
    console.log('\n✅ Testing Complete Maintenance...');

    try {
        const response = await apiRequest('put', `/equipment-maintenance/${maintenanceId}/complete`);
        console.log('✅ Maintenance completed successfully');
        return response.data.data;
    } catch (error) {
        console.error('❌ Complete maintenance failed');
        return null;
    }
}

async function testEquipmentStats() {
    console.log('\n📊 Testing Equipment Statistics...');

    try {
        const response = await apiRequest('get', '/equipment/stats');
        console.log('✅ Equipment statistics retrieved');
        return response.data.data;
    } catch (error) {
        console.error('❌ Equipment statistics failed');
        return null;
    }
}

async function testMaintenanceStats() {
    console.log('\n📊 Testing Maintenance Statistics...');

    try {
        const response = await apiRequest('get', '/equipment-maintenance/stats');
        console.log('✅ Maintenance statistics retrieved');
        return response.data.data;
    } catch (error) {
        console.error('❌ Maintenance statistics failed');
        return null;
    }
}

async function testIncrementUsage(equipmentId) {
    console.log('\n📈 Testing Equipment Usage Increment...');

    try {
        const response = await apiRequest('post', `/equipment/${equipmentId}/usage`);
        console.log('✅ Equipment usage incremented');
        return response.data.data;
    } catch (error) {
        console.error('❌ Increment usage failed');
        return null;
    }
}

// Main test runner
async function runEquipmentAPITests() {
    console.log('🚀 Starting Equipment API Tests...\n');

    try {
        // Login first
        await loginAsAdmin();

        // Test Equipment CRUD
        const newEquipment = await testCreateEquipment();
        if (!newEquipment) return;

        const equipmentList = await testGetAllEquipment();
        const equipmentDetails = await testGetEquipmentById(newEquipment.id);
        const updatedEquipment = await testUpdateEquipment(newEquipment.id);

        // Test Equipment Maintenance
        const newMaintenance = await testCreateMaintenance(newEquipment.id);
        if (newMaintenance) {
            const maintenanceList = await testGetAllMaintenance();
            const completedMaintenance = await testCompleteMaintenance(newMaintenance.id);
        }

        // Test Statistics
        await testEquipmentStats();
        await testMaintenanceStats();

        // Test Usage
        await testIncrementUsage(newEquipment.id);

        console.log('\n🎉 All Equipment API tests completed!');

    } catch (error) {
        console.error('\n❌ Test suite failed:', error.message);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runEquipmentAPITests().catch(console.error);
}

module.exports = { runEquipmentAPITests };