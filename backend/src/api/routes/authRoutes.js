// src/api/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController'); 

const {
  validateLogin,
  validateCreateUser
} = require('../middlewares/userValidation');

// Route for user login
// POST /api/auth/login
router.post('/login',
  validateLogin, 
  authController.login 
);

// Route for user logout
// POST /api/auth/logout
router.post('/logout',
  authController.logout
);


//*******************************SOLO TEST ************************ */
// Route for creating a user (for testing/dev ONLY)
// POST /api/auth/create-user
// This endpoint should NOT be available in production environments
router.post('/create-user',
  validateCreateUser,
  authController.createUser 
);



module.exports = router;