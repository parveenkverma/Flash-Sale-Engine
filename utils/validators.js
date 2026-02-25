let Joi = require("@hapi/joi");
const userRegistrationSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Name is required and cannot be empty',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters',
      'any.required': 'Name is required'
    }),

  email: Joi.string()
    .email()
    .trim()
    .max(255)
    .lowercase()
    .required()
    .messages({
      'string.empty': 'Email address is required',
      'string.email': 'Please enter a valid email address',
      'string.max': 'Email cannot exceed 255 characters',
      'any.required': 'Email address is required'
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'As part of our strong password policy, please use a password that includes at least 1 uppercase letter, 1 lowercase letter, and 1 number',
      'any.required': 'Password is required'
    }),
});
const purchaseOrder = Joi.object({
  product_id: Joi.string().required().messages({
    "any.required": `product_id is required`,
    "string.base": `product_id must be a string`,
    "string.empty": `product_id must be a string`,
  }),
  quantity: Joi.number().integer().min(1).required().messages({
    'any.required': `quantity is required`,
    'number.base': `quantity must be a number`,
    'number.min': `quantity must be at least 1`
  }),
})

const createProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Product name is required',
    'any.required': 'Product name is required'
  }),
  category: Joi.string().trim().required().messages({
    'string.empty': 'Category is required',
    'any.required': 'Category is required'
  }),
  price: Joi.number().positive().required().messages({
    'number.base': 'Price must be a number',
    'number.positive': 'Price must be positive',
    'any.required': 'Price is required'
  }),
  stock: Joi.number().integer().min(0).required().messages({
    'number.base': 'Stock must be a number',
    'number.min': 'Stock cannot be negative',
    'any.required': 'Stock is required'
  }),
  saleStartTime: Joi.date().required().messages({
    'date.base': 'saleStartTime must be a valid date',
    'any.required': 'saleStartTime is required'
  })
});

module.exports = {
  purchaseOrder,
  userRegistrationSchema,
  createProductSchema
}