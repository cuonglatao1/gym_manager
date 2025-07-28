const authService = require('../services/authService');

// Middleware xác thực token
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access token không được cung cấp'
            });
        }

        const token = authHeader.substring(7); // Bỏ "Bearer "
        const decoded = authService.verifyAccessToken(token);
        
        req.user = decoded;
        next();

    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Token không hợp lệ'
        });
    }
};

// Middleware kiểm tra quyền
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Chưa xác thực'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền truy cập'
            });
        }

        next();
    };
};

module.exports = {
    authenticate,
    authorize
};