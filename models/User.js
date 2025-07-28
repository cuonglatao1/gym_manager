const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'password_hash'
    },
    fullName: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'full_name'
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    role: {
        type: DataTypes.ENUM('admin', 'trainer', 'member'),
        defaultValue: 'member'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    }
}, {
    tableName: 'users',
    timestamps: true,
    underscored: true
});

// Instance methods
User.prototype.checkPassword = async function(password) {
    return await bcrypt.compare(password, this.passwordHash);
};

User.prototype.toJSON = function() {
    const user = this.get({ plain: true });
    delete user.passwordHash;
    return user;
};

// Class methods
User.findByEmail = function(email) {
    return this.findOne({ where: { email: email.toLowerCase() } });
};

User.findByUsername = function(username) {
    return this.findOne({ where: { username: username.toLowerCase() } });
};

module.exports = User;