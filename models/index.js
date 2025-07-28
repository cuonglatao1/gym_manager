const { sequelize } = require('../config/database');

// Import models
const User = require('./User');
const RefreshToken = require('./RefreshToken');

// Setup associations
User.hasMany(RefreshToken, {
    foreignKey: 'userId',
    as: 'refreshTokens',
    onDelete: 'CASCADE'
});

RefreshToken.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

module.exports = {
    sequelize,
    User,
    RefreshToken
};