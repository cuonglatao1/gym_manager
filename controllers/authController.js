const authService = require('../services/authService');

const authController = {
    // POST /api/auth/register
    register: async (req, res) => {
        try {
            const { username, email, password, fullName, phone, role } = req.body;

            // Validate input
            if (!username || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Username, email và password là bắt buộc'
                });
            }

            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password phải có ít nhất 6 ký tự'
                });
            }

            const result = await authService.register({
                username, email, password, fullName, phone, role
            });

            res.status(201).json({
                success: true,
                message: 'Đăng ký thành công',
                data: result
            });

        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    // POST /api/auth/login
    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email và password là bắt buộc'
                });
            }

            const result = await authService.login(email, password);

            res.json({
                success: true,
                message: 'Đăng nhập thành công',
                data: result
            });

        } catch (error) {
            res.status(401).json({
                success: false,
                message: error.message
            });
        }
    },

    // POST /api/auth/refresh
    refreshToken: async (req, res) => {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({
                    success: false,
                    message: 'Refresh token là bắt buộc'
                });
            }

            const result = await authService.refreshToken(refreshToken);

            res.json({
                success: true,
                message: 'Token được làm mới thành công',
                data: result
            });

        } catch (error) {
            res.status(401).json({
                success: false,
                message: error.message
            });
        }
    },

    // POST /api/auth/logout
    logout: async (req, res) => {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({
                    success: false,
                    message: 'Refresh token là bắt buộc'
                });
            }

            const result = await authService.logout(refreshToken);

            res.json({
                success: true,
                message: result.message
            });

        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    // GET /api/auth/me
    getProfile: async (req, res) => {
        try {
            // req.user được set bởi auth middleware
            const { User } = require('../models');
            const user = await User.findByPk(req.user.userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy user'
                });
            }

            res.json({
                success: true,
                data: user.toJSON()
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
};

module.exports = authController;