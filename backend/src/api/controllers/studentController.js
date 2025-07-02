// src/api/controllers/studentController.js
const {
  userService,
  groupService,
  wordleService,
  gameService
} = require('../services');
const { validationResult } = require('express-validator');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('express-async-handler');

// Controller function to get active groups for the logged-in student
const getActiveGroups = asyncHandler(async (req, res) => {
  // req.user will contain { id, email, role } from the authenticateJWT middleware
  const studentId = req.user.id;
  if (!studentId) {
    throw ApiError.badRequest('Student ID is required');
  }

  const activeGroups = await groupService.getActiveGroupsForStudent(studentId);

  if (!activeGroups) {
    return res.status(200).json([]);
  }
  res.status(200).json(activeGroups);

});

// Controller function to get accessible wordles for the logged-in student
const getAccessibleWordles = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  if (!studentId) {
    throw ApiError.badRequest('Student ID is required');
  }
  const accessibleWordles = await wordleService.getAccessibleWordlesForStudent(studentId);
  res.status(200).json(accessibleWordles);

});

// Controller function to get game data for a specific wordle
const getWordleGameData = asyncHandler(async (req, res) => {
  const wordleId = req.params.wordleId;
  const studentId = req.user.id;
  if (!studentId || !wordleId) {
    throw ApiError.badRequest('Student ID is required');
  }

  const wordleData = await wordleService.getWordleDataForGame(wordleId, studentId);

  if (!wordleData) {
    throw ApiError.notFound('Wordle not found or access denied');
  }
  res.status(200).json(wordleData);
});


const saveGameResult = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ApiError.badRequest('Validation failed', errors.array());
  }

  const wordleId = req.params.wordleId;
  const studentId = req.user.id;
  if (!studentId || !wordleId) {
    throw ApiError.badRequest('Student ID is required');
  }

  const { score } = req.body;
  if (score === undefined || score === null || !Number.isInteger(score) || score < 0) {
    throw ApiError.badRequest('Valid score (integer >= 0) is required in the request body');
  }

  const hasAccess = await wordleService.checkStudentAccess(studentId, wordleId);
  if (!hasAccess) {
    throw ApiError.forbidden('You do not have access to this wordle');
  }
  const savedResult = await gameService.saveGameResult(studentId, wordleId, score);
  res.status(201).json({ message: 'Game result saved successfully', gameResult: savedResult });
});




// CHECKED: Controller function to handle change password request for the logged-in student
const changePassword = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ApiError.badRequest('Validation failed', errors.array());
  }

  const userId = req.user.id;
  const { oldPassword, newPassword } = req.body;


  await userService.changePassword(userId, oldPassword, newPassword);
  res.status(200).json({ message: 'Password changed successfully' });

});

const getGroupDetails = asyncHandler(async (req, res, next) => {
  const studentId = req.user.id;
  const groupId = req.params.groupId;
  if (!studentId || !groupId) {
    throw ApiError.badRequest('Student ID is required');
  }

  const groupDetails = await groupService.getGroupDetails(groupId, studentId, 'student');

  if (!groupDetails) {
    throw ApiError.notFound('Group not found or access denied');
  }

  res.status(200).json(groupDetails);

});


module.exports = {
  getActiveGroups,
  getAccessibleWordles,
  getWordleGameData,
  saveGameResult,
  // getStudentGameResults,
  // getStudentGameResultDetails,
  changePassword,
  getGroupDetails
};