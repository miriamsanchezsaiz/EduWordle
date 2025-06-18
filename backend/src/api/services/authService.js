// src/api/services/authService.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userService = require('./userService'); 
const { isStrongPassword } = require('../../utils/passwordUtils');
const ApiError = require('../../utils/ApiError');

require('dotenv').config(); 

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION_TIME = process.env.JWT_EXPIRATION_TIME;

const login = async (email, password) => {
  try {
    // 1. Find the user by email using the userService (searches both tables)
    console.log('DEBUG (login): Email recibido:', email);
    const userResult = await userService.findUserByEmail(email);

    if (!userResult) {
      console.log('DEBUG (login): Usuario no encontrado para el email:', email);
      throw ApiError.unauthorized('Credenciales incorrectas');
    }

    const user = userResult.get({ plain: true });
    const role = user.role;

    if (!user.password) {
      console.debug(`User found but password is null or undefined for email: ${email}`);
      throw ApiError.unauthorized('Credenciales incorrectas');
    }

    // 2. Compare the provided password with the hashed password from the database
    const isPasswordValid = await bcrypt.compare(password, user.password);

    console.log('DEBUG (login): Resultado de bcrypt.compare:', isPasswordValid);

    if (!isPasswordValid) {
      throw ApiError.unauthorized('Credenciales incorrectas');
    }

    // 3. If credentials are valid, check if the password is the initial weak password, then force change
    let requiresPasswordChange = false;
    if (!isStrongPassword(password)) {
      requiresPasswordChange = true;
    }

    // 4. If it is, generate a JSON Web Token (JWT)

    const payload = {
      id: user.id,
      email: user.email,
      role: role,
    };

    if (!JWT_SECRET) {
      throw ApiError.internal('Server configuration error: JWT secret missing.');
    }
    if (!JWT_EXPIRATION_TIME) {
      throw ApiError.internal('Server configuration error: JWT expiration time missing.');
    }

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRATION_TIME
    });

    // 5. Return the token and basic user info (without password)
    const { password: userPassword, ...userInfo } = user;
    return { token, user: { ...userInfo, role: role }, requiresPasswordChange };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    } else {
      console.error('Unexpected error during login in authService:', error);
      throw ApiError.internal('An unexpected error occurred during login.');
    }
  }
};


const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded; 
  } catch (error) {
    console.debug('Token verification failed:', error.message);
    throw new Error('Invalid or expired token');
  }
};


module.exports = {
  login,
  verifyToken
};