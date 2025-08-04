const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Member = sequelize.define('Member', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'user_id',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    memberCode: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        field: 'member_code'
    },
    fullName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'full_name'
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    dateOfBirth: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'date_of_birth'
    },
    gender: {
        type: DataTypes.ENUM('male', 'female', 'other'),
        allowNull: true
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    emergencyContact: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'emergency_contact'
    },
    emergencyPhone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'emergency_phone'
    },
    joinDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'join_date'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'members',
    timestamps: true,
    underscored: true
});

Member.prototype.generateMemberCode = function() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `GM${year}${month}${random}`;
};

Member.beforeCreate(async (member) => {
    if (!member.memberCode) {
        let isUnique = false;
        while (!isUnique) {
            const code = member.generateMemberCode();
            const existing = await Member.findOne({ where: { memberCode: code } });
            if (!existing) {
                member.memberCode = code;
                isUnique = true;
            }
        }
    }
});

module.exports = Member;