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
            
            console.log('🔍 Login attempt:', email);

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email và password là bắt buộc'
                });
            }

            const result = await authService.login(email, password);
            
            console.log('✅ Login successful for:', email, 'Role:', result.user.role);

            res.json({
                success: true,
                message: 'Đăng nhập thành công',
                data: result
            });

        } catch (error) {
            console.error('❌ Login failed for:', req.body.email, 'Error:', error.message);
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
    },

    // DELETE /api/auth/users/:id
    deleteUser: async (req, res) => {
        try {
            const { id } = req.params;

            const result = await authService.deleteUser(id);

            res.json({
                success: true,
                message: result.message
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // PUT /api/auth/update-profile - Update user profile
    updateProfile: async (req, res) => {
        try {
            const { fullName, email } = req.body;
            const userId = req.user.userId;

            // Validate input
            if (!fullName || !email) {
                return res.status(400).json({
                    success: false,
                    message: 'Họ tên và email là bắt buộc'
                });
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Email không hợp lệ'
                });
            }

            const result = await authService.updateProfile(userId, { fullName, email });

            res.json({
                success: true,
                message: 'Cập nhật thông tin thành công',
                data: result
            });

        } catch (error) {
            if (error.message.includes('Email đã tồn tại')) {
                res.status(409).json({
                    success: false,
                    message: error.message
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: error.message
                });
            }
        }
    }
};

module.exports = authController;