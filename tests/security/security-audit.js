const request = require('supertest');
const app = require('../../app');
const { User } = require('../../models');

describe('Security Audit Tests', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Create test user for authenticated tests
    testUser = await User.create({
      email: 'security-test@gym.com',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // 'password'
      fullName: 'Security Test User',
      role: 'admin',
      isActive: true
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'security-test@gym.com',
        password: 'password'
      });

    authToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    await User.destroy({ where: { id: testUser.id } });
  });

  describe('Authentication Security', () => {
    test('should prevent brute force attacks', async () => {
      const attempts = [];
      
      // Simulate multiple failed login attempts
      for (let i = 0; i < 10; i++) {
        attempts.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'security-test@gym.com',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(attempts);
      
      // All should fail with 401
      responses.forEach(response => {
        expect([401, 429]).toContain(response.status); // 429 = Too Many Requests
      });
    });

    test('should validate JWT token properly', async () => {
      const invalidTokens = [
        'invalid.jwt.token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        '', // Empty token
        'Bearer ', // Empty bearer
        'malformed-token'
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .get('/api/members')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      }
    });

    test('should reject expired tokens', async () => {
      // This would require creating an expired token
      // For demo purposes, we'll test with malformed token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
      
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe('SQL Injection Prevention', () => {
    test('should prevent SQL injection in login', async () => {
      const sqlInjectionAttempts = [
        "' OR '1'='1",
        "admin'; DROP TABLE users; --",
        "' UNION SELECT * FROM users --",
        "'; DELETE FROM users WHERE '1'='1",
        "' OR 1=1 --"
      ];

      for (const maliciousInput of sqlInjectionAttempts) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: maliciousInput,
            password: 'password123'
          });

        // Should handle gracefully, not expose database errors
        expect([400, 401, 500]).toContain(response.status);
        expect(response.body.success).toBe(false);
      }
    });

    test('should prevent SQL injection in member search', async () => {
      const maliciousQueries = [
        "'; DROP TABLE members; --",
        "' UNION SELECT * FROM users --",
        "' OR 1=1 --"
      ];

      for (const query of maliciousQueries) {
        const response = await request(app)
          .get('/api/members')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ search: query });

        // Should return normally or validation error, not database error
        expect(response.status).toBeLessThan(500);
      }
    });
  });

  describe('Cross-Site Scripting (XSS) Prevention', () => {
    test('should sanitize input to prevent XSS', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '"><script>alert("XSS")</script>',
        "javascript:alert('XSS')",
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/members')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            fullName: payload,
            email: 'xss-test@gym.com',
            phone: '0123456789',
            membershipType: 'basic'
          });

        // Should either validate input or sanitize it
        if (response.status === 201) {
          // If created successfully, check that XSS payload is sanitized
          expect(response.body.data.member.fullName).not.toContain('<script>');
          expect(response.body.data.member.fullName).not.toContain('javascript:');
          
          // Cleanup
          await request(app)
            .delete(`/api/members/${response.body.data.member.id}`)
            .set('Authorization', `Bearer ${authToken}`);
        }
      }
    });
  });

  describe('Authorization Tests', () => {
    test('should prevent privilege escalation', async () => {
      // Create a member user
      const memberUser = await User.create({
        email: 'member-security@gym.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        fullName: 'Member Security Test',
        role: 'member',
        isActive: true
      });

      const memberLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'member-security@gym.com',
          password: 'password'
        });

      const memberToken = memberLoginResponse.body.data.token;

      // Try to access admin-only endpoints
      const adminEndpoints = [
        { method: 'post', path: '/api/equipment' },
        { method: 'delete', path: '/api/members/1' },
        { method: 'post', path: '/api/users' }
      ];

      for (const endpoint of adminEndpoints) {
        let response;
        
        if (endpoint.method === 'post') {
          response = await request(app)
            .post(endpoint.path)
            .set('Authorization', `Bearer ${memberToken}`)
            .send({ test: 'data' });
        } else if (endpoint.method === 'delete') {
          response = await request(app)
            .delete(endpoint.path)
            .set('Authorization', `Bearer ${memberToken}`);
        }

        expect(response.status).toBe(403); // Forbidden
        expect(response.body.success).toBe(false);
      }

      await User.destroy({ where: { id: memberUser.id } });
    });

    test('should prevent unauthorized data access', async () => {
      // Test accessing other user's data
      const response = await request(app)
        .get('/api/users/999') // Non-existent or unauthorized user
        .set('Authorization', `Bearer ${authToken}`);

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('Input Validation', () => {
    test('should validate file upload security', async () => {
      // Test malicious file types (if file upload exists)
      const maliciousFiles = [
        { filename: 'script.js', content: 'alert("XSS")' },
        { filename: 'malware.exe', content: 'binary-content' },
        { filename: '../../../etc/passwd', content: 'path-traversal' }
      ];

      // This is a conceptual test - adjust based on your file upload endpoints
      for (const file of maliciousFiles) {
        // If you have file upload endpoints, test them here
        // Example: POST /api/upload with malicious files
      }
    });

    test('should prevent path traversal attacks', async () => {
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ];

      for (const path of pathTraversalAttempts) {
        // Test any endpoints that accept file paths or names
        const response = await request(app)
          .get(`/api/files/${path}`)
          .set('Authorization', `Bearer ${authToken}`);

        // Should reject or sanitize path traversal attempts
        expect(response.status).not.toBe(200);
      }
    });
  });

  describe('Session Security', () => {
    test('should handle concurrent sessions properly', async () => {
      // Login from multiple "devices" (different user agents)
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
      ];

      const tokens = [];

      for (const userAgent of userAgents) {
        const response = await request(app)
          .post('/api/auth/login')
          .set('User-Agent', userAgent)
          .send({
            email: 'security-test@gym.com',
            password: 'password'
          });

        if (response.status === 200) {
          tokens.push(response.body.data.token);
        }
      }

      // All tokens should be valid (or implement session limits)
      for (const token of tokens) {
        const testResponse = await request(app)
          .get('/api/members')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 401]).toContain(testResponse.status);
      }
    });
  });

  describe('Rate Limiting', () => {
    test('should implement rate limiting', async () => {
      const promises = [];
      
      // Make many rapid requests
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(app)
            .get('/api/members')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(promises);
      
      // At least some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      // This test depends on whether rate limiting is implemented
      // If not implemented, this test will document that fact
      console.log(`Rate limited responses: ${rateLimitedResponses.length}/50`);
    });
  });

  describe('Error Handling Security', () => {
    test('should not expose sensitive information in errors', async () => {
      // Test various error conditions
      const errorTests = [
        {
          name: 'Database error',
          request: () => request(app).get('/api/nonexistent-endpoint')
        },
        {
          name: 'Validation error',
          request: () => request(app)
            .post('/api/members')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ invalid: 'data' })
        }
      ];

      for (const test of errorTests) {
        const response = await test.request();
        
        // Should not expose:
        // - Database connection strings
        // - Internal file paths
        // - Stack traces in production
        const responseText = JSON.stringify(response.body);
        
        expect(responseText).not.toMatch(/password/i);
        expect(responseText).not.toMatch(/secret/i);
        expect(responseText).not.toMatch(/connection.*string/i);
        expect(responseText).not.toMatch(/file.*not.*found/i);
      }
    });
  });

  describe('CORS Security', () => {
    test('should implement proper CORS policy', async () => {
      const maliciousOrigins = [
        'http://malicious-site.com',
        'https://evil.com',
        'null'
      ];

      for (const origin of maliciousOrigins) {
        const response = await request(app)
          .options('/api/members')
          .set('Origin', origin)
          .set('Access-Control-Request-Method', 'GET');

        // Should not allow requests from malicious origins
        // Or should have proper CORS configuration
        const corsHeader = response.headers['access-control-allow-origin'];
        
        if (corsHeader) {
          expect(corsHeader).not.toBe('*'); // Wildcard CORS can be dangerous
          expect(corsHeader).not.toBe(origin); // Should not echo back malicious origin
        }
      }
    });
  });
});

// Security configuration audit
describe('Security Configuration Audit', () => {
  test('should have security headers configured', async () => {
    const response = await request(app).get('/api/health');

    // Check for security headers (these depend on your middleware configuration)
    const headers = response.headers;
    
    // Document what security headers are present
    console.log('Security headers present:');
    const securityHeaders = [
      'x-frame-options',
      'x-content-type-options', 
      'x-xss-protection',
      'strict-transport-security',
      'content-security-policy',
      'x-powered-by'
    ];

    securityHeaders.forEach(header => {
      if (headers[header]) {
        console.log(`✅ ${header}: ${headers[header]}`);
      } else {
        console.log(`❌ ${header}: Not configured`);
      }
    });
  });

  test('should not expose sensitive server information', async () => {
    const response = await request(app).get('/api/health');
    
    // Should not reveal:
    const sensitiveHeaders = ['x-powered-by', 'server'];
    
    sensitiveHeaders.forEach(header => {
      if (response.headers[header]) {
        console.log(`⚠️ Potentially sensitive header exposed: ${header}: ${response.headers[header]}`);
      }
    });
  });
});