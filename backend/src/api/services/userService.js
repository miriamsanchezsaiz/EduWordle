// src/api/services/userService.js (Simplified)
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const ApiError = require('../../utils/ApiError');
const sequelize = require('../../config/database');

const SALT_ROUNDS = 10;

// Function to find a user by their email address (searches the single user table)
const findUserByEmail = async (email) => {
  try {
    const user = await User.findOne({ where: { email: email } });
    if (!user) {
      throw ApiError.notFound(`User with email ${email} not found.`);
    }
    return user;
  } catch (error) {
    console.debug('Error finding user by email in userService:', error);
    if (error instanceof ApiError) {
      throw error;
    }
  }
};

// Function to create a new user with a specific role
const createUser = async (email, name, password, role, transaction = null) => {

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    const newUser = await User.create({
      email: email,
      name: name,
      password: hashedPassword,
      role: role
    }, { transaction });

    return newUser;
  } catch (error) {
    console.debug('Error creating user in userService:', error);
    if (error instanceof UniqueConstraintError) {

      const field = Object.keys(error.fields)[0];
      const value = error.fields[field];


      if (field === 'email') {
        throw ApiError.conflict(`El email '${value}' ya está en uso. Por favor, utiliza otro email.`);
      } else {
        throw ApiError.conflict(`Un recurso con el valor '${value}' para el campo '${field}' ya existe.`);
      }
    }
    if (error instanceof ApiError) {
      throw error;
    } else {
      throw ApiError.internal('An unexpected error occurred while creating the user.');
    }
  }
};

// Function to change a user's password
const changePassword = async (userId, oldPassword, newPassword) => {
  const transaction = await sequelize.transaction();
  try {
    const user = await User.findByPk(userId, { transaction });

    if (!user) {
      throw ApiError.notFound('User not found');
    }


    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Incorrect old password');
    }


    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    user.password = hashedNewPassword;
    await user.save({ transaction });

    await transaction.commit();
    return true;

  } catch (error) {
    await transaction.rollback();
    console.debug('Error changing password:', error);
    if (error instanceof ApiError) {
      throw error;
    } else {
      throw ApiError.internal('An unexpected error occurred while changing the password.');
    }
  }
};

// Function to get a user by ID
const getUserById = async (userId) => {
  try {
    const user = await User.findByPk(userId);
    return user;
  } catch (error) {
    console.error('Error getting user by ID in userService:', error);
    throw ApiError.internal('An unexpected error occurred while fetching user by ID.');
  }
};

// Function to delete a student user if they don't belong to any group
const deleteStudentIfNoGroups = async (userId, transaction = null) => {
  try {
    const user = await User.findByPk(userId, { transaction });

    if (!user) {
      return false;
    }
    if (user.role !== 'student') {
      throw ApiError.badRequest(`User ${userId} is not a student and cannot be processed by deleteStudentIfNoGroups.`);
    }

    const groups = await user.getStudentGroups({
      where: { userId: userId },
      through: { attributes: [] },
      attributes: ['id']
    }, { transaction });

    if (groups.length === 0) {
      await user.destroy({ transaction });
      console.log(`Student user ${userId} deleted due to no group memberships.`);
      return true;
    }

    console.log(`Student user ${userId} still belongs to groups. Not deleting.`);
    return false;

  } catch (error) {
    console.debug('Error deleting student user if no groups:', error);
    if (error instanceof ApiError) {
      throw error;
    } else {
      throw ApiError.internal(`An unexpected error occurred while checking/deleting student user ${userId}.`);
    }
  }
};


module.exports = {
  findUserByEmail,
  createUser,
  changePassword,
  getUserById,
  deleteStudentIfNoGroups
};