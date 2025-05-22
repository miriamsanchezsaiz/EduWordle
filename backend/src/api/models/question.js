// src/api/models/question.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id'
  },
  question: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'question'
  },
  options: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'options',
    get: function() {
      const options = this.getDataValue('options');
      try {
        return options ? JSON.parse(options) : null;
      } catch (e) {
        console.error('Error parsing JSON for options:', options, e);
        return options;
      }
    },
    set: function(val) {
      this.setDataValue('options', JSON.stringify(val));
    }
  },
  correctAnswer: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'correctAnswer',
    get: function() {
        const answer = this.getDataValue('correctAnswer');
        try {
            return JSON.parse(answer);
        } catch (e) {
             console.warn('Could not parse correctAnswer as JSON, returning raw string:', answer);
            return answer;
        }
    },
     set: function(val) {
         this.setDataValue('correctAnswer', JSON.stringify(val));
     }
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'type'
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
  tableName: 'question',
  timestamps: false
});

module.exports = Question;