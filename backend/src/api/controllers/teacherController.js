// src/api/controllers/teacherController.js
const {
  userService, 
  groupService,
  wordleService,
  gameService
} = require('../services');
const { validationResult } = require('express-validator'); 
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('express-async-handler');

// Controller function to create a new group
const createGroup = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ApiError.badRequest('Validation failed', errors.array());
  }

  const teacherId = req.user.id;
  const { name, startDate, endDate, studentEmails } = req.body;
  

  const newGroup = await groupService.createGroup(teacherId, { name, startDate, endDate }, studentEmails);
  res.status(201).json(newGroup);
});

// Controller function to get groups created by the logged-in teacher
const getTeacherGroups = asyncHandler(async (req, res, next) => {
  const teacherId = req.user.id;
  const filters = req.query;
  if (!teacherId) {
    throw ApiError.badRequest('Teacher ID is required');  
  }

  const groups = await groupService.getGroupsByTeacher(teacherId, filters);
  res.status(200).json(groups);
});

// Controller function to get details of a specific group
const getGroupDetails = asyncHandler(async (req, res, next) => {
  const teacherId = req.user.id;
  const groupId = req.params.groupId;
  if (!teacherId || !groupId) {
    throw ApiError.badRequest('Teacher ID and Group ID are required');
  }

  const groupDetails = await groupService.getGroupDetails(groupId, teacherId, 'teacher');
  res.status(200).json(groupDetails);
});

// Controller function to update a specific group
const updateGroup = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ApiError.badRequest('Validation failed', errors.array());
  }

  const teacherId = req.user.id;
  const groupId = req.params.groupId;
  const updateData = await groupService.prepareForUpdate(req);
  

  const updatedGroup = await groupService.updateGroup(groupId, teacherId, updateData);
  res.status(200).json(updatedGroup);

});

// Controller function to delete a specific group
const deleteGroup = asyncHandler(async (req, res, next) => {
  const teacherId = req.user.id;
  const groupId = req.params.groupId;
  if (!teacherId || !groupId) {
    throw ApiError.badRequest('Teacher ID and Group ID are required');
  }

  await groupService.deleteGroup(groupId, teacherId);
  res.status(204).send();

});

// Controller function to create a new wordle
const createWordle = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ApiError.badRequest('Validation failed', errors.array());
  }

  const teacherId = req.user.id;
  const wordleData = req.body;
  
  const newWordle = await wordleService.createWordle(teacherId, wordleData);
  
  res.status(201).json(newWordle);
});

// Controller function to get wordles created by the logged-in teacher
const getTeacherWordles = asyncHandler(async (req, res, next) => {
  const teacherId = req.user.id;
  if (!teacherId) {
    throw ApiError.badRequest('Teacher ID is required');  
  }

  const wordles = await wordleService.getWordlesByTeacher(teacherId);
  res.status(200).json(wordles);
});

// Controller function to get details of a specific wordle
const getWordleDetails = asyncHandler(async (req, res, next) => {
  const teacherId = req.user.id;
  const wordleId = req.params.wordleId;
  if (!teacherId || !wordleId) {
    throw ApiError.badRequest('Teacher ID and Wordle ID are required');
  }

  const wordleDetails = await wordleService.getWordleDetails(wordleId, teacherId);

  res.status(200).json(wordleDetails);

});

// Controller function to update a specific wordle
const updateWordle = asyncHandler( async (req, res, next) => { 
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ApiError.badRequest('Validation failed', errors.array());
  }

  const teacherId = req.user.id; 
  const wordleId = req.params.wordleId;
  const updateData = req.body;

   const updatedWordle = await wordleService.updateWordle(wordleId, teacherId, updateData);
    res.status(200).json(updatedWordle);
});

// Controller function to delete a specific wordle
const deleteWordle = asyncHandler( async (req, res, next) => { 
  const teacherId = req.user.id; 
  const wordleId = req.params.wordleId; 
  if (!teacherId || !wordleId) {
    throw ApiError.badRequest('Teacher ID and Wordle ID are required');
  }

  await wordleService.deleteWordle(wordleId, teacherId);
    res.status(204).send();
});

// Controller function to get game results for a specific student (Teacher functionality)
const getStudentGameResultsForTeacher = asyncHandler(async (req, res, next) => {
  const teacherId = req.user.id;
  const studentId = req.params.userId;
  if (!teacherId || !studentId) {
    throw ApiError.badRequest('Teacher ID and Student ID are required');
  }

  const gameResults = await gameService.getGameResultsForStudent(studentId, teacherId);
  res.status(200).json(gameResults);

});

// Controller function to get game results for a specific wordle (Teacher functionality)
const getWordleGameResultsForTeacher = asyncHandler(async (req, res, next) => {
  const teacherId = req.user.id;
  const wordleId = req.params.wordleId;
  if (!teacherId || !wordleId) {
    throw ApiError.badRequest('Teacher ID and Wordle ID are required');
  }

  const gameResults = await gameService.getGameResultsForWordle(wordleId, teacherId);
  res.status(200).json(gameResults);
});

// Controller function to get game results for a specific group (Teacher functionality)
const getGroupGameResultsForTeacher = asyncHandler(async (req, res, next) => {
  const teacherId = req.user.id;
  const groupId = req.params.groupId;
  if (!teacherId || !groupId) {
    throw ApiError.badRequest('Teacher ID and Group ID are required');
  }

  const gameResults = await gameService.getGameResultsForGroup(groupId, teacherId); // Pass teacherId

  res.status(200).json(gameResults);


});

// Controller function to get details of a specific game result (Teacher functionality)
const getGameResultDetailsForTeacher = asyncHandler(async (req, res, next) => {
  const teacherId = req.user.id;
  const gameResultId = req.params.gameResultId;
  if (!teacherId || !gameResultId) {
    throw ApiError.badRequest('Teacher ID and Game Result ID are required');
  }


  const gameResult = await gameService.getGameResultDetails(gameResultId, teacherId); // Pass teacherId

  res.status(200).json(gameResult);

});

// Controller function to handle change password request for the logged-in teacher
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

// FUTURO: Esta función debería ser parte de un servicio, pero por ahora la dejamos aquí para que el controlador sea más limpio.
// const getGroupStudentRanking = async (req, res, next) => {
//   const teacherId = req.user.id; 
//   const groupId = req.params.groupId; 

//   try {
//     const ranking = await groupService.getGroupStudentRanking(groupId, teacherId);

//     if (!ranking) {
//       return res.status(404).json({ message: 'Group not found or access denied' });
//     }

//     res.status(200).json(ranking);

//   } catch (error) {
//     console.error('Error in getGroupStudentRanking controller:', error);
//     if (error.message === 'Group not found or access denied') {
//       return res.status(404).json({ message: error.message });
//     }
//     next(error);
//   }
// };



module.exports = {
  // Group functions
  createGroup,
  getTeacherGroups,
  getGroupDetails,
  updateGroup,
  deleteGroup,

  // Wordle functions
  createWordle,
  getTeacherWordles,
  getWordleDetails,
  updateWordle,
  deleteWordle,

  // Other Teacher functions
  changePassword,

  // Game Result functions for Teacher
  getStudentGameResultsForTeacher,
  getWordleGameResultsForTeacher,
  getGroupGameResultsForTeacher,
  getGameResultDetailsForTeacher,
  // getGroupStudentRanking
};
