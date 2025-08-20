const request = require('supertest');
const express = require('express');
const authRoutes = require('../../../routes/authRoutes');
const { User } = require('../../../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../../../models');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

// Create test app
const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Auth Routes Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    test('should integrate login flow correctly', async () => {
      const loginData = {
        email: 'admin@gym.com',
        password: 'admin123'
      };

      const mockUser = {
        id: 1,
        email: 'admin@gym.com',
        password: '$2a$10$hashedpassword',
        fullName: 'Admin User',
        role: 'admin',
        isActive: true
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true);
      jwt.sign = jest.fn().mockReturnValue('jwt-token-12345');

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: 1,
            email: 'admin@gym.com',
            fullName: 'Admin User',
            role: 'admin'
          },
          token: 'jwt-token-12345'
        }
      });

      // Verify the sequence of calls
      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: 'admin@gym.com' }
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('admin123', '$2a$10$hashedpassword');
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: 1,
          email: 'admin@gym.com',
          role: 'admin'
        },
        expect.any(String),
        { expiresIn: expect.any(String) }
      );
    });

    test('should handle multiple failed login attempts', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);

      // Simulate multiple failed attempts
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/auth/login')
          .send({
            email: 'hacker@evil.com',
            password: 'wrongpassword'
          });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      }

      expect(User.findOne).toHaveBeenCalledTimes(3);
    });
  });

  describe('POST /auth/register', () => {
    test('should integrate registration flow correctly', async () => {
      const registerData = {
        email: 'newmember@gym.com',
        password: 'securepassword123',
        fullName: 'New Member',
        phone: '0123456789'
      };

      const mockHashedPassword = '$2a$10$hashedpassword123';
      const mockCreatedUser = {
        id: 2,
        email: 'newmember@gym.com',
        fullName: 'New Member',
        phone: '0123456789',
        role: 'member',
        isActive: true
      };

      User.findOne = jest.fn().mockResolvedValue(null); // Email doesn't exist
      bcrypt.hash = jest.fn().mockResolvedValue(mockHashedPassword);
      User.create = jest.fn().mockResolvedValue(mockCreatedUser);
      jwt.sign = jest.fn().mockReturnValue('new-user-token');

      const response = await request(app)
        .post('/auth/register')
        .send(registerData);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: 2,
            email: 'newmember@gym.com',
            fullName: 'New Member',
            role: 'member'
          },
          token: 'new-user-token'
        }
      });

      // Verify the sequence of calls
      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: 'newmember@gym.com' }
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('securepassword123', 10);
      expect(User.create).toHaveBeenCalledWith({
        email: 'newmember@gym.com',
        password: mockHashedPassword,
        fullName: 'New Member',
        phone: '0123456789',
        role: 'member'
      });
    });

    test('should prevent duplicate email registration', async () => {
      const existingUser = {
        id: 1,
        email: 'existing@gym.com'
      };

      User.findOne = jest.fn().mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'existing@gym.com',
          password: 'password123',
          fullName: 'Duplicate User'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email đã được sử dụng');
      expect(User.create).not.toHaveBeenCalled();
    });
  });

  describe('Input Validation', () => {
    test('should validate login input', async () => {
      const invalidInputs = [
        { email: '', password: 'test' },
        { email: 'invalid-email', password: 'test' },
        { email: 'test@gym.com', password: '' },
        { email: 'test@gym.com' }, // missing password
        { password: 'test' } // missing email
      ];

      for (const input of invalidInputs) {
        const response = await request(app)
          .post('/auth/login')
          .send(input);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    test('should validate registration input', async () => {
      const invalidInputs = [
        { email: 'invalid-email', password: 'test', fullName: 'Test' },
        { email: 'test@gym.com', password: '12', fullName: 'Test' }, // password too short
        { email: 'test@gym.com', password: 'test', fullName: '' }, // empty name
        { email: 'test@gym.com', password: 'test' } // missing fullName
      ];

      User.findOne = jest.fn().mockResolvedValue(null);

      for (const input of invalidInputs) {
        const response = await request(app)
          .post('/auth/register')
          .send(input);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors during login', async () => {
      User.findOne = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@gym.com',
          password: 'password123'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test('should handle bcrypt errors during registration', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);
      bcrypt.hash = jest.fn().mockRejectedValue(new Error('Bcrypt error'));

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@gym.com',
          password: 'password123',
          fullName: 'Test User'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Security', () => {
    test('should not expose user password in response', async () => {
      const mockUser = {
        id: 1,
        email: 'test@gym.com',
        password: '$2a$10$hashedpassword',
        fullName: 'Test User',
        role: 'member',
        isActive: true
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true);
      jwt.sign = jest.fn().mockReturnValue('token');

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@gym.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    test('should handle SQL injection attempts', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "admin@gym.com'; DELETE FROM users; --"
      ];

      User.findOne = jest.fn().mockResolvedValue(null);

      for (const maliciousEmail of maliciousInputs) {
        const response = await request(app)
          .post('/auth/login')
          .send({
            email: maliciousEmail,
            password: 'password123'
          });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        // Should be handled by Sequelize parameterized queries
        expect(User.findOne).toHaveBeenCalledWith({
          where: { email: maliciousEmail }
        });
      }
    });
  });
});