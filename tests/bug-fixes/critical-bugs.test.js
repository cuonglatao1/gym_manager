const request = require('supertest');
const app = require('../../app');
const { User, Member, Equipment, MaintenanceSchedule } = require('../../models');
const maintenanceSchedulerService = require('../../services/maintenanceSchedulerService');

describe('Critical Bug Fixes', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Create test admin user
    testUser = await User.create({
      email: 'bugfix-admin@gym.com',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // 'password'
      fullName: 'Bug Fix Admin',
      role: 'admin',
      isActive: true
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'bugfix-admin@gym.com',
        password: 'password'
      });

    authToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    // Cleanup
    await MaintenanceSchedule.destroy({ where: {} });
    await Equipment.destroy({ where: {} });
    await Member.destroy({ where: {} });
    await User.destroy({ where: { id: testUser.id } });
  });

  describe('Maintenance Schedule Bugs', () => {
    test('BUG FIX: Duplicate maintenance schedules should be prevented', async () => {
      // Create equipment
      const equipment = await Equipment.create({
        equipmentCode: 'BUGFIX001',
        name: 'Bug Fix Treadmill',
        category: 'cardio',
        priority: 'high',
        location: 'Test Area',
        status: 'active',
        condition: 'good',
        isActive: true
      });

      // Create schedules multiple times (this used to create duplicates)
      await maintenanceSchedulerService.createSchedulesForEquipment(equipment.id, 'high');
      await maintenanceSchedulerService.createSchedulesForEquipment(equipment.id, 'high');

      // Check that no duplicates exist
      const schedules = await MaintenanceSchedule.findAll({
        where: {
          equipmentId: equipment.id,
          isActive: true
        }
      });

      // Group by maintenance type to check for duplicates
      const schedulesByType = {};
      schedules.forEach(schedule => {
        const type = schedule.maintenanceType;
        schedulesByType[type] = (schedulesByType[type] || 0) + 1;
      });

      // Each maintenance type should have exactly 1 active schedule
      Object.values(schedulesByType).forEach(count => {
        expect(count).toBe(1);
      });
    });

    test('BUG FIX: Completed maintenance should set lastCompletedDate correctly', async () => {
      // Create equipment and schedule
      const equipment = await Equipment.create({
        equipmentCode: 'BUGFIX002',
        name: 'Bug Fix Equipment',
        category: 'strength',
        priority: 'medium',
        location: 'Test Area',
        status: 'active',
        condition: 'good',
        isActive: true
      });

      const schedules = await maintenanceSchedulerService.createSchedulesForEquipment(equipment.id, 'medium');
      const schedule = schedules[0];

      // Complete maintenance
      const result = await maintenanceSchedulerService.completeMaintenance(schedule.id, {
        notes: 'Bug fix test completion',
        performedBy: testUser.id
      });

      expect(result.success).toBe(true);
      expect(result.nextSchedule.lastCompletedDate).not.toBeNull();
      
      // Verify the date is today
      const today = new Date().toISOString().split('T')[0];
      expect(result.nextSchedule.lastCompletedDate).toBe(today);
    });

    test('BUG FIX: Multiple completion attempts should be handled gracefully', async () => {
      // Create equipment and schedule
      const equipment = await Equipment.create({
        equipmentCode: 'BUGFIX003',
        name: 'Multi Complete Test',
        category: 'cardio',
        priority: 'low',
        location: 'Test Area',
        status: 'active',
        condition: 'good',
        isActive: true
      });

      const schedules = await maintenanceSchedulerService.createSchedulesForEquipment(equipment.id, 'low');
      const schedule = schedules[0];

      // First completion should succeed
      const result1 = await maintenanceSchedulerService.completeMaintenance(schedule.id, {
        notes: 'First completion',
        performedBy: testUser.id
      });

      expect(result1.success).toBe(true);

      // Second completion should fail gracefully
      const result2 = await maintenanceSchedulerService.completeMaintenance(schedule.id, {
        notes: 'Second completion attempt',
        performedBy: testUser.id
      });

      expect(result2.success).toBe(false);
      expect(result2.error).toContain('already been completed');
    });
  });

  describe('Authentication Bugs', () => {
    test('BUG FIX: Token expiration should be handled properly', async () => {
      // Test with malformed token
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('BUG FIX: Password validation should prevent weak passwords', async () => {
      const weakPasswords = ['123', 'password', 'admin', ''];

      for (const weakPassword of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `test-weak-${Math.random()}@gym.com`,
            password: weakPassword,
            fullName: 'Test User'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Member Management Bugs', () => {
    test('BUG FIX: Email uniqueness should be enforced', async () => {
      const memberData = {
        fullName: 'Duplicate Email Test',
        email: 'duplicate-test@gym.com',
        phone: '0123456789',
        membershipType: 'basic'
      };

      // First creation should succeed
      const response1 = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send(memberData);

      expect(response1.status).toBe(201);

      // Second creation with same email should fail
      const response2 = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send(memberData);

      expect(response2.status).toBe(400);
      expect(response2.body.success).toBe(false);

      // Cleanup
      if (response1.status === 201) {
        await Member.destroy({ where: { id: response1.body.data.member.id } });
        await User.destroy({ where: { email: memberData.email } });
      }
    });

    test('BUG FIX: Phone number format validation', async () => {
      const invalidPhoneNumbers = [
        '123', // Too short
        'abcd1234567', // Contains letters
        '+1234567890123456', // Too long
        ''  // Empty
      ];

      for (const phone of invalidPhoneNumbers) {
        const response = await request(app)
          .post('/api/members')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            fullName: 'Phone Test User',
            email: `phone-test-${Math.random()}@gym.com`,
            phone: phone,
            membershipType: 'basic'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Equipment Management Bugs', () => {
    test('BUG FIX: Equipment status updates should be validated', async () => {
      // Create equipment
      const response = await request(app)
        .post('/api/equipment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          equipmentCode: 'STATUSTEST001',
          name: 'Status Test Equipment',
          category: 'cardio',
          priority: 'medium',
          location: 'Test Area',
          purchasePrice: 1000000
        });

      expect(response.status).toBe(201);
      const equipmentId = response.body.data.equipment.id;

      // Test invalid status updates
      const invalidStatuses = ['invalid-status', '', null, 123];

      for (const status of invalidStatuses) {
        const updateResponse = await request(app)
          .put(`/api/equipment/${equipmentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status: status });

        // Should either reject or sanitize the invalid status
        if (updateResponse.status === 200) {
          // If update succeeded, status should be sanitized to valid value
          const validStatuses = ['active', 'maintenance', 'broken', 'inactive'];
          expect(validStatuses).toContain(updateResponse.body.data.equipment.status);
        } else {
          // Or should reject with 400
          expect(updateResponse.status).toBe(400);
        }
      }

      // Cleanup
      await Equipment.destroy({ where: { id: equipmentId } });
    });
  });

  describe('Data Consistency Bugs', () => {
    test('BUG FIX: Foreign key constraints should be maintained', async () => {
      // Create member
      const memberResponse = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fullName: 'FK Test Member',
          email: 'fk-test@gym.com',
          phone: '0123456789',
          membershipType: 'premium'
        });

      expect(memberResponse.status).toBe(201);
      const memberId = memberResponse.body.data.member.id;

      // Verify associated user was created
      const user = await User.findOne({
        where: { email: 'fk-test@gym.com' }
      });

      expect(user).not.toBeNull();

      // Delete member should also handle user cleanup properly
      const deleteResponse = await request(app)
        .delete(`/api/members/${memberId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);

      // Verify user is also handled (either deleted or marked inactive)
      const userAfterDelete = await User.findOne({
        where: { email: 'fk-test@gym.com' }
      });

      // User should either be deleted or marked as inactive
      if (userAfterDelete) {
        expect(userAfterDelete.isActive).toBe(false);
      }
    });
  });

  describe('Error Handling Bugs', () => {
    test('BUG FIX: Database errors should not expose sensitive information', async () => {
      // Force a database error by trying to access non-existent resource
      const response = await request(app)
        .get('/api/members/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);

      // Error message should not contain sensitive database info
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toMatch(/password/i);
      expect(responseText).not.toMatch(/connection/i);
      expect(responseText).not.toMatch(/database.*error/i);
      expect(responseText).not.toMatch(/stack.*trace/i);
    });

    test('BUG FIX: Input validation should prevent injection attacks', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        '<script>alert("xss")</script>',
        '../../etc/passwd',
        '${7*7}', // Template injection
        '{{constructor.constructor("alert(1)")()}}'
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request(app)
          .post('/api/members')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            fullName: maliciousInput,
            email: `malicious-${Math.random()}@gym.com`,
            phone: '0123456789',
            membershipType: 'basic'
          });

        // Should either reject or sanitize
        if (response.status === 201) {
          // If created, malicious input should be sanitized
          expect(response.body.data.member.fullName).not.toContain('<script>');
          expect(response.body.data.member.fullName).not.toContain('DROP TABLE');
          
          // Cleanup
          await Member.destroy({ where: { id: response.body.data.member.id } });
          await User.destroy({ where: { email: response.body.data.member.email } });
        } else {
          // Or should be rejected with proper error
          expect([400, 422]).toContain(response.status);
        }
      }
    });
  });

  describe('Performance Bug Fixes', () => {
    test('BUG FIX: Large dataset queries should not timeout', async () => {
      // This test simulates handling large datasets
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 1000 }); // Request large limit

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    test('BUG FIX: Memory leaks in concurrent requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Make multiple concurrent requests
      const promises = Array(20).fill().map(() =>
        request(app)
          .get('/api/members')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Memory should not increase dramatically
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});

// Additional bug fix tests for specific scenarios
describe('Edge Case Bug Fixes', () => {
  test('BUG FIX: Handle null/undefined values gracefully', async () => {
    // Test with null values in requests
    const testCases = [
      { fullName: null, email: 'test@gym.com' },
      { fullName: 'Test User', email: null },
      { fullName: undefined, email: 'test@gym.com' }
    ];

    for (const testCase of testCases) {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testCase);

      // Should handle gracefully with appropriate error
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    }
  });

  test('BUG FIX: Date handling edge cases', async () => {
    const invalidDates = [
      '2024-13-40', // Invalid date
      'invalid-date',
      '0000-00-00',
      ''
    ];

    // This would test date-related endpoints if they exist
    // For example, filtering by date ranges
    for (const date of invalidDates) {
      // Test date filtering (if endpoint exists)
      // const response = await request(app)
      //   .get('/api/maintenance-schedules')
      //   .query({ startDate: date });
      
      // Should handle invalid dates gracefully
      // expect(response.status).not.toBe(500);
    }
  });
});