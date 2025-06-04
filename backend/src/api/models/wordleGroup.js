// src/api/models/wordleGroup.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const WordleGroup = sequelize.define('WordleGroup', {
  // Model based on composite primary key (wordleId, groupId) as per your SQL script
  wordleId: {
    type: DataTypes.INTEGER,
    primaryKey: true, 
    allowNull: false,
    field: 'wordleId',
    references: {
        model: 'wordle',
        key: 'id'
    }
  },
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
  tableName: 'wordle_group',
  primaryKey: ['wordleId', 'groupId'] 
});

module.exports = WordleGroup;