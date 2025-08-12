const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, RefreshToken } = require('../models');

class AuthService {
    // Đăng ký
    async register(userData) {
        const { username, email, password, fullName, phone, role = 'member' } = userData;

        // Kiểm tra user đã tồn tại
        const existingUser = await User.findOne({
            where: {
                [require('sequelize').Op.or]: [
                    { email: email.toLowerCase() },
                    { username: username.toLowerCase() }
                ]
            }
        });

        if (existingUser) {
            throw new Error('Email hoặc username đã được sử dụng');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Tạo user mới
        const user = await User.create({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            passwordHash,
            fullName,
            phone,
            role
        });

        // Tạo tokens
        const tokens = await this.generateTokens(user);

        return {
            user: user.toJSON(),
            ...tokens
        };
    }

    // Đăng nhập
    async login(email, password) {
        // Tìm user
        const user = await User.findByEmail(email);
        if (!user || !user.isActive) {
            throw new Error('Email hoặc mật khẩu không đúng');
        }

        // Kiểm tra password
        const isValidPassword = await user.checkPassword(password);
        if (!isValidPassword) {
            throw new Error('Email hoặc mật khẩu không đúng');
        }

        // Tạo tokens
        const tokens = await this.generateTokens(user);

        return {
            user: user.toJSON(),
            ...tokens
        };
    }

    // Tạo token pair
    async generateTokens(user) {
        // Access token (2 phút for testing)
        const accessToken = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role,
                type: 'access'
            },
            process.env.JWT_ACCESS_SECRET || 'access-secret',
            { expiresIn: '2m' }
        );

        // Refresh token (7 ngày)
        const refreshToken = crypto.randomBytes(64).toString('hex');
        const tokenHash = await bcrypt.hash(refreshToken, 10);

        // Lưu refresh token
        await RefreshToken.create({
            userId: user.id,
            tokenHash,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 ngày
        });

        return {
            accessToken,
            refreshToken,
            expiresIn: 120 // 2 phút for testing
        };
    }

    // Refresh token
    async refreshToken(refreshToken) {
        // Tìm tất cả token hợp lệ
        const tokens = await RefreshToken.findAll({
            where: { 
                isRevoked: false,
                expiresAt: { [require('sequelize').Op.gt]: new Date() }
            },
            include: [{ model: User, as: 'user' }]
        });

        // Kiểm tra token hash
        let validToken = null;
        for (const token of tokens) {
            const isValid = await bcrypt.compare(refreshToken, token.tokenHash);
            if (isValid) {
                validToken = token;
                break;
            }
        }

        if (!validToken) {
            throw new Error('Refresh token không hợp lệ');
        }

        // Tạo access token mới
        const accessToken = jwt.sign(
            {
                userId: validToken.userId,
                email: validToken.user.email,
                role: validToken.user.role,
                type: 'access'
            },
            process.env.JWT_ACCESS_SECRET || 'access-secret',
            { expiresIn: '2m' }
        );

        return {
            accessToken,
            refreshToken, // Giữ nguyên refresh token
            expiresIn: 120 // 2 phút for testing
        };
    }

    // Đăng xuất
    async logout(refreshToken) {
        // Tìm và vô hiệu hóa refresh token
        const tokens = await RefreshToken.findAll({
            where: { isRevoked: false }
        });

        for (const token of tokens) {
            const isValid = await bcrypt.compare(refreshToken, token.tokenHash);
            if (isValid) {
                await token.update({ isRevoked: true });
                break;
            }
        }

        return { message: 'Đăng xuất thành công' };
    }

    // Verify access token
    verifyAccessToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'access-secret');
            if (decoded.type !== 'access') {
                throw new Error('Token không hợp lệ');
            }
            return decoded;
        } catch (error) {
            throw new Error('Token không hợp lệ hoặc đã hết hạn');
        }
    }

    async deleteUser(userId) {
        // Check if user exists
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error('Không tìm thấy người dùng');
        }

        // Prevent deleting admin user
        if (user.role === 'admin') {
            throw new Error('Không thể xóa tài khoản quản trị viên');
        }

        // Check if user has associated member record
        const { Member } = require('../models');
        const member = await Member.findOne({ where: { userId: userId } });
        
        if (member) {
            // If user has member record, soft delete both
            await member.update({ 
                isActive: false,
                email: `deleted_${member.id}_${member.email}`,
                memberCode: `DELETED_${member.memberCode}`
            });
        }

        // Soft delete user account
        await user.update({ 
            isActive: false,
            email: `deleted_${user.id}_${user.email}`,
            username: `deleted_${user.id}_${user.username}`
        });

        // Remove refresh tokens
        await RefreshToken.destroy({
            where: { userId: userId }
        });

        return {
            message: 'Xóa người dùng thành công'
        };
    }

    // Update user profile
    async updateProfile(userId, profileData) {
        const { fullName, email } = profileData;

        // Check if user exists
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error('Không tìm thấy người dùng');
        }

        // Check if email already exists for another user
        if (email && email !== user.email) {
            const existingUser = await User.findOne({
                where: {
                    email: email.toLowerCase(),
                    id: { [require('sequelize').Op.ne]: userId } // Exclude current user
                }
            });

            if (existingUser) {
                throw new Error('Email đã tồn tại trong hệ thống');
            }
        }

        // Update user profile
        const updatedUser = await user.update({
            fullName: fullName || user.fullName,
            email: email ? email.toLowerCase() : user.email
        });

        // Return updated user without sensitive data
        return {
            id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
            fullName: updatedUser.fullName,
            phone: updatedUser.phone,
            role: updatedUser.role,
            isActive: updatedUser.isActive
        };
    }
}

module.exports = new AuthService();