const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { RateLimiterMemory } = require('rate-limiter-flexible');

// Rate limiting configurations
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Different rate limits for different endpoints
const rateLimiters = {
  // General API rate limiting
  general: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    100, // limit each IP to 100 requests per windowMs
    'Too many requests from this IP, please try again later.'
  ),

  // Strict rate limiting for auth endpoints
  auth: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // limit each IP to 5 login attempts per windowMs
    'Too many login attempts from this IP, please try again after 15 minutes.'
  ),

  // Rate limiting for sensitive operations
  sensitive: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    10, // limit each IP to 10 sensitive operations per hour
    'Too many sensitive operations from this IP, please try again later.'
  )
};

// Advanced rate limiter for brute force protection
const bruteForceProtection = new RateLimiterMemory({
  keyPrefix: 'login_fail',
  points: 5, // Number of attempts
  duration: 900, // Per 15 minutes
  blockDuration: 900 // Block for 15 minutes
});

// Brute force protection middleware
const bruteForceMiddleware = async (req, res, next) => {
  try {
    const key = `${req.ip}_${req.body.email || 'unknown'}`;
    await bruteForceProtection.consume(key);
    next();
  } catch (rejRes) {
    const remainingPoints = rejRes.remainingPoints || 0;
    const msBeforeNext = rejRes.msBeforeNext || 0;
    
    res.status(429).json({
      success: false,
      message: 'Too many failed login attempts',
      retryAfter: Math.round(msBeforeNext / 1000) || 900,
      remainingAttempts: remainingPoints
    });
  }
};

// Security headers configuration
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Disable if causing issues with third-party resources
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
});

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // Remove potential XSS patterns
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  if (req.query) {
    req.query = sanitize(req.query);
  }
  
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

// SQL injection prevention middleware
const preventSQLInjection = (req, res, next) => {
  const sqlInjectionPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/gi,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/gi,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/gi,
    /((\%27)|(\'))union/gi,
    /union[^a-z]*select/gi,
    /select[^a-z]*from/gi,
    /insert[^a-z]*into/gi,
    /delete[^a-z]*from/gi,
    /drop[^a-z]*table/gi,
    /update[^a-z]*set/gi
  ];

  const checkForSQLInjection = (value) => {
    if (typeof value === 'string') {
      return sqlInjectionPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };

  const hasSQLInjection = (obj) => {
    for (const value of Object.values(obj)) {
      if (typeof value === 'string' && checkForSQLInjection(value)) {
        return true;
      }
      if (typeof value === 'object' && value !== null && hasSQLInjection(value)) {
        return true;
      }
    }
    return false;
  };

  // Check request body, query, and params
  const inputs = [req.body, req.query, req.params].filter(Boolean);
  
  for (const input of inputs) {
    if (hasSQLInjection(input)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input detected'
      });
    }
  }

  next();
};

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://yourdomain.com' // Replace with your actual domain
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// File upload security middleware
const fileUploadSecurity = (req, res, next) => {
  // If file upload middleware is used, validate file types and sizes
  if (req.files || req.file) {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'application/pdf',
      'text/plain'
    ];

    const maxFileSize = 10 * 1024 * 1024; // 10MB

    const files = req.files ? Object.values(req.files).flat() : [req.file];

    for (const file of files) {
      if (file) {
        // Check file type
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return res.status(400).json({
            success: false,
            message: 'File type not allowed'
          });
        }

        // Check file size
        if (file.size > maxFileSize) {
          return res.status(400).json({
            success: false,
            message: 'File size too large'
          });
        }

        // Check for potentially malicious filenames
        if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
          return res.status(400).json({
            success: false,
            message: 'Invalid filename'
          });
        }
      }
    }
  }

  next();
};

// Request logging for security monitoring
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log suspicious activities
  const suspiciousPatterns = [
    /admin/gi,
    /config/gi,
    /\.env/gi,
    /\.git/gi,
    /wp-admin/gi,
    /phpmyadmin/gi
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(req.url) || pattern.test(req.get('User-Agent') || '')
  );

  if (isSuspicious) {
    console.warn(`🚨 Suspicious request detected:`, {
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  }

  // Log authentication failures
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn(`🔐 Authentication/Authorization failure:`, {
        ip: req.ip,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime,
        timestamp: new Date().toISOString()
      });
    }

    originalSend.call(res, data);
  };

  next();
};

module.exports = {
  rateLimiters,
  bruteForceProtection,
  bruteForceMiddleware,
  securityHeaders,
  sanitizeInput,
  preventSQLInjection,
  corsOptions,
  fileUploadSecurity,
  securityLogger
};