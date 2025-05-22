// src/api/models/word.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Word = sequelize.define('Word', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id'
  },
  word: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'word'
  },
  hint: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'hint'
  },
  wordleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'wordleId',
    references: {
        model: 'wordle',
        key: 'id'
    }
  }
}, {
  tableName: 'word',
  timestamps: false
});

module.exports = Word;