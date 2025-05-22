// src/api/services/index.js

const userService = require('./userService');
const authService = require('./authService');
const groupService = require('./groupService');
const wordleService = require('./wordleService');
const gameService = require('./gameService');
const emailService = require('./emailService'); 



module.exports = {
  userService,
  authService,
  groupService,
  wordleService,
  gameService,
  emailService,
  // Export all functions from services here for easy access in controllers
  ...userService,
  ...authService,
  ...groupService, // Export functions from groupService
  ...wordleService, // Export functions from wordleService
  ...gameService, // Export functions from gameService
  ...emailService,
};
