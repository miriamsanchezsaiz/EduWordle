// src/api/controllers/authController.js
const {
  userService,
  authService
} = require('../services');
const { validationResult } = require('express-validator'); 
require('dotenv').config();
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('express-async-handler');



const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ApiError.badRequest('Validation failed', errors.array());
  }

  const { email, password } = req.body;

  const { token, user, requiresPasswordChange } = await authService.login(email, password);
  res.status(200).json({ token, user, requiresPasswordChange });

});

// Controller function for handling user logout requests

const logout = (req, res) => {
  
  res.status(200).json({ message: 'Logout successful' });
};

/************************SOLO TEST********************** */

// Controller function for creating a user (for testing/dev ONLY)
const createUser = asyncHandler(async (req, res, next) => {
  // !!! SECURITY CHECK: Only allow this endpoint in non-production environments !!!
  if (process.env.NODE_ENV === 'production') {
    throw ApiError.forbidden('This endpoint is not available in production environment.');
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ApiError.badRequest('Validation failed', errors.array());
  }

  const { name, email, password, role } = req.body;
  const newUser = await userService.createUser(email, name, password, role);

  // --- DEBUGGING LOGS ---
  console.log('DEBUG: Value returned by userService.createUser:', newUser);
  console.log('DEBUG: Type of value returned:', typeof newUser);
  console.log('DEBUG: Is value null?', newUser === null);
  console.log('DEBUG: Is value undefined?', newUser === undefined);
  console.log('DEBUG: Does value have toJSON method?', typeof newUser === 'object' && newUser !== null && typeof newUser.toJSON === 'function');
  // --- END DEBUGGING LOGS ---

  if (!newUser || typeof newUser.toJSON !== 'function') {
    console.error('DEBUG: userService.createUser did NOT return a valid Sequelize model instance as expected.');
    throw ApiError.internal('Internal server error: Failed to process user creation result.');
  }

  
  const { password: _, ...userInfo } = newUser.toJSON();
  res.status(201).json(userInfo);


});

module.exports = {
  login,
  logout,
  createUser,
};