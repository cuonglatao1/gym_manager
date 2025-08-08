// middleware/auth.js - Improved with real-time user validation
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { UnauthorizedError, ForbiddenError } = require('./errorHandler');
const asyncHandler = require('./asyncHandler');

// Middleware xác thực token với real-time user validation
const authenticate = asyncHandler(async (req, res, next) => {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Access token không được cung cấp');
    }

    const token = authHeader.substring(7); // Remove "Bearer "
    
    // Verify token
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'access-secret');
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new UnauthorizedError('Token đã hết hạn');
        } else if (error.name === 'JsonWebTokenError') {
            throw new UnauthorizedError('Token không hợp lệ');
        } else {
            throw new UnauthorizedError('Lỗi xác thực token');
        }
    }

    // Validate token type
    if (decoded.type !== 'access') {
        throw new UnauthorizedError('Token không hợp lệ');
    }

    // Real-time user validation - Check if user still exists and is active
    const currentUser = await User.findByPk(decoded.userId, {
        attributes: ['id', 'username', 'email', 'role', 'isActive']
    });

    if (!currentUser) {
        throw new UnauthorizedError('User không tồn tại');
    }

    if (!currentUser.isActive) {
        throw new UnauthorizedError('Tài khoản đã bị vô hiệu hóa');
    }

    // Check if user role has changed (optional security check)
    if (currentUser.role !== decoded.role) {
        throw new UnauthorizedError('Thông tin quyền đã thay đổi, vui lòng đăng nhập lại');
    }

    // Attach current user info to request
    req.user = {
        userId: currentUser.id,
        username: currentUser.username,
        email: currentUser.email,
        role: currentUser.role,
        isActive: currentUser.isActive
    };

    next();
});

// Middleware kiểm tra quyền với flexible role checking
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            throw new UnauthorizedError('Chưa xác thực');
        }

        // Check if user role is in allowed roles
        if (!allowedRoles.includes(req.user.role)) {
            throw new ForbiddenError('Không có quyền truy cập chức năng này');
        }

        next();
    };
};

// Middleware kiểm tra quyền sở hữu resource (owner or admin)
const authorizeOwnerOrAdmin = (getResourceOwnerId) => {
    return asyncHandler(async (req, res, next) => {
        if (!req.user) {
            throw new UnauthorizedError('Chưa xác thực');
        }

        // Admin có thể truy cập tất cả
        if (req.user.role === 'admin') {
            return next();
        }

        // Get resource owner ID
        const resourceOwnerId = await getResourceOwnerId(req);
        
        // Check if current user is the owner
        if (req.user.userId !== resourceOwnerId) {
            throw new ForbiddenError('Chỉ có thể truy cập tài nguyên của bạn');
        }

        next();
    });
};

// Middleware kiểm tra quyền member (member có thể truy cập thông tin của chính mình)
const authorizeMemberAccess = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        throw new UnauthorizedError('Chưa xác thực');
    }

    const { id } = req.params;

    // Admin và trainer có thể truy cập tất cả
    if (['admin', 'trainer'].includes(req.user.role)) {
        return next();
    }

    // Member chỉ có thể truy cập thông tin của chính mình
    if (req.user.role === 'member') {
        // Get member record to check if it belongs to current user
        const { Member } = require('../models');
        const member = await Member.findByPk(id);
        
        if (!member) {
            throw new NotFoundError('Không tìm thấy hội viên');
        }

        if (member.userId !== req.user.userId) {
            throw new ForbiddenError('Chỉ có thể truy cập thông tin của bạn');
        }
    }

    next();
});

// Middleware rate limiting theo user (optional)
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
    const requests = new Map();

    return (req, res, next) => {
        if (!req.user) {
            return next();
        }

        const userId = req.user.userId;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Get user's request history
        let userRequests = requests.get(userId) || [];
        
        // Filter out old requests
        userRequests = userRequests.filter(time => time > windowStart);
        
        // Check if user has exceeded limit
        if (userRequests.length >= max) {
            throw new ForbiddenError('Quá nhiều requests, vui lòng thử lại sau');
        }

        // Add current request
        userRequests.push(now);
        requests.set(userId, userRequests);

        // Clean up old entries periodically
        if (Math.random() < 0.01) { // 1% chance
            for (const [key, times] of requests.entries()) {
                const filteredTimes = times.filter(time => time > windowStart);
                if (filteredTimes.length === 0) {
                    requests.delete(key);
                } else {
                    requests.set(key, filteredTimes);
                }
            }
        }

        next();
    };
};

// Optional: Middleware to refresh user info in token periodically
const refreshUserInfo = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        return next();
    }

    // Only refresh if token is more than 5 minutes old
    const tokenIssuedAt = new Date(req.user.iat * 1000);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    if (tokenIssuedAt < fiveMinutesAgo) {
        // Refresh user info from database
        const currentUser = await User.findByPk(req.user.userId, {
            attributes: ['id', 'username', 'email', 'role', 'isActive']
        });

        if (currentUser && currentUser.isActive) {
            req.user = {
                ...req.user,
                username: currentUser.username,
                email: currentUser.email,
                role: currentUser.role,
                isActive: currentUser.isActive
            };
        }
    }

    next();
});

module.exports = {
    authenticate,
    authorize,
    authorizeOwnerOrAdmin,
    authorizeMemberAccess,
    createRateLimiter,
    refreshUserInfo
};