const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
let adminToken = null;
let memberToken = null;

async function loginAsAdmin() {
    try {
        const response = await axios.post(`${API_BASE}/auth/login`, {
            email: 'admin@gym.com',
            password: 'admin123'
        });
        adminToken = response.data.data.accessToken;
        console.log('✅ Admin login successful');
        return adminToken;
    } catch (error) {
        console.error('❌ Admin login failed:', error.response?.data?.message || error.message);
        throw error;
    }
}

async function loginAsMember() {
    try {
        const response = await axios.post(`${API_BASE}/auth/login`, {
            email: 'member@gym.com',
            password: 'member123'
        });
        memberToken = response.data.data.accessToken;
        console.log('✅ Member login successful');
        return memberToken;
    } catch (error) {
        console.error('❌ Member login failed:', error.response?.data?.message || error.message);
        throw error;
    }
}

async function createTestSchedules(adminToken) {
    console.log('📅 Creating test schedules for conflict testing...\n');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const schedules = [
        {
            date: dateStr,
            startTime: '14:00',
            endTime: '15:00',
            maxParticipants: 5,
            room: 'Test Room A'
        },
        {
            date: dateStr,
            startTime: '14:30',
            endTime: '15:30',
            maxParticipants: 5,
            room: 'Test Room B'
        },
        {
            date: dateStr,
            startTime: '16:00',
            endTime: '17:00',
            maxParticipants: 5,
            room: 'Test Room C'
        }
    ];

    const createdSchedules = [];
    
    try {
        // Get first available class
        const classesResponse = await axios.get(`${API_BASE}/classes`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        if (!classesResponse.data.data.classes || classesResponse.data.data.classes.length === 0) {
            throw new Error('No classes available for testing');
        }
        
        const classId = classesResponse.data.data.classes[0].id;
        
        for (const scheduleData of schedules) {
            const response = await axios.post(`${API_BASE}/classes/${classId}/schedules`, scheduleData, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            createdSchedules.push(response.data.data);
            console.log(`✅ Created schedule: ${scheduleData.startTime}-${scheduleData.endTime}`);
        }
        
        return createdSchedules;
    } catch (error) {
        console.error('❌ Failed to create test schedules:', error.response?.data?.message || error.message);
        return [];
    }
}

async function testConflictValidation(memberToken, schedules) {
    console.log('\n🔍 Testing conflict validation...\n');

    if (schedules.length < 3) {
        console.log('❌ Not enough schedules created for testing');
        return;
    }

    // Test 1: Enroll in first schedule (should succeed)
    console.log('📝 Test 1: Enrolling in Schedule 1 (14:00-15:00)...');
    try {
        await axios.post(`${API_BASE}/classes/schedules/${schedules[0].id}/enroll`, {}, {
            headers: { Authorization: `Bearer ${memberToken}` }
        });
        console.log('✅ Test 1 PASSED: Successfully enrolled in first schedule');
    } catch (error) {
        console.log('❌ Test 1 FAILED:', error.response?.data?.message || error.message);
    }

    // Test 2: Try to enroll in overlapping schedule (should fail)
    console.log('\n📝 Test 2: Enrolling in Schedule 2 (14:30-15:30) - SHOULD FAIL DUE TO OVERLAP...');
    try {
        await axios.post(`${API_BASE}/classes/schedules/${schedules[1].id}/enroll`, {}, {
            headers: { Authorization: `Bearer ${memberToken}` }
        });
        console.log('❌ Test 2 FAILED: Should have been blocked due to time conflict!');
    } catch (error) {
        console.log('✅ Test 2 PASSED: Correctly blocked overlapping enrollment -', error.response?.data?.message);
    }

    // Test 3: Try to enroll in non-overlapping schedule (should succeed)
    console.log('\n📝 Test 3: Enrolling in Schedule 3 (16:00-17:00) - SHOULD SUCCEED...');
    try {
        await axios.post(`${API_BASE}/classes/schedules/${schedules[2].id}/enroll`, {}, {
            headers: { Authorization: `Bearer ${memberToken}` }
        });
        console.log('✅ Test 3 PASSED: Successfully enrolled in non-overlapping schedule');
    } catch (error) {
        console.log('❌ Test 3 FAILED:', error.response?.data?.message || error.message);
    }
}

async function runConflictTest() {
    console.log('🧪 CONFLICT VALIDATION TEST');
    console.log('============================\n');

    try {
        // Login as admin and member
        await loginAsAdmin();
        await loginAsMember();

        // Create test schedules
        const schedules = await createTestSchedules(adminToken);

        // Test conflict validation
        await testConflictValidation(memberToken, schedules);

        console.log('\n✅ Test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

runConflictTest();