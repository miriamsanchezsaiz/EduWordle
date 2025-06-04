// src/api/models/user.js
const { DataTypes } = require('sequelize');
const sequelize  = require('../../config/database');

// Define the model for the new 'user' table
const User = sequelize.define('User', { 
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id'
  },
  name: { 
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'name' 
  },
  email: { 
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    field: 'email', 
    validate: {
      isEmail: true
    }
  },
  password: { 
    type: DataTypes.STRING(255), 
    allowNull: false,
    field: 'password' 
  },
  role: { 
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'role', 
    validate: {
      isIn: [['student', 'teacher']] 
    }
  }
}, {
  tableName: 'user', 
});

module.exports = User;
