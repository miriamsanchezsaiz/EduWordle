// src/api/models/index.js
const sequelize = require('../../config/database'); 
const User = require('./user');
const Group = require('./group');
const Wordle = require('./wordle');
const Question = require('./question');
const Word = require('./word');
const StudentGroup = require('./studentGroup'); 
const WordleGroup = require('./wordleGroup'); 
const GameResult = require('./gameResult'); 


// --- Define Associations Here ---

// User associations
User.hasMany(Group, { foreignKey: 'userId', as: 'createdGroups', onDelete: 'CASCADE', onUpdate: 'CASCADE' }); // A user (teacher) creates many groups
User.hasMany(Wordle, { foreignKey: 'userId', as: 'createdWordles', onDelete: 'CASCADE', onUpdate: 'CASCADE' }); // A user (teacher) creates many wordles
User.hasMany(GameResult, { foreignKey: 'userId', as: 'gameResults', onDelete: 'CASCADE', onUpdate: 'CASCADE' }); // A user (student) has many game results

// Many-to-Many User (Student) and Group
User.belongsToMany(Group, {
  through: StudentGroup,
  foreignKey: 'userId',
  otherKey: 'groupId',
  as: 'groups',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});


// Group associations
Group.belongsTo(User, { foreignKey: 'userId', as: 'creator', onDelete: 'CASCADE', onUpdate: 'CASCADE' }); // A group belongs to one user (teacher)


// Many-to-Many Group and User (Student)
Group.belongsToMany(User, {
  through: StudentGroup,
  foreignKey: 'groupId',
  otherKey: 'userId',
  as: 'students',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

// Many-to-Many Group and Wordle
Group.belongsToMany(Wordle, {
  through: WordleGroup,
  foreignKey: 'groupId',
  otherKey: 'wordleId',
  as: 'accessibleWordles',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});


// Wordle associations
Wordle.belongsTo(User, { foreignKey: 'userId', as: 'creator', onDelete: 'CASCADE', onUpdate: 'CASCADE' }); // A wordle belongs to one user (teacher)

Wordle.hasMany(Question, { foreignKey: 'wordleId', as: 'questions', onDelete: 'CASCADE', onUpdate: 'CASCADE' }); // A wordle has many questions
Wordle.hasMany(Word, { foreignKey: 'wordleId', as: 'words', onDelete: 'CASCADE', onUpdate: 'CASCADE' }); // A wordle has one word
Wordle.hasMany(GameResult, { foreignKey: 'wordleId', as: 'gameResults', onDelete: 'CASCADE', onUpdate: 'CASCADE' }); // A wordle has many game results


// Many-to-Many Wordle and Group
Wordle.belongsToMany(Group, {
  through: WordleGroup,
  foreignKey: 'wordleId',
  otherKey: 'groupId',
  as: 'groupsWithAccess',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});


// Question association
Question.belongsTo(Wordle, { foreignKey: 'wordleId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

// Word association
Word.belongsTo(Wordle, { foreignKey: 'wordleId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

WordleGroup.belongsTo(Wordle, { foreignKey: 'wordleId', as: 'wordle' });
WordleGroup.belongsTo(Group, { foreignKey: 'groupId', as: 'group' }); // <-- ESTA ES LA CLAVE PARA TU ERROR

// GameResult associations
GameResult.belongsTo(User, { foreignKey: 'userId', as: 'player', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
GameResult.belongsTo(Wordle, { foreignKey: 'wordleId', as: 'wordle', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

StudentGroup.belongsTo(User, { foreignKey: 'userId', as: 'student' });
StudentGroup.belongsTo(Group, { foreignKey: 'groupId', as: 'group' });

module.exports = {
  sequelize,
  User,
  Group,
  Wordle,
  Question,
  Word,
  StudentGroup,
  WordleGroup,
  GameResult,
};