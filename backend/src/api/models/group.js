// src/api/models/group.js
const { DataTypes } = require('sequelize');
const  sequelize  = require('../../config/database');

const Group = sequelize.define('Group', {
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
  initDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'initDate'
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'endDate'
  },
  // Foreign key column - now 'userId' in the DB
  userId: { 
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'userId', 
    references: {
        model: 'user', 
        key: 'id'
    }
  }
}, {
  tableName: 'group',
});

module.exports = Group;