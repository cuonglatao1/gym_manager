// Test setup file
const { sequelize } = require('../config/database');

// Timeout for database operations
jest.setTimeout(30000);

// Global test database connection
let testDatabaseConnected = false;

// Setup test database connection - only once
beforeAll(async () => {
  try {
    if (!testDatabaseConnected) {
      await sequelize.authenticate();
      testDatabaseConnected = true;
      console.log('✅ Test database connected successfully');
    }
  } catch (error) {
    console.error('❌ Unable to connect to test database:', error.message);
    // Don't fail tests if database is not available
    testDatabaseConnected = false;
  }
});

// Clean up after all tests
afterAll(async () => {
  try {
    if (testDatabaseConnected && sequelize) {
      await sequelize.close();
      testDatabaseConnected = false;
      console.log('✅ Test database connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing test database connection:', error.message);
  }
});

// Global test utilities
global.testUtils = {
  createTestUser: () => ({
    id: 1,
    email: 'test@gym.com',
    fullName: 'Test User',
    role: 'admin',
    isActive: true
  }),
  
  createAuthToken: () => 'test-jwt-token',
  
  mockRequest: (data = {}) => ({
    body: data.body || {},
    params: data.params || {},
    query: data.query || {},
    user: data.user || global.testUtils.createTestUser(),
    headers: data.headers || {}
  }),
  
  mockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  }
};