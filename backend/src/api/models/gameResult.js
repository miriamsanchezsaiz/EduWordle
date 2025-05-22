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
    field: 'userId', // Mapea a la columna 'userId' en la BD
    references: {
        model: 'user',
        key: 'id'
    }
  },
  // Foreign key to the wordles table
  wordleId: { 
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'wordleId', // Mapea a la columna 'wordleId' en la BD
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
  timestamps: true, // Let Sequelize manage createdAt and updatedAt
  createdAt: 'creationDate', // Map Sequelize's createdAt to your DB column 'creationDate'
  updatedAt: false, // Disable updatedAt as per your simplified structure request
  indexes: [
    {
      unique: true,
      fields: ['userId', 'wordleId'] // Fields for the unique constraint
    }
  ]

});

// Note: With this simplified structure, the GameResult table will NOT store
// attempts taken, whether the word was guessed, or the score. The API endpoint
// to save game results will need to be adjusted, or this information will
// need to be stored elsewhere or derived on the fly.

module.exports = GameResult;