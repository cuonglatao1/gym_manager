const request = require('supertest');
const express = require('express');
const authController = require('../../../controllers/authController');
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
app.post('/auth/login', authController.login);
app.post('/auth/register', authController.register);
app.post('/auth/refresh', authController.refreshToken);

describe('AuthController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    test('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@gym.com',
        password: 'password123'
      };

      const mockUser = {
        id: 1,
        email: 'test@gym.com',
        password: 'hashedpassword',
        fullName: 'Test User',
        role: 'admin',
        isActive: true
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true);
      jwt.sign = jest.fn().mockReturnValue('mock-jwt-token');

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBe('mock-jwt-token');
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: loginData.email }
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
    });

    test('should fail login with invalid email', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@gym.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email hoặc mật khẩu không chính xác');
    });

    test('should fail login with invalid password', async () => {
      const mockUser = {
        id: 1,
        email: 'test@gym.com',
        password: 'hashedpassword',
        isActive: true
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@gym.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email hoặc mật khẩu không chính xác');
    });

    test('should fail login with inactive user', async () => {
      const mockUser = {
        id: 1,
        email: 'test@gym.com',
        password: 'hashedpassword',
        isActive: false
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@gym.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Tài khoản đã bị vô hiệu hóa');
    });

    test('should handle database errors', async () => {
      User.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@gym.com',
          password: 'password123'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/register', () => {
    test('should register user successfully', async () => {
      const registerData = {
        email: 'newuser@gym.com',
        password: 'password123',
        fullName: 'New User',
        phone: '0123456789'
      };

      const mockHashedPassword = 'hashed-password';
      const mockCreatedUser = {
        id: 2,
        ...registerData,
        password: mockHashedPassword,
        role: 'member',
        isActive: true
      };

      User.findOne = jest.fn().mockResolvedValue(null); // Email not exists
      bcrypt.hash = jest.fn().mockResolvedValue(mockHashedPassword);
      User.create = jest.fn().mockResolvedValue(mockCreatedUser);
      jwt.sign = jest.fn().mockReturnValue('mock-jwt-token');

      const response = await request(app)
        .post('/auth/register')
        .send(registerData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(registerData.email);
      expect(response.body.data.token).toBe('mock-jwt-token');
      expect(User.create).toHaveBeenCalledWith({
        ...registerData,
        password: mockHashedPassword,
        role: 'member'
      });
    });

    test('should fail register with existing email', async () => {
      const mockExistingUser = {
        id: 1,
        email: 'existing@gym.com'
      };

      User.findOne = jest.fn().mockResolvedValue(mockExistingUser);

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'existing@gym.com',
          password: 'password123',
          fullName: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email đã được sử dụng');
    });

    test('should handle validation errors', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: '123' // Too short
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/refresh', () => {
    test('should refresh token successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@gym.com',
        role: 'admin'
      };

      jwt.verify = jest.fn().mockReturnValue({ userId: 1 });
      User.findByPk = jest.fn().mockResolvedValue(mockUser);
      jwt.sign = jest.fn().mockReturnValue('new-jwt-token');

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBe('new-jwt-token');
    });

    test('should fail refresh with invalid token', async () => {
      jwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});