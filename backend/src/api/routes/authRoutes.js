// src/api/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController'); 

// Assuming your validation middleware is in /backend/src/api/middlewares/userValidation.js
// and exports validateLogin
const {
  validateLogin,
  validateCreateUser
} = require('../middlewares/userValidation');

// Route for user login
// POST /api/auth/login
router.post('/login',
  validateLogin, // Apply validation middleware first
  authController.login // Then call the login controller function
);

// Route for user logout
// POST /api/auth/logout
router.post('/logout',
  // For stateless JWT, logout doesn't need validation or specific auth middleware
  // unless you implement server-side token invalidation (e.g., blocklisting)
  authController.logout
);


//*******************************SOLO TEST ************************ */
// Route for creating a user (for testing/dev ONLY)
// POST /api/auth/create-user
// This endpoint should NOT be available in production environments
router.post('/create-user',
  validateCreateUser, // Apply validation middleware
  authController.createUser // Call the controller function
);



module.exports = router;