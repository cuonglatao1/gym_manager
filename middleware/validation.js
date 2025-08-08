// middleware/validation.js - Simple & Practical
const Joi = require('joi');
const { ValidationError } = require('./errorHandler');

// Simple validation middleware
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const message = error.details.map(detail => detail.message).join(', ');
            throw new ValidationError(message);
        }

        req.body = value;
        next();
    };
};

// Simple ID validation
const validateId = (req, res, next) => {
    const id = parseInt(req.params.id);
    if (!id || id <= 0) {
        throw new ValidationError('ID phải là số dương');
    }
    req.params.id = id;
    next();
};

// Member validation schemas (simplified)
const memberSchemas = {
    register: Joi.object({
        fullName: Joi.string().min(2).max(100).required()
            .messages({
                'string.min': 'Họ tên tối thiểu 2 ký tự',
                'any.required': 'Họ tên là bắt buộc'
            }),
        
        phone: Joi.string().pattern(/^[0-9]{10,11}$/).required()
            .messages({
                'string.pattern.base': 'Số điện thoại 10-11 chữ số',
                'any.required': 'Số điện thoại là bắt buộc'
            }),
        
        email: Joi.string().email().optional()
            .messages({
                'string.email': 'Email không hợp lệ'
            }),
        
        membershipId: Joi.number().integer().positive().optional(),
        dateOfBirth: Joi.date().max('now').optional(),
        gender: Joi.string().valid('male', 'female', 'other').optional(),
        address: Joi.string().max(500).optional(),
        emergencyContact: Joi.string().max(100).optional(),
        emergencyPhone: Joi.string().pattern(/^[0-9]{10,11}$/).optional(),
        notes: Joi.string().max(1000).optional()
    }),

    update: Joi.object({
        fullName: Joi.string().min(2).max(100).optional(),
        phone: Joi.string().pattern(/^[0-9]{10,11}$/).optional(),
        email: Joi.string().email().allow('').optional(),
        dateOfBirth: Joi.date().max('now').allow(null).optional(),
        gender: Joi.string().valid('male', 'female', 'other').allow(null).optional(),
        address: Joi.string().max(500).allow('').optional(),
        emergencyContact: Joi.string().max(100).allow('').optional(),
        emergencyPhone: Joi.string().pattern(/^[0-9]{10,11}$/).allow('').optional(),
        isActive: Joi.boolean().optional(),
        notes: Joi.string().max(1000).allow('').optional()
    }),

    purchaseMembership: Joi.object({
        membershipId: Joi.number().integer().positive().required()
            .messages({'any.required': 'Membership ID là bắt buộc'}),
        startDate: Joi.date().optional()
    })
};

// Membership validation schemas (simplified)
const membershipSchemas = {
    create: Joi.object({
        name: Joi.string().min(2).max(100).required()
            .messages({'any.required': 'Tên gói là bắt buộc'}),
        description: Joi.string().max(1000).optional(),
        duration: Joi.number().integer().min(1).max(365).required()
            .messages({'any.required': 'Thời hạn là bắt buộc'}),
        price: Joi.number().positive().required()
            .messages({'any.required': 'Giá là bắt buộc'}),
        benefits: Joi.array().items(Joi.string()).optional(),
        maxClasses: Joi.number().integer().min(0).allow(null).optional(),
        hasPersonalTrainer: Joi.boolean().default(false)
    }),

    update: Joi.object({
        name: Joi.string().min(2).max(100).optional(),
        description: Joi.string().max(1000).optional(),
        duration: Joi.number().integer().min(1).max(365).optional(),
        price: Joi.number().positive().optional(),
        benefits: Joi.array().items(Joi.string()).optional(),
        maxClasses: Joi.number().integer().min(0).allow(null).optional(),
        hasPersonalTrainer: Joi.boolean().optional(),
        isActive: Joi.boolean().optional()
    })
};

// Auth validation schemas (simplified)
const authSchemas = {
    login: Joi.object({
        email: Joi.string().email().required()
            .messages({'any.required': 'Email là bắt buộc'}),
        password: Joi.string().min(6).required()
            .messages({'any.required': 'Mật khẩu là bắt buộc'})
    }),

    register: Joi.object({
        username: Joi.string().alphanum().min(3).max(30).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        fullName: Joi.string().max(100).optional(),
        phone: Joi.string().pattern(/^[0-9]{10,11}$/).optional(),
        role: Joi.string().valid('admin', 'trainer', 'member').default('member')
    })
};

module.exports = {
    validate,
    validateId,
    memberSchemas,
    membershipSchemas,
    authSchemas
};