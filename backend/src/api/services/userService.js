// src/api/services/userService.js (Simplified)
const bcrypt = require('bcryptjs');
const { User, Group, StudentGroup } = require('../models'); // Import the User and Group models
const sequelize = require('../../config/database'); // Import sequelize for transactions if needed

const SALT_ROUNDS = 10;

// Function to find a user by their email address (searches the single user table)
const findUserByEmail = async (email) => {
  try {
    const user = await User.findOne({ where: { email: email } });
    // If user is found, the returned object already contains the 'role' field
    return user; 
  } catch (error) {
    console.debug('Error finding user by email:', error);
    throw error;
  }
};

// Function to create a new user with a specific role
// Used by teacher to create students, or for self-registration if implemented
const createUser = async (email, name, password, role) => {
  try {
    // Check if a user with this email already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      throw new Error('Email already in use');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create the new user in the database
    const newUser = await User.create({
      email: email,
      name: name,
      password: hashedPassword,
      role: role // Save the role
    });

    // Return the new user object (excluding the hashed password)
    return newUser;

  } catch (error) {
    console.debug('Error creating user:', error);
    throw error;
  }
};

// Function to change a user's password
const changePassword = async (userId, oldPassword, newPassword) => {
  const transaction = await sequelize.transaction();
  try {
      const user = await User.findByPk(userId, { transaction });

      if (!user) {
          throw new Error('User not found');
      }



      // Compare old password
      const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isPasswordValid) {
          throw new Error('Incorrect old password');
      }


      // Hash the new password
      const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Update the user's password
      user.password = hashedNewPassword;
      await user.save({ transaction });

      await transaction.commit();
      return true; // Indicate success

  } catch (error) {
      await transaction.rollback();
      console.debug('Error changing password:', error);
      throw error;
  }
};

// Function to get a user by ID
const getUserById = async (userId) => {
  try {
      const user = await User.findByPk(userId);
      // Return the Sequelize model instance, or null if not found
      return user;
  } catch (error) {
      console.debug('Error getting user by ID:', error);
      throw error;
  }
};

// Function to delete a student user if they don't belong to any group
const deleteStudentIfNoGroups = async (userId, transaction = null) => {
    try {
        const user = await User.findByPk(userId, { transaction });

        if (!user || user.role !== 'student') { // Only process if user exists and is a student
            console.log(`User ${userId} not found or not a student. Skipping deletion check.`);
            return false;
        }

        // Check for group memberships using the many-to-many association
        // Assumes the relationship 'studentGroups' is defined in models/index.js
        const groups = await user.getStudentGroups({ transaction }); // Sequelize method generated by belongsToMany

        if (groups.length === 0) {
            await user.destroy({ transaction }); // Delete the user from the 'user' table
            console.log(`Student user ${userId} deleted due to no group memberships.`);
            return true; // Deleted
        }

        console.log(`Student user ${userId} still belongs to groups. Not deleting.`);
        return false; // Not deleted

    } catch (error) {
        console.debug('Error deleting student user if no groups:', error);
        throw error;
    }
};


module.exports = {
  findUserByEmail,
  createUser,
  changePassword,
  getUserById,
  deleteStudentIfNoGroups
};