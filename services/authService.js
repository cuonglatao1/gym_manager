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
        // Access token (15 phút)
        const accessToken = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role,
                type: 'access'
            },
            process.env.JWT_ACCESS_SECRET || 'access-secret',
            { expiresIn: '15m' }
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
            expiresIn: 900 // 15 phút
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
            { expiresIn: '15m' }
        );

        return {
            accessToken,
            refreshToken, // Giữ nguyên refresh token
            expiresIn: 900
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
}

module.exports = new AuthService();