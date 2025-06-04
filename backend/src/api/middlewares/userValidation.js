// src/api/middlewares/userValidation.js
const { body, validationResult } = require('express-validator');
const ApiError = require('../../utils/ApiError');


// Middleware for validating the login request body
const validateLogin = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw ApiError.badRequest('Validation failed', errors.array());
    }
    next();
  }
];


// Middleware for validating the create user request body (for testing/dev)
const validateCreateUser = [
  body('name')
    .notEmpty()
    .withMessage('Name is required'),
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['student', 'teacher']).withMessage('Role must be either "student" or "teacher"'), // Ensure valid roles

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw ApiError.badRequest('Validation failed', errors.array());
    }
    next();
  }
];


// Middleware for validating the create group request body (Teacher)
const validateCreateGroup = [
  body('name')
    .notEmpty()
    .withMessage('Group name is required'),
  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isDate()
    .withMessage('Invalid date format for start date'),
  body('endDate')
    .optional({ nullable: true })
    .isDate()
    .withMessage('Invalid date format for end date')
    .custom((endDate, { req }) => {
      if (endDate && req.body.startDate && new Date(endDate) < new Date(req.body.startDate)) {
        throw ApiError.badRequest('End date must be after start date');
      }
      return true;
    }),
  body('studentEmails')
    .optional({ nullable: true })
    .isArray()
    .withMessage('Student emails must be an array')
    .custom(emails => {
      if (emails && !emails.every(email => typeof email === 'string' && email.length > 0 && /^\S+@\S+\.\S+$/.test(email))) {
        throw ApiError.badRequest('Each entry in student emails must be a valid email string');
      }
      return true;
    }),

  // Middleware to handle validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw ApiError.badRequest('Validation failed', errors.array());
    }
    next();
  }
];

// Middleware for validating the update group request body (Teacher)
const validateUpdateGroup = [
  body('name')
    .optional()
    .notEmpty()
    .withMessage('Group name cannot be empty'),
  body('startDate')
    .optional()
    .isDate()
    .withMessage('Invalid date format for start date'),
  body('endDate')
    .optional({ nullable: true })
    .isDate()
    .withMessage('Invalid date format for end date')
    .custom((endDate, { req }) => {
      return true;
    }),
  body('addStudentEmails')
    .optional({ nullable: true })
    .isArray()
    .withMessage('Add student emails must be an array')
    .custom(emails => {
      if (emails && !emails.every(email => typeof email === 'string' && email.length > 0 && /^\S+@\S+\.\S+$/.test(email))) {
        throw ApiError.badRequest('Each entry in add student emails must be a valid email string');
      }
      return true;
    }),
  body('removeStudentIds')
    .optional({ nullable: true })
    .isArray()
    .withMessage('Remove student IDs must be an array')
    .custom(ids => {
      if (ids && !ids.every(id => Number.isInteger(id) && id > 0)) {
        throw ApiError.badRequest('Each entry in remove student IDs must be a positive integer');
      }
      return true;
    }),

  // Middleware to handle validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw ApiError.badRequest('Validation failed', errors.array());
    }
    next();
  }
];

// Middleware for validating the create wordle request body (Teacher)
const validateCreateWordle = [
  body('name')
    .notEmpty()
    .withMessage('Wordle name is required'),

  body('words')
    .notEmpty()
    .withMessage('Word details are required')
    .isArray({ min: 1 })
    .withMessage('Words must be an array with at least one word'),
  body('words.*.word')
    .notEmpty()
    .withMessage('Word title is required'),
  body('words.*.hint')
    .optional()
    .isString()
    .withMessage('Word hint must be a string'),

  body('questions')
    .notEmpty()
    .withMessage('Questions are required')
    .isArray({ min: 1 })
    .withMessage('Questions must be an array with at least one question'),
  body('questions.*.type')
    .notEmpty()
    .withMessage('Question type is required')
    // TODO-FIX: Validate against the specific allowed types
    .isIn(['single', 'multychoice']) // Allow only 'single' or 'multychoice'
    .withMessage('Question type must be "single" or "multychoice"'),
  body('questions.*.question')
    .notEmpty()
    .withMessage('Question statement is required'),
  body('questions.*.correctAnswer')
    .notEmpty()
    .withMessage('Question answer is required'),
  body('questions.*.options')
    .notEmpty()
    .withMessage('Question options are required')
    .isArray()
    .withMessage('Question options must be an array'),


  body('groupAccessIds')
    .optional()
    .isArray()
    .withMessage('Group access IDs must be an array'),
  body('groupAccessIds.*')
    .optional()
    .isInt({ gt: 0 })
    .withMessage('Group access IDs must be positive integers'),

  body('difficulty')
    .notEmpty()
    .withMessage('Difficulty is required')
    .isIn(['low', 'high'])
    .withMessage('Difficulty must be one of: low, high'),

  // Middleware to handle validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw ApiError.badRequest('Validation failed', errors.array());
    }
    next();
  }
];

// Middleware for validating the update wordle request body (Teacher)
const validateUpdateWordle = [
  body('name')
    .optional()
    .notEmpty()
    .withMessage('Wordle name cannot be empty'),
  body('word')
    .optional()
    .exists().withMessage('Word details are required if updating word'),
  body('word.title')
    .optional()
    .notEmpty().withMessage('Word title cannot be empty if updating word'),
  body('word.hint')
    .optional({ nullable: true })
    .isString().withMessage('Word hint must be a string if updating word'),
  body('questions')
    .optional()
    .isArray({ min: 1 }).withMessage('Questions must be an array with at least one question if updating questions'),
  body('questions.*.id')
    .optional()
    .isInt({ gt: 0 }).withMessage('Question ID must be a positive integer'),
  body('questions.*.type')
    .optional().notEmpty().withMessage('Question type cannot be empty if updating'),
  body('questions.*.statement')
    .optional().notEmpty().withMessage('Question statement cannot be empty if updating'),
  body('questions.*.answer')
    .optional().notEmpty().withMessage('Question answer cannot be empty if updating'),
  body('questions.*.options')
    .optional({ nullable: true }).isArray().withMessage('Question options must be an array if updating'),

  body('groupAccessIds')
    .optional({ nullable: true })
    .isArray().withMessage('Group access IDs must be an array')
    .custom(ids => {
      if (ids && !ids.every(id => Number.isInteger(id) && id > 0)) {
        throw ApiError.badRequest('Each entry in group access IDs must be a positive integer');
      }
      return true;
    }),

  body('difficulty')
    .notEmpty()
    .withMessage('Difficulty is required')
    .isIn(['low', 'high'])
    .withMessage('Difficulty must be one of: low, high'),


  // Middleware to handle validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw ApiError.badRequest('Validation failed', errors.array());
    }
    next();
  }
];

// Middleware for validating the change password request body (Student & Teacher)
const validateChangePassword = [
  body('oldPassword')
    .notEmpty().withMessage('Old password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters long')
    .matches(/[A-Z]/).withMessage('New password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('New password must contain at least one lowercase letter')
    .matches(/\d/).withMessage('New password must contain at least one number')
    .matches(/[<>_.,!@#$%^&*()\-\+=\[\]{}|\\;:'"/?]/).withMessage('New password must contain at least one special character'),


  // Middleware to handle validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw ApiError.badRequest('Validation failed', errors.array());
    }
    next();
  }
];

// Middleware for validating the save game result request body (Student)
const validateSaveGameResult = [
  body('score')
    .notEmpty()
    .withMessage('Score is required')
    .isInt({ min: 0 })
    .withMessage('Score must be a non-negative integer'),

  // Middleware to handle validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw ApiError.badRequest('Validation failed', errors.array());
    }
    next();
  }
];





module.exports = {
  validateLogin,
  validateCreateUser,
  validateCreateGroup,
  validateUpdateGroup,
  validateCreateWordle,
  validateUpdateWordle,
  validateChangePassword,
  validateSaveGameResult,
};