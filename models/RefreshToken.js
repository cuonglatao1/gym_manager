const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RefreshToken = sequelize.define('RefreshToken', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    tokenHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'token_hash'
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,   
        
        field: 'expires_at'
    },
    isRevoked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_revoked'
    }
}, {
    tableName: 'refresh_tokens',
    timestamps: true,
    underscored: true,
    updatedAt: false
});

// Instance methods
RefreshToken.prototype.isExpired = function() {
    return new Date() > this.expiresAt;
};

RefreshToken.prototype.isValid = function() {
    return !this.isRevoked && !this.isExpired();
};

module.exports = RefreshToken;