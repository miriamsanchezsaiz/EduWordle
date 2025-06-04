// src/api/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();
const ApiError = require('../../utils/ApiError');


const JWT_SECRET = process.env.JWT_SECRET;

// Middleware function to protect routes and authenticate users via JWT
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    throw ApiError.unauthorized('No token provided');
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT Verification Error:', err.message);
      throw ApiError.forbidden('Invalid or expired token');
    }

    req.user = user;
    next();
  });
};

// Middleware to check user role
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      throw ApiError.unauthorized('User not authenticated or role not found');
    }

    const userRole = req.user.role;

    if (allowedRoles.includes(userRole)) {
      next();
    } else {
      throw ApiError.forbidden('You do not have permission to access this resource');
    }
  };
};


module.exports = {
  authenticateJWT,
  authorizeRole
};