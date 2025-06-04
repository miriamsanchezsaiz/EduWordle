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
  ...userService,
  ...authService,
  ...groupService, 
  ...wordleService, 
  ...gameService, 
  ...emailService,
};
