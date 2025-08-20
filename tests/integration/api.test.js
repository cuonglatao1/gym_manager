const request = require('supertest');
const app = require('../../app');
const { sequelize } = require('../../config/database');
const { User, Member, Equipment } = require('../../models');

describe('API Integration Tests', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Ensure database connection
    await sequelize.authenticate();
    
    // Create test admin user
    testUser = await User.create({
      email: 'test-admin@gym.com',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // 'password'
      fullName: 'Test Admin',
      role: 'admin',
      phone: '0123456789',
      isActive: true
    });

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test-admin@gym.com',
        password: 'password'
      });

    authToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await Member.destroy({ where: {} });
      await Equipment.destroy({ where: {} });
      await User.destroy({ where: { email: 'test-admin@gym.com' } });
    } catch (error) {
      console.log('Cleanup error:', error.message);
    }
    
    await sequelize.close();
  });

  describe('Authentication Flow', () => {
    test('should complete full authentication flow', async () => {
      // 1. Register new user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'integration-test@gym.com',
          password: 'testpassword123',
          fullName: 'Integration Test User',
          phone: '0987654321'
        });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.email).toBe('integration-test@gym.com');

      // 2. Login with new user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'integration-test@gym.com',
          password: 'testpassword123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();

      // Clean up
      await User.destroy({ where: { email: 'integration-test@gym.com' } });
    });
  });

  describe('Member Management Flow', () => {
    test('should complete full member CRUD operations', async () => {
      // 1. Create member
      const createResponse = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fullName: 'Integration Test Member',
          email: 'member-test@gym.com',
          phone: '0111222333',
          membershipType: 'premium',
          address: '123 Test Street'
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);
      const memberId = createResponse.body.data.member.id;

      // 2. Get member by ID
      const getResponse = await request(app)
        .get(`/api/members/${memberId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.member.fullName).toBe('Integration Test Member');

      // 3. Update member
      const updateResponse = await request(app)
        .put(`/api/members/${memberId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fullName: 'Updated Test Member',
          phone: '0999888777'
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);

      // 4. Verify update
      const verifyResponse = await request(app)
        .get(`/api/members/${memberId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(verifyResponse.body.data.member.fullName).toBe('Updated Test Member');
      expect(verifyResponse.body.data.member.phone).toBe('0999888777');

      // 5. List all members
      const listResponse = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`);

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.success).toBe(true);
      expect(listResponse.body.data.members).toBeInstanceOf(Array);

      // 6. Delete member
      const deleteResponse = await request(app)
        .delete(`/api/members/${memberId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // 7. Verify deletion
      const verifyDeleteResponse = await request(app)
        .get(`/api/members/${memberId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(verifyDeleteResponse.status).toBe(404);
    });
  });

  describe('Equipment Management Flow', () => {
    test('should complete full equipment management with maintenance', async () => {
      // 1. Create equipment
      const createResponse = await request(app)
        .post('/api/equipment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          equipmentCode: 'TEST001',
          name: 'Test Treadmill',
          category: 'cardio',
          priority: 'high',
          location: 'Test Floor',
          purchasePrice: 50000000
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);
      const equipmentId = createResponse.body.data.equipment.id;

      // 2. Verify maintenance schedules were auto-created
      const schedulesResponse = await request(app)
        .get('/api/maintenance-schedules')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ equipmentId });

      expect(schedulesResponse.status).toBe(200);
      expect(schedulesResponse.body.data.schedules.length).toBeGreaterThan(0);

      // 3. Get equipment details
      const getResponse = await request(app)
        .get(`/api/equipment/${equipmentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data.equipment.name).toBe('Test Treadmill');

      // 4. Update equipment
      const updateResponse = await request(app)
        .put(`/api/equipment/${equipmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Test Treadmill',
          status: 'maintenance'
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);

      // 5. Complete maintenance
      const schedule = schedulesResponse.body.data.schedules[0];
      const completeResponse = await request(app)
        .post(`/api/maintenance-schedules/${schedule.id}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notes: 'Integration test maintenance completed',
          performedBy: testUser.id
        });

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.success).toBe(true);

      // 6. Delete equipment (cleanup)
      const deleteResponse = await request(app)
        .delete(`/api/equipment/${equipmentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);
    });
  });

  describe('Authorization Tests', () => {
    test('should enforce authentication requirements', async () => {
      // Test without auth token
      const noAuthResponse = await request(app)
        .get('/api/members');

      expect(noAuthResponse.status).toBe(401);
      expect(noAuthResponse.body.success).toBe(false);
    });

    test('should enforce role-based authorization', async () => {
      // Create member user
      const memberUser = await User.create({
        email: 'member-auth-test@gym.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        fullName: 'Member User',
        role: 'member',
        isActive: true
      });

      // Login as member
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'member-auth-test@gym.com',
          password: 'password'
        });

      const memberToken = loginResponse.body.data.token;

      // Try to access admin-only endpoint
      const adminOnlyResponse = await request(app)
        .post('/api/equipment')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Unauthorized Equipment',
          category: 'cardio'
        });

      expect(adminOnlyResponse.status).toBe(403);
      expect(adminOnlyResponse.body.success).toBe(false);

      // Cleanup
      await User.destroy({ where: { id: memberUser.id } });
    });
  });

  describe('Error Handling', () => {
    test('should handle validation errors consistently', async () => {
      // Test invalid member creation
      const invalidMemberResponse = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fullName: '', // Invalid empty name
          email: 'invalid-email' // Invalid email format
        });

      expect(invalidMemberResponse.status).toBe(400);
      expect(invalidMemberResponse.body.success).toBe(false);
      expect(invalidMemberResponse.body.message).toBeDefined();
    });

    test('should handle resource not found errors', async () => {
      const notFoundResponse = await request(app)
        .get('/api/members/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(notFoundResponse.status).toBe(404);
      expect(notFoundResponse.body.success).toBe(false);
    });
  });

  describe('Data Consistency', () => {
    test('should maintain data consistency across related models', async () => {
      // Create member
      const memberResponse = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fullName: 'Consistency Test Member',
          email: 'consistency@gym.com',
          phone: '0123456789',
          membershipType: 'basic'
        });

      const memberId = memberResponse.body.data.member.id;

      // Verify user was also created
      const user = await User.findOne({
        where: { email: 'consistency@gym.com' }
      });

      expect(user).toBeDefined();
      expect(user.role).toBe('member');

      // Cleanup
      await Member.destroy({ where: { id: memberId } });
      await User.destroy({ where: { id: user.id } });
    });
  });

  describe('Performance', () => {
    test('should handle concurrent requests', async () => {
      const promises = [];
      
      // Create 5 concurrent requests
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .get('/api/members')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    test('should respond within reasonable time limits', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});