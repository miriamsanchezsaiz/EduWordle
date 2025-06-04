// src/api/middlewares/errorHandler.js
const ApiError = require('../../utils/ApiError');
const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');

const errorHandler = (err, req, res, next) => {
  console.error('--- ERROR CAUGHT BY CENTRALIZED HANDLER ---');
  console.error('Error Message:', err.message);
  console.error('Error Status Code:', err.statusCode || 'N/A');
  console.error('Error Details:', err.details || 'N/A');
  console.error('Error Stack:', err.stack);
  console.error('-------------------------------------------');

  let error = err; 

  // --- Handle specific error types ---

  // 1. Handle custom ApiError instances
  if (error instanceof ApiError) {
    
  }

  // 2. Handle Sequelize Validation Errors (e.g., failed `notNull` or `isEmail` checks)
  else if (error instanceof ValidationError) {
    const messages = error.errors.map(e => e.message);
    error = ApiError.badRequest('Validation failed', messages);
  }
  // 3. Handle Sequelize Unique Constraint Errors (e.g., duplicate email)
  else if (error instanceof UniqueConstraintError) {

    const field = Object.keys(error.fields)[0];
    const value = error.fields[field];
    error = ApiError.conflict(`The ${field} '${value}' is already in use.`);
  }
  // 4. Handle Sequelize Foreign Key Constraint Errors
  else if (error instanceof ForeignKeyConstraintError) {
    error = ApiError.badRequest('Related record not found or cannot be deleted due to existing dependencies.');
  }
  // 5. Handle JWT errors (e.g., invalid token, expired token)
  else if (error.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid token. Please log in again.');
  } else if (error.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Token expired. Please log in again.');
  }
  // 6. Handle other generic errors that were not caught by specific types
  else {
    
    if (process.env.NODE_ENV === 'production') {
      error = ApiError.internal('Internal Server Error');
    } else {
      error = ApiError.internal(error.message || 'Internal Server Error', error.stack ? [{ stack: error.stack }] : []);
    }
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  const details = error.details || []; 

  res.status(statusCode).json({
    status: 'error', 
    statusCode: statusCode,
    message: message,
    ...(details.length > 0 && { details: details }), 
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  });
};
  
  module.exports = errorHandler;