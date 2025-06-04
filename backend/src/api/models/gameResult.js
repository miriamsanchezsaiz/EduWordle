// src/api/models/gameResult.js
const { DataTypes } = require('sequelize');
const  sequelize  = require('../../config/database');

// Define the model for the 'partidas' table with simplified structure
const GameResult = sequelize.define('GameResult', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id'
  },
  // Foreign key to the users table (for the student who played)
  userId: { 
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'userId', 
    references: {
        model: 'user',
        key: 'id'
    }
  },
  // Foreign key to the wordles table
  wordleId: { 
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'wordleId', 
    references: {
        model: 'wordle',
        key: 'id'
    }
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'score' 
  }
}, {
  tableName: 'game', 
  timestamps: true, 
  indexes: [
    {
      unique: true,
      fields: ['userId', 'wordleId'] 
    }
  ]

});



module.exports = GameResult;