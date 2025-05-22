// src/api/services/authService.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const userService = require('./userService'); // Import the user service
const { isStrongPassword } = require('../../utils/passwordUtils'); 


require('dotenv').config(); // Load environment variables




const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION_TIME = process.env.JWT_EXPIRATION_TIME;

// Function to handle user login
const login = async (email, password) => {
  try {
    // 1. Find the user by email using the userService (searches both tables)
    console.log('DEBUG (login): Email recibido:', email);
    const userResult = await userService.findUserByEmail(email);

    if (!userResult) {
      // If user not found in either table
      console.log('DEBUG (login): Usuario no encontrado para el email:', email); 

      throw new Error('User not found'); // Or a more generic "Invalid credentials"
    }

    const user = userResult.get({ plain: true });
    const role = user.role; 

    if (!user.password) {
      console.debug(`User found but password is null or undefined for email: ${email}`);
      throw new Error('Invalid credentials'); // Treat as invalid credentials if password is missing
    }
    // 2. Compare the provided password with the hashed password from the database
    let hashedPassword = await bcrypt.hash(password, 10);
    console.log('DEBUG (login): AFTER Contraseña hashada proporcionada:', hashedPassword); 
    console.log('DEBUG (login): AFTER Contraseña hasheada del usuario:', user.password);
        
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    console.log('DEBUG (login): Resultado de bcrypt.compare:', isPasswordValid);

    if (!isPasswordValid) {
      // If password does not match
      console.log('DEBUG (login): Contraseña inválida para el email:', email);
      throw new Error('Invalid credentials');
    }

    // 3. If credentials are valid, check if the password is the initial weak password, then force change
    let requiresPasswordChange = false;
    if (!isStrongPassword(password)) {
        requiresPasswordChange = true;
    }
    
    // 4. If it is, generate a JSON Web Token (JWT)
    // The payload of the token should contain information to identify the user
    // in subsequent requests, but NOT sensitive data like the password.
    const payload = {
      id: user.id,
      email: user.email,
      role: role,
    };

    // Ensure JWT_SECRET and JWT_EXPIRATION_TIME are defined before signing
    if (!JWT_SECRET) {
      console.debug("JWT_SECRET is not defined in environment variables!");
      throw new Error("Server configuration error: JWT secret missing.");
    }
    if (!JWT_EXPIRATION_TIME) {
      console.debug("JWT_EXPIRATION_TIME is not defined in environment variables!");
      // Provide a default or throw a configuration error
      // For now, let's throw an error as it's a configuration issue
      throw new Error("Server configuration error: JWT expiration time missing.");
    }

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRATION_TIME 
    });

    // 5. Return the token and basic user info (without password)
    const { password: userPassword, ...userInfo } = user; // Exclude password
    return { token, user: { ...userInfo, role: role }, requiresPasswordChange };

  } catch (error) {
    console.debug('Error during login in authService:', error.message);
    
    throw error;
  }
};

// Function to verify a JWT (used by authMiddleware)
// Although the authMiddleware will likely use jwt.verify directly,
// having a function here is good for completeness or if you need
// more complex token validation logic in the future.
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded; // Returns the payload if token is valid
  } catch (error) {
    console.debug('Token verification failed:', error.message);
    throw new Error('Invalid or expired token');
  }
};


module.exports = {
  login,
  verifyToken
};