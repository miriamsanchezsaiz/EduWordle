// src/api/controllers/authController.js
const {
  userService,
  authService
} = require('../services');
const { validationResult } = require('express-validator'); // To handle validation results
require('dotenv').config();



// Controller function for handling user login requests
const login = async (req, res) => {
  // Check for validation errors from request body middleware (like the one you proposed)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Extract email and password from the request body
  const { email, password } = req.body;

  try {
    // Call the auth service to perform the login logic
    const { token, user } = await authService.login(email, password);

    // If login is successful, send the token and user info in the response
    res.status(200).json({ token, user });

  } catch (error) {
    // Handle specific errors from the authService
    if (error.message === 'User not found' || error.message === 'Invalid credentials') {
      // Return 401 Unauthorized for authentication failures
      res.status(401).json({ message: 'Invalid credentials' });
    } else {
      // Handle other potential errors (e.g., database errors)
      console.error('Error in login controller:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

// Controller function for handling user logout requests
// For a stateless JWT-based API, logout is typically handled client-side
// by discarding the token. This endpoint can simply confirm logout.
const logout = (req, res) => {
  // In a stateful session-based API, you would destroy the session here.
  // With JWTs, the token is usually invalidated on the client.
  // If you needed server-side token invalidation (e.g., blocklisting),
  // you would implement that logic here.
  // For a basic implementation, simply return a success response.
  res.status(200).json({ message: 'Logout successful' });
};

/************************SOLO TEST********************** */

// Controller function for creating a user (for testing/dev ONLY)
const createUser = async (req, res, next) => {
  // !!! SECURITY CHECK: Only allow this endpoint in non-production environments !!!
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'This endpoint is not available in production' });
  }

  // Check for validation errors from the validateCreateUser middleware
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Extract user data from the validated request body
  const { name, email, password, role } = req.body;

  try {
    // Call the userService function to create the user
    const newUser = await userService.createUser(email, name, password, role);

    // --- DEBUGGING LOGS ---
    console.log('DEBUG: Value returned by userService.createUser:', newUser);
    console.log('DEBUG: Type of value returned:', typeof newUser);
    console.log('DEBUG: Is value null?', newUser === null);
    console.log('DEBUG: Is value undefined?', newUser === undefined);
    console.log('DEBUG: Does value have toJSON method?', typeof newUser === 'object' && newUser !== null && typeof newUser.toJSON === 'function');
    // --- END DEBUGGING LOGS ---

    // Add a defensive check before calling toJSON()
    if (!newUser || typeof newUser.toJSON !== 'function') {
      console.error('DEBUG: userService.createUser did NOT return a valid Sequelize model instance as expected.');
      // If the user was created in the DB but the return value is wrong,
      // this indicates an internal service/model issue.
      // We can still return *some* info if newUser is a plain object,
      // but let's throw an error for now to highlight the unexpected return type.
      throw new Error('Internal server error: Failed to process user creation result.');
    }

    // Respond with the created user data (excluding password)
    // Use toJSON() to get a plain object and destructure to exclude password
    const { password: _, ...userInfo } = newUser.toJSON();
    res.status(201).json(userInfo);

  } catch (error) {
    console.error('Error in createUser controller:', error);
    console.log('DEBUG: Error message:', error.message);


    if (error.message === 'Email already in use') { // Cambio a una comparación estricta
      console.log('DEBUG: Correo electrónico duplicado DETECTADO Y RESPUESTA ENVIADA.');
      return res.status(409).json({ message: 'Email already in use' });
    }
    
    if (error.message.includes('Failed to process user creation result.')) {
      return res.status(500).json({ message: error.message });
    }

    next(error); // Pass other errors to the error handler
  }
};

module.exports = {
  login,
  logout,
  createUser,
};