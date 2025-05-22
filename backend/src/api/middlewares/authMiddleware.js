// src/api/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
// We don't strictly need userService here unless we fetch the full user object
// const userService = require('../services/userService');
require('dotenv').config(); // Load environment variables

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware function to protect routes and authenticate users via JWT
const authenticateJWT = (req, res, next) => { 
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // If token is invalid or expired, return 403 Forbidden (or 401 depending on preference)
      console.error('JWT Verification Error:', err.message);
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    // If token is valid, attach the decoded user payload to the request object
    req.user = user; // user object contains { id, email, role } from token payload
    next(); // Proceed to the next middleware or route handler
  });
};

// Middleware to check user role
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    // Assuming user role is attached to req.user by authenticateJWT
    if (!req.user || !req.user.role) {
      // This case should ideally be caught by authenticateJWT, but is a safeguard
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userRole = req.user.role;

    // --- DEBUGGING LOG ---
    console.log(`DEBUG: authorizeRole check for path ${req.path}. User ID: ${req.user.id}, Role: ${userRole}. Allowed roles: ${allowedRoles.join(', ')}`);
    // --- END DEBUGGING LOG ---


    // Check if the user's role is in the allowed roles list
    if (allowedRoles.includes(userRole)) {
      // User has the necessary role, proceed to the next middleware/controller
      next();
    } else {
      // User does not have the necessary role
      return res.status(403).json({ message: 'Access denied: Insufficient permissions' });
    }
  };
};


module.exports = {
  authenticateJWT,
  authorizeRole
};