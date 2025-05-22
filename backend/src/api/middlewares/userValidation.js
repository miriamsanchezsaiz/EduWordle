// src/api/middlewares/userValidation.js
const { body, validationResult } = require('express-validator');

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

  // Middleware to handle validation results and send errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];


//**********************************SOLO EN DESARROLLO O PRUEBAS*************************** */
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
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
//**********************************  NUNCA EN PRODUCCIÓN ******************************* */


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
    .optional({ nullable: true }) // endDate is optional and can be null
    .isDate()
    .withMessage('Invalid date format for end date')
    .custom((endDate, { req }) => { // Ensure endDate is after startDate if both are provided
      if (endDate && req.body.startDate && new Date(endDate) < new Date(req.body.startDate)) {
        throw new Error('End date must be on or after start date');
      }
      return true;
    }),
  body('studentEmails')
    .optional({ nullable: true }) // studentEmails list is optional
    .isArray() // It should be an array
    .withMessage('Student emails must be an array')
    .custom(emails => { // Custom validation for array elements
      if (emails && !emails.every(email => typeof email === 'string' && email.length > 0 && /^\S+@\S+\.\S+$/.test(email))) {
        throw new Error('Each entry in student emails must be a valid email string');
      }
      return true;
    }),

  // Middleware to handle validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Middleware for validating the update group request body (Teacher)
const validateUpdateGroup = [
  body('name')
    .optional() // Name is optional for update
    .notEmpty()
    .withMessage('Group name cannot be empty'),
  body('startDate')
    .optional() // Start date is optional for update
    .isDate()
    .withMessage('Invalid date format for start date'),
  body('endDate')
    .optional({ nullable: true }) // endDate is optional and can be null for update
    .isDate()
    .withMessage('Invalid date format for end date')
    .custom((endDate, { req }) => { // Ensure endDate is after startDate if both are provided
      // Need to consider if startDate is being updated or using the existing one
      // This validation might be better placed in the service layer
      return true; // Basic check for now
    }),
  body('addStudentEmails') // Emails to add
    .optional({ nullable: true })
    .isArray()
    .withMessage('Add student emails must be an array')
    .custom(emails => { // Custom validation for array elements
      if (emails && !emails.every(email => typeof email === 'string' && email.length > 0 && /^\S+@\S+\.\S+$/.test(email))) {
        throw new Error('Each entry in add student emails must be a valid email string');
      }
      return true;
    }),
  body('removeStudentIds') // IDs to remove
    .optional({ nullable: true })
    .isArray()
    .withMessage('Remove student IDs must be an array')
    .custom(ids => { // Custom validation for array elements
      if (ids && !ids.every(id => Number.isInteger(id) && id > 0)) {
        throw new Error('Each entry in remove student IDs must be a positive integer');
      }
      return true;
    }),

  // Middleware to handle validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Middleware for validating the create wordle request body (Teacher)
const validateCreateWordle = [
  body('name')
    .notEmpty()
    .withMessage('Wordle name is required'),

  body('word')
    .notEmpty()
    .withMessage('Word details are required'),
  body('word.title')
    .notEmpty()
    .withMessage('Word title is required'),
  body('word.hint')
    .optional() // Hint is optional
    .isString()
    .withMessage('Word hint must be a string'),

  body('questions')
    .notEmpty()
    .withMessage('Questions are required')
    .isArray({ min: 1 }) // Must be an array with at least one question
    .withMessage('Questions must be an array with at least one question'),
  body('questions.*.type')
    .notEmpty()
    .withMessage('Question type is required')
    // TODO-FIX: Validate against the specific allowed types
    .isIn(['single', 'multychoice']) // Allow only 'single' or 'multychoice'
    .withMessage('Question type must be "single" or "multychoice"'),
  body('questions.*.statement')
    .notEmpty()
    .withMessage('Question statement is required'),
  body('questions.*.answer')
    .notEmpty()
    .withMessage('Question answer is required'),
  body('questions.*.options')
    .optional() // Options are optional (only required for multychoice/singleselection)
    .isArray()
    .withMessage('Question options must be an array'),
  

  body('groupAccessIds')
    .optional() // Group access is optional
    .isArray()
    .withMessage('Group access IDs must be an array'),
  body('groupAccessIds.*')
    .optional() // Individual IDs are optional if the array is optional
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
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Middleware for validating the update wordle request body (Teacher)
const validateUpdateWordle = [
  body('name')
    .optional() // Name is optional for update
    .notEmpty()
    .withMessage('Wordle name cannot be empty'),
  body('word')
    .optional() // Word object is optional for update
    .exists().withMessage('Word details are required if updating word'),
  body('word.title')
    .optional()
    .notEmpty().withMessage('Word title cannot be empty if updating word'),
  body('word.hint')
    .optional({ nullable: true })
    .isString().withMessage('Word hint must be a string if updating word'),
  body('questions')
    .optional() // Questions array is optional for update
    .isArray({ min: 1 }).withMessage('Questions must be an array with at least one question if updating questions'),
  body('questions.*.id') // When updating questions, they might have an ID
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
    .custom(ids => { // Custom validation for array elements
      if (ids && !ids.every(id => Number.isInteger(id) && id > 0)) {
        throw new Error('Each entry in group access IDs must be a positive integer');
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
      return res.status(400).json({ errors: errors.array() });
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
    //Password strength validation
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters long')
    .matches(/[A-Z]/).withMessage('New password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('New password must contain at least one lowercase letter')
    .matches(/\d/).withMessage('New password must contain at least one number')
    .matches(/[<>_.,!@#$%^&*()\-\+=\[\]{}|\\;:'"/?]/).withMessage('New password must contain at least one special character'),
  
    // You might add a confirmNewPassword field and validation here too
  // body('confirmNewPassword')
  //   .notEmpty().withMessage('Confirm new password is required')
  //   .custom((value, { req }) => {
  //       if (value !== req.body.newPassword) {
  //           throw new Error('New passwords do not match');
  //       }
  //       return true;
  //   }),

  
  // Middleware to handle validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Middleware for validating the save game result request body (Student)
const validateSaveGameResult = [
  body('score')
    .notEmpty()
    .withMessage('Score is required')
    .isInt({ min: 0 }) // Score must be an integer and non-negative
    .withMessage('Score must be a non-negative integer'),
  // Add validation for other fields if you expect them in the body
  // body('attemptsTaken').optional().isInt({ min: 0 }).withMessage('Attempts taken must be a non-negative integer'),
  // body('isGuessed').optional().isBoolean().withMessage('isGuessed must be a boolean'),
  // body('startTime').optional().isISO8601().toDate().withMessage('Invalid start time format (use ISO 8601)'),
  // body('endTime').optional().isISO8601().toDate().withMessage('Invalid end time format (use ISO 8601)'),

  // Middleware to handle validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
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