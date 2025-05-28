// src/api/models/user.js
const { DataTypes } = require('sequelize');
const sequelize  = require('../../config/database');

// Define the model for the new 'user' table
const User = sequelize.define('User', { // 'User' is the model name (English)
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id' // Maps the model attribute 'id' to the DB column 'id'
  },
  name: { // Model attribute name (English)
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'name' // Maps 'name' to the 'name' column in the DB
  },
  email: { // Model attribute name (English)
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    field: 'email', // Maps 'email' to the 'email' column in the DB
    validate: {
      isEmail: true
    }
  },
  password: { // Model attribute name (English)
    type: DataTypes.STRING(255), // Should be sufficient for hashed passwords
    allowNull: false,
    field: 'password' // Maps 'password' to the 'password' column in the DB
  },
  role: { // New attribute for the user's role
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'role', // Maps 'role' to the 'role' column in the DB
    validate: {
      isIn: [['student', 'teacher']] // Optional: Sequelize validation for allowed roles
    }
  }
}, {
  tableName: 'user', // Specifies the actual table name in the database (English)
});

// Note on passwords:
// Password hashing and comparison logic will be handled in the service layer (authService, userService).

module.exports = User;
