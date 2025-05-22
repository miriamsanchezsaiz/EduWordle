// src/api/models/wordleGroup.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const WordleGroup = sequelize.define('WordleGroup', {
  // Model based on composite primary key (wordleId, groupId) as per your SQL script
  wordleId: {
    type: DataTypes.INTEGER,
    primaryKey: true, // Part of the composite primary key
    allowNull: false,
    field: 'wordleId',
    references: {
        model: 'wordle',
        key: 'id'
    }
  },
  groupId: {
    type: DataTypes.INTEGER,
    primaryKey: true, // Part of the composite primary key
    allowNull: false,
    field: 'groupId',
    references: {
        model: 'group',
        key: 'id'
    }
  }
}, {
  tableName: 'wordle_group',
  timestamps: false,
  // If using the composite primary key from the SQL script:
  primaryKey: ['wordleId', 'groupId'] // Define the composite primary key
});

module.exports = WordleGroup;