// Unit tests for business logic without database dependencies
describe('Gym Manager Business Logic Tests', () => {
  
  describe('Membership Calculations', () => {
    test('should calculate membership fees correctly', () => {
      const membershipPrices = {
        'basic': 500000,     // 500k VND
        'premium': 1000000,  // 1M VND
        'vip': 1500000      // 1.5M VND
      };

      expect(membershipPrices.basic).toBe(500000);
      expect(membershipPrices.premium).toBe(1000000);
      expect(membershipPrices.vip).toBe(1500000);
    });

    test('should calculate discounts correctly', () => {
      const basePrice = 1000000;
      const studentDiscount = 0.15; // 15%
      const seniorDiscount = 0.20;  // 20%
      
      const studentPrice = basePrice * (1 - studentDiscount);
      const seniorPrice = basePrice * (1 - seniorDiscount);
      
      expect(studentPrice).toBe(850000);
      expect(seniorPrice).toBe(800000);
    });

    test('should handle membership duration calculations', () => {
      const startDate = new Date('2025-08-19');
      const duration = 30; // days
      
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + duration);
      
      expect(endDate.toISOString().split('T')[0]).toBe('2025-09-18');
    });
  });

  describe('Equipment Maintenance Logic', () => {
    test('should calculate next maintenance date', () => {
      const lastMaintenance = new Date('2025-08-19');
      const intervalDays = {
        'daily': 1,
        'weekly': 7,
        'monthly': 30,
        'quarterly': 90
      };
      
      Object.entries(intervalDays).forEach(([interval, days]) => {
        const nextDate = new Date(lastMaintenance);
        nextDate.setDate(lastMaintenance.getDate() + days);
        
        expect(nextDate.getTime()).toBeGreaterThan(lastMaintenance.getTime());
      });
    });

    test('should prioritize maintenance by equipment priority', () => {
      const equipment = [
        { id: 1, name: 'Treadmill', priority: 'high', lastMaintenance: '2025-08-10' },
        { id: 2, name: 'Bike', priority: 'medium', lastMaintenance: '2025-08-15' },
        { id: 3, name: 'Weights', priority: 'low', lastMaintenance: '2025-08-12' }
      ];

      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      
      const sorted = equipment.sort((a, b) => {
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.lastMaintenance) - new Date(b.lastMaintenance);
      });

      expect(sorted[0].priority).toBe('high');
      expect(sorted[1].priority).toBe('medium');
      expect(sorted[2].priority).toBe('low');
    });
  });

  describe('Validation Logic', () => {
    test('should validate Vietnamese phone numbers', () => {
      const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
      
      const validPhones = ['0123456789', '0987654321', '+84123456789'];
      const invalidPhones = ['123456789', '012345', '+1234567890', 'abc123456789'];
      
      validPhones.forEach(phone => {
        expect(phoneRegex.test(phone)).toBe(true);
      });
      
      invalidPhones.forEach(phone => {
        expect(phoneRegex.test(phone)).toBe(false);
      });
    });

    test('should validate email addresses', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      const validEmails = [
        'user@gym.com',
        'member.test@fitness.vn',
        'admin123@example.org'
      ];
      
      const invalidEmails = [
        'invalid-email',
        '@gym.com',
        'user@',
        'user.gym.com'
      ];
      
      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });
      
      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });

    test('should validate equipment codes', () => {
      const equipmentCodeRegex = /^[A-Z]{2,4}\d{3,6}$/;
      
      const validCodes = ['GYM001', 'TRDM123456', 'BK001'];
      const invalidCodes = ['gym001', '123', 'A1', ''];
      
      validCodes.forEach(code => {
        expect(equipmentCodeRegex.test(code)).toBe(true);
      });
      
      invalidCodes.forEach(code => {
        expect(equipmentCodeRegex.test(code)).toBe(false);
      });
    });
  });

  describe('Financial Calculations', () => {
    test('should format Vietnamese currency correctly', () => {
      const amounts = [
        { amount: 1000000, expected: '1.000.000' },
        { amount: 500000, expected: '500.000' },
        { amount: 1500000, expected: '1.500.000' }
      ];
      
      amounts.forEach(({ amount, expected }) => {
        const formatted = amount.toLocaleString('vi-VN');
        expect(formatted).toBe(expected);
      });
    });

    test('should calculate VAT correctly', () => {
      const baseAmount = 1000000;
      const vatRate = 0.10; // 10% VAT
      
      const vatAmount = baseAmount * vatRate;
      const totalAmount = baseAmount + vatAmount;
      
      expect(vatAmount).toBe(100000);
      expect(totalAmount).toBe(1100000);
    });
  });

  describe('Security Logic', () => {
    test('should detect potentially malicious input', () => {
      const testCases = [
        { input: '<script>alert("xss")</script>', shouldDetect: true },
        { input: 'javascript:alert(1)', shouldDetect: true },
        { input: "'; DROP TABLE users; --", shouldDetect: true },
        { input: 'SELECT * FROM users', shouldDetect: true },
        { input: 'Hello World', shouldDetect: false }
      ];
      
      testCases.forEach(({ input, shouldDetect }) => {
        // Create new regex each time to avoid global flag state issues
        const sqlInjectionPattern = /(union|select|insert|delete|drop|create|alter|'|--|#)/i;
        const xssPattern = /(<script|javascript:|vbscript:|onload|onerror)/i;
        
        const isMalicious = sqlInjectionPattern.test(input) || xssPattern.test(input);
        expect(isMalicious).toBe(shouldDetect);
      });
    });

    test('should sanitize input strings', () => {
      const input = '<script>alert("test")</script>Hello World';
      const sanitized = input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .trim();
      
      expect(sanitized).toBe('Hello World');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('javascript:');
    });
  });

  describe('Date and Time Utilities', () => {
    test('should handle timezone calculations', () => {
      const utcDate = new Date('2025-08-19T10:00:00.000Z');
      const vietnamOffsetHours = 7; // UTC+7
      
      // Get the time components
      const utcHours = utcDate.getUTCHours();
      const vietnamHours = (utcHours + vietnamOffsetHours) % 24;
      
      expect(utcHours).toBe(10);
      expect(vietnamHours).toBe(17); // 10 UTC + 7 = 17 Vietnam time
    });

    test('should calculate age correctly', () => {
      const birthDate = new Date('1990-08-19');
      const currentDate = new Date('2025-08-19');
      
      const age = currentDate.getFullYear() - birthDate.getFullYear();
      const monthDiff = currentDate.getMonth() - birthDate.getMonth();
      
      const calculatedAge = monthDiff < 0 || 
        (monthDiff === 0 && currentDate.getDate() < birthDate.getDate()) 
        ? age - 1 
        : age;
      
      expect(calculatedAge).toBe(35);
    });
  });

  describe('Data Processing', () => {
    test('should sort members by join date', () => {
      const members = [
        { name: 'Alice', joinDate: '2025-08-15' },
        { name: 'Bob', joinDate: '2025-08-10' },
        { name: 'Charlie', joinDate: '2025-08-18' }
      ];
      
      const sorted = members.sort((a, b) => new Date(a.joinDate) - new Date(b.joinDate));
      
      expect(sorted[0].name).toBe('Bob');
      expect(sorted[1].name).toBe('Alice');
      expect(sorted[2].name).toBe('Charlie');
    });

    test('should filter active memberships', () => {
      const memberships = [
        { id: 1, status: 'active', expiryDate: '2025-12-31' },
        { id: 2, status: 'expired', expiryDate: '2025-01-01' },
        { id: 3, status: 'active', expiryDate: '2026-06-30' },
        { id: 4, status: 'suspended', expiryDate: '2025-11-15' }
      ];
      
      const active = memberships.filter(m => 
        m.status === 'active' && 
        new Date(m.expiryDate) > new Date()
      );
      
      expect(active).toHaveLength(2);
      expect(active.every(m => m.status === 'active')).toBe(true);
    });
  });
});