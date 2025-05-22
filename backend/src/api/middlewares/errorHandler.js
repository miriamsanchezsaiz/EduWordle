// src/api/middlewares/errorHandler.js

// Centralized error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('ERROR EN EL HANDLER:', err);  
  console.error(err.stack); // Log the error stack trace to the console
  
    const statusCode = err.statusCode || 500; // Use the error's status code or default to 500
    const message = err.message || 'Internal Server Error'; // Use the error's message or a generic one
  
    if (err.message && (err.message.includes('Email already exists') || err.message.includes('duplicate key') || err.message.includes('Duplicate entry') || err.constructor.name === 'SequelizeUniqueConstraintError')) {
      statusCode = 409;
      message = 'Email already in use';
    }

    res.status(statusCode).json({
      message: message,
      // In development, you might want to send the error stack for debugging:
      // stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
  };
  
  module.exports = errorHandler;