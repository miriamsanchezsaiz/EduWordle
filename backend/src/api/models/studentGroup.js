// src/api/models/studentGroup.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const StudentGroup = sequelize.define('StudentGroup', {
 
  // Foreign key to the user table (for the student) - now 'userId' in DB
  userId: { 
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    field: 'userId', 
    references: {
        model: 'user',
        key: 'id'
    }
  },
  // Foreign key to the grupos table
  groupId: { 
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    field: 'groupId', 
    references: {
        model: 'group',
        key: 'id'
    }
  }
}, {
  tableName: 'student_group',
  primaryKey: ['userId', 'groupId']
});

module.exports = StudentGroup;