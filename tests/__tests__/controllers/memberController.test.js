const request = require('supertest');
const express = require('express');
const memberController = require('../../../controllers/memberController');
const { Member, User } = require('../../../models');

// Mock the models
jest.mock('../../../models');

// Create test app
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = global.testUtils.createTestUser();
  next();
});
app.get('/members', memberController.getAll);
app.post('/members', memberController.register); // memberController uses 'register' not 'create'
app.get('/members/:id', memberController.getById);
app.put('/members/:id', memberController.update); // uses 'update' 
app.delete('/members/:id', memberController.deleteMember); // uses 'deleteMember' not 'delete'

describe('MemberController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /members', () => {
    test('should return all members successfully', async () => {
      const mockMembers = [
        {
          id: 1,
          fullName: 'John Doe',
          email: 'john@example.com',
          phone: '0123456789',
          membershipType: 'premium',
          isActive: true
        },
        {
          id: 2,
          fullName: 'Jane Smith',
          email: 'jane@example.com', 
          phone: '0987654321',
          membershipType: 'basic',
          isActive: true
        }
      ];

      Member.findAll = jest.fn().mockResolvedValue(mockMembers);

      const response = await request(app).get('/members');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.members).toHaveLength(2);
      expect(Member.findAll).toHaveBeenCalledTimes(1);
    });

    test('should handle database error', async () => {
      Member.findAll = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/members');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Lỗi khi lấy danh sách thành viên');
    });
  });

  describe('POST /members', () => {
    test('should register member successfully', async () => {
      const newMemberData = {
        fullName: 'New Member',
        email: 'new@example.com',
        phone: '0123456789',
        membershipType: 'basic'
      };

      const mockCreatedMember = {
        id: 3,
        ...newMemberData,
        isActive: true
      };

      Member.create = jest.fn().mockResolvedValue(mockCreatedMember);
      User.create = jest.fn().mockResolvedValue({ id: 3, email: newMemberData.email });

      const response = await request(app)
        .post('/members')
        .send(newMemberData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.member.fullName).toBe(newMemberData.fullName);
      expect(Member.create).toHaveBeenCalledTimes(1);
    });

    test('should return validation error for invalid data', async () => {
      const invalidData = {
        fullName: '', // Empty name should fail validation
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/members')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /members/:id', () => {
    test('should return member by id successfully', async () => {
      const mockMember = {
        id: 1,
        fullName: 'John Doe',
        email: 'john@example.com',
        isActive: true
      };

      Member.findByPk = jest.fn().mockResolvedValue(mockMember);

      const response = await request(app).get('/members/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.member.id).toBe(1);
      expect(Member.findByPk).toHaveBeenCalledWith('1', expect.any(Object));
    });

    test('should return 404 for non-existent member', async () => {
      Member.findByPk = jest.fn().mockResolvedValue(null);

      const response = await request(app).get('/members/999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Thành viên không tồn tại');
    });
  });

  describe('PUT /members/:id', () => {
    test('should update member successfully', async () => {
      const updateData = {
        fullName: 'Updated Name',
        phone: '0999888777'
      };

      const mockMember = {
        id: 1,
        fullName: 'Old Name',
        update: jest.fn().mockResolvedValue(true),
        ...updateData
      };

      Member.findByPk = jest.fn().mockResolvedValue(mockMember);

      const response = await request(app)
        .put('/members/1')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockMember.update).toHaveBeenCalledWith(updateData);
    });

    test('should return 404 for non-existent member update', async () => {
      Member.findByPk = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .put('/members/999')
        .send({ fullName: 'Test' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /members/:id', () => {
    test('should delete member successfully', async () => {
      const mockMember = {
        id: 1,
        fullName: 'Test Member',
        destroy: jest.fn().mockResolvedValue(true)
      };

      Member.findByPk = jest.fn().mockResolvedValue(mockMember);

      const response = await request(app).delete('/members/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockMember.destroy).toHaveBeenCalledTimes(1);
    });

    test('should return 404 for non-existent member deletion', async () => {
      Member.findByPk = jest.fn().mockResolvedValue(null);

      const response = await request(app).delete('/members/999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});