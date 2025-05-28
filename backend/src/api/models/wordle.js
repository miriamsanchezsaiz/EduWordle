// src/api/models/wordle.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Wordle = sequelize.define('Wordle', {
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
  // Foreign key column - now 'userId' in the DB
  userId: { // Model attribute name (English)
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'userId', // Mapea a la columna 'userId' en la BD
    references: {
        model: 'user', 
        key: 'id'
    }
  },
  difficulty: {
    type: DataTypes.ENUM('low', 'high'), 
    allowNull: false, 
    defaultValue: 'low', 
    field: 'difficulty'
  }
}, {
  tableName: 'wordle',
});

module.exports = Wordle;