const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, RefreshToken } = require('../models');

class AuthService {
    // Đăng ký
    async register(userData) {
        const { email, password, fullName, phone, role = 'member', dateOfBirth, gender, address } = userData;

        // Tạo username từ email (phần trước @)
        const username = email.split('@')[0].toLowerCase();

        // Kiểm tra user đã tồn tại
        const existingUser = await User.findOne({
            where: {
                [require('sequelize').Op.or]: [
                    { email: email.toLowerCase() },
                    { username: username }
                ]
            }
        });

        if (existingUser) {
            throw new Error('Email đã được sử dụng');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Tạo user mới
        const user = await User.create({
            username: username,
            email: email.toLowerCase(),
            passwordHash,
            fullName,
            phone,
            role
        });

        // Tạo Member record cho cả member và trainer  
        let member = null;
        if (role === 'member' || role === 'trainer') {
            try {
                const { Member } = require('../models');
                const memberService = require('./memberService');
                
                console.log('🏃‍♂️ Creating member record for user ID:', user.id);
                
                // Generate member code
                const memberCode = await memberService.generateMemberCode();
                
                member = await Member.create({
                    userId: user.id,
                    memberCode,
                    fullName,
                    phone,
                    email: email.toLowerCase(),
                    dateOfBirth: dateOfBirth || null,
                    gender: gender || null,
                    address: address || null
                });
                
                console.log('✅ Member record created:', member.memberCode);
            } catch (memberError) {
                console.error('❌ Error creating member record:', memberError);
                // Don't fail the whole registration if member creation fails
                // but log the error for debugging
            }
        }

        // Tạo tokens
        const tokens = await this.generateTokens(user);

        const result = {
            user: user.toJSON(),
            ...tokens
        };

        // Thêm thông tin member nếu có
        if (member) {
            result.member = member.toJSON();
        }

        return result;
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

        const result = {
            user: user.toJSON(),
            ...tokens
        };

        // Thêm thông tin member nếu có
        if (user.role === 'member' || user.role === 'trainer') {
            try {
                const { Member } = require('../models');
                const member = await Member.findOne({ where: { userId: user.id } });
                if (member) {
                    result.user.member = member.toJSON();
                }
            } catch (error) {
                console.warn('Warning: Could not load member info for user:', user.id);
            }
        }

        return result;
    }

    // Tạo token pair
    async generateTokens(user) {
        // Access token (1 giờ)
        const accessToken = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role,
                type: 'access'
            },
            process.env.JWT_ACCESS_SECRET || 'access-secret',
            { expiresIn: '1h' }
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
            expiresIn: 3600 // 1 giờ
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
            { expiresIn: '1h' }
        );

        return {
            accessToken,
            refreshToken, // Giữ nguyên refresh token
            expiresIn: 3600 // 1 giờ
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
        const { fullName, email, phone } = profileData;

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
            email: email ? email.toLowerCase() : user.email,
            phone: phone !== undefined ? phone : user.phone
        });

        // Also update Member table if user is a member or trainer
        if (user.role === 'member' || user.role === 'trainer') {
            const { Member } = require('../models');
            // Try to find member/trainer by userId first, then by email as fallback
            let member = await Member.findOne({ where: { userId: userId } });
            if (!member) {
                member = await Member.findOne({ where: { email: user.email } });
            }
            
            if (member) {
                await member.update({
                    fullName: fullName || member.fullName,
                    email: email ? email.toLowerCase() : member.email,
                    phone: phone !== undefined ? phone : member.phone
                });
                console.log(`✅ ${user.role === 'trainer' ? 'Trainer' : 'Member'} ${member.memberCode} synced with User data`);
            } else {
                console.log(`⚠️ ${user.role === 'trainer' ? 'Trainer' : 'Member'} record not found for User ID ${userId}`);
            }
        }

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

    // Change user password
    async changePassword(userId, currentPassword, newPassword) {
        // Get user
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error('Không tìm thấy người dùng');
        }

        // Check current password
        const isValidPassword = await user.checkPassword(currentPassword);
        if (!isValidPassword) {
            throw new Error('Mật khẩu hiện tại không đúng');
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 12);

        // Update password
        await user.update({ passwordHash: newPasswordHash });

        // Revoke all refresh tokens to force re-login on other devices
        await RefreshToken.update(
            { isRevoked: true },
            { where: { userId: userId } }
        );

        return {
            message: 'Đổi mật khẩu thành công'
        };
    }
}

module.exports = new AuthService();