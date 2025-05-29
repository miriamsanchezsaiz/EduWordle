// src/api/controllers/teacherController.js
// Import services. Using the index file simplifies imports.
const {
  userService, // Although not directly used in all, good to have access
  groupService,
  wordleService,
  gameService
} = require('../services');
const { validationResult } = require('express-validator'); // To handle validation results
const { User, Group, Wordle, GameResult } = require('../models')
const { Op } = require('sequelize');
const sequelize = require('../../config/database');
// Controller function to create a new group
const createGroup = async (req, res, next) => { // Added next for error handling
  // Check for validation errors from the validateCreateGroup middleware
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const teacherId = req.user.id; // Get teacher ID from authenticated user
  // Destructure expected fields from the validated request body
  const { name, startDate, endDate, studentEmails } = req.body;

  try {
    // Call the group service function to create the group and link students
    const newGroup = await groupService.createGroup(teacherId, { name, startDate, endDate }, studentEmails);

    // Respond with the created group data
    res.status(201).json(newGroup);

  } catch (error) {
    console.error('Error in createGroup controller:', error);
    // Pass the error to the centralized error handler middleware
    next(error);
  }
};

// Controller function to get groups created by the logged-in teacher
const getTeacherGroups = async (req, res, next) => { // Added next
  const teacherId = req.user.id; // Get teacher ID from authenticated user
  // Get filter parameters from query string
  const filters = req.query;

  try {
    // Call the group service function to get groups based on teacher ID and filters
    const groups = await groupService.getGroupsByTeacher(teacherId, filters);

    res.status(200).json(groups);

  } catch (error) {
    console.error('Error in getTeacherGroups controller:', error);
    next(error);
  }
};

// Controller function to get details of a specific group
const getGroupDetails = async (req, res, next) => { // Added next
  const teacherId = req.user.id; // Get teacher ID from authenticated user
  const groupId = req.params.groupId; // Get group ID from URL parameters

  try {
    // Call the group service function to get group details, including students and wordles
    // The service function handles verification that the group belongs to the teacher
    const groupDetails = await groupService.getGroupDetails(groupId, teacherId);

    if (!groupDetails) {
      // If service returns null, it means group not found or access denied
      return res.status(404).json({ message: 'Group not found or access denied' });
    }

    res.status(200).json(groupDetails);

  } catch (error) {
    console.error('Error in getGroupDetails controller:', error);
    next(error);
  }
};

// Controller function to update a specific group
const updateGroup = async (req, res, next) => { // Added next
  // Check for validation errors from the validateUpdateGroup middleware
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const teacherId = req.user.id; // Get teacher ID from authenticated user
  const groupId = req.params.groupId; // Get group ID from URL parameters
  // Get update data (name, dates, student emails/ids) from the validated request body
  const updateData = await groupService.prepareForUpdate(req);

  try {
    // Call the group service function to update the group and manage student links
    // The service function handles verification that the group belongs to the teacher
    const updatedGroup = await groupService.updateGroup(groupId, teacherId, updateData);

    if (!updatedGroup) {
      // If service returns null, it means group not found or access denied
      return res.status(404).json({ message: 'Group not found or access denied' });
    }

    res.status(200).json(updatedGroup);

  } catch (error) {
    console.error('Error in updateGroup controller:', error);
    next(error);
  }
};

// Controller function to delete a specific group
const deleteGroup = async (req, res, next) => { // Added next
  const teacherId = req.user.id; // Get teacher ID from authenticated user
  const groupId = req.params.groupId; // Get group ID from URL parameters

  try {
    // Call the group service function to delete the group
    // The service function handles verification that the group belongs to the teacher
    const deleted = await groupService.deleteGroup(groupId, teacherId);

    if (!deleted) {
      // If service returns false, it means group not found or access denied
      return res.status(404).json({ message: 'Group not found or access denied' });
    }

    // 204 No Content is typically returned for successful DELETE
    res.status(204).send();

  } catch (error) {
    console.error('Error in deleteGroup controller:', error);
    next(error);
  }
};

// Controller function to create a new wordle
const createWordle = async (req, res, next) => { // Added next
  // Check for validation errors from the validateCreateWordle middleware
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const teacherId = req.user.id; // Get teacher ID from authenticated user
  // Get wordle data (name, word, questions, group access IDs) from the validated request body
  const wordleData = req.body;

  try {
    // Call the wordle service function to create the wordle and link group access
    // The service function handles verification that the groups belong to this teacher
    const newWordle = await wordleService.createWordle(teacherId, wordleData);

    // Respond with the created wordle data
    res.status(201).json(newWordle);

  } catch (error) {
    console.error('Error in createWordle controller:', error);
    next(error);
  }
};

// Controller function to get wordles created by the logged-in teacher
const getTeacherWordles = async (req, res, next) => { // Added next
  const teacherId = req.user.id; // Get teacher ID from authenticated user

  try {
    // Call the wordle service function to get wordles based on teacher ID
    const wordles = await wordleService.getWordlesByTeacher(teacherId);

    res.status(200).json(wordles);

  } catch (error) {
    console.error('Error in getTeacherWordles controller:', error);
    next(error);
  }
};

// Controller function to get details of a specific wordle
const getWordleDetails = async (req, res, next) => { // Added next
  const teacherId = req.user.id; // Get teacher ID from authenticated user
  const wordleId = req.params.wordleId; // Get wordle ID from URL parameters

  try {
    // Call the wordle service function to get wordle details, including word, questions, and groups with access
    // The service function handles verification that the wordle belongs to the teacher
    const wordleDetails = await wordleService.getWordleDetails(wordleId, teacherId);

    if (!wordleDetails) {
      // If service returns null, it means wordle not found or access denied
      return res.status(404).json({ message: 'Wordle not found or access denied' });
    }

    res.status(200).json(wordleDetails);

  } catch (error) {
    console.error('Error in getWordleDetails controller:', error);
    next(error);
  }
};

// Controller function to update a specific wordle
const updateWordle = async (req, res, next) => { // Added next
  // Check for validation errors from the validateUpdateWordle middleware
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const teacherId = req.user.id; // Get teacher ID from authenticated user
  const wordleId = req.params.wordleId; // Get wordle ID from URL parameters
  // Get update data (name, word, questions, group access IDs) from the validated request body
  const updateData = req.body;

  try {
    // Call the wordle service function to update the wordle and manage associations
    // The service function handles verification that the wordle belongs to the teacher
    const updatedWordle = await wordleService.updateWordle(wordleId, teacherId, updateData);

    if (!updatedWordle) {
      // If service returns null, it means wordle not found or access denied
      return res.status(404).json({ message: 'Wordle not found or access denied' });
    }

    res.status(200).json(updatedWordle);

  } catch (error) {
    console.error('Error in updateWordle controller:', error);
    next(error);
  }
};

// Controller function to delete a specific wordle
const deleteWordle = async (req, res, next) => { // Added next
  const teacherId = req.user.id; // Get teacher ID from authenticated user
  const wordleId = req.params.wordleId; // Get wordle ID from URL parameters

  try {
    // Call the wordle service function to delete the wordle
    // The service function handles verification that the wordle belongs to the teacher
    const deleted = await wordleService.deleteWordle(wordleId, teacherId);

    if (!deleted) {
      // If service returns false, it means wordle not found or access denied
      return res.status(404).json({ message: 'Wordle not found or access denied' });
    }

    // 204 No Content is typically returned for successful DELETE
    res.status(204).send();

  } catch (error) {
    console.error('Error in deleteWordle controller:', error);
    next(error);
  }
};

// Controller function to get game results for a specific student (Teacher functionality)
const getStudentGameResultsForTeacher = async (req, res, next) => {
  const teacherId = req.user.id; // Get teacher ID from authenticated user
  const studentId = req.params.userId; // Get student ID from URL parameters

  try {
    // Call the game service function to get all game results for this student
    // The service now handles verification if the teacher is authorized
    const gameResults = await gameService.getGameResultsForStudent(studentId, teacherId); // Pass teacherId

    res.status(200).json(gameResults);

  } catch (error) {
    console.error('Error in getStudentGameResultsForTeacher controller:', error);
    // Handle specific authorization error from service
    if (error.message === 'Teacher not authorized to view this student\'s results') {
      return res.status(403).json({ message: error.message }); // 403 Forbidden
    }
    next(error); // Pass other errors to the error handler
  }
};

// Controller function to get game results for a specific wordle (Teacher functionality)
const getWordleGameResultsForTeacher = async (req, res, next) => {
  const teacherId = req.user.id; // Get teacher ID from authenticated user
  const wordleId = req.params.wordleId; // Get wordle ID from URL parameters

  try {
    // Call the game service function to get all game results for this wordle
    // The service now handles verification if the teacher is authorized
    const gameResults = await gameService.getGameResultsForWordle(wordleId, teacherId); // Pass teacherId

    res.status(200).json(gameResults);

  } catch (error) {
    console.error('Error in getWordleGameResultsForTeacher controller:', error);
    // Handle specific authorization error from service
    if (error.message === 'Teacher not authorized to view results for this wordle') {
      return res.status(403).json({ message: error.message }); // 403 Forbidden
    }
    next(error); // Pass other errors to the error handler
  }
};

// Controller function to get game results for a specific group (Teacher functionality)
const getGroupGameResultsForTeacher = async (req, res, next) => {
  const teacherId = req.user.id; // Get teacher ID from authenticated user
  const groupId = req.params.groupId; // Get group ID from URL parameters

  try {
    // Call the game service function to get game results for this group
    // The service now handles verification if the teacher is authorized
    const gameResults = await gameService.getGameResultsForGroup(groupId, teacherId); // Pass teacherId

    res.status(200).json(gameResults);

  } catch (error) {
    console.error('Error in getGroupGameResultsForTeacher controller:', error);
    // Handle specific authorization error from service
    if (error.message === 'Teacher not authorized to view results for this group') {
      return res.status(403).json({ message: error.message }); // 403 Forbidden
    }
    if (error.message === 'Group not found') {
      return res.status(404).json({ message: error.message }); // 404 Not Found
    }
    next(error); // Pass other errors to the error handler
  }
};

// Controller function to get details of a specific game result (Teacher functionality)
const getGameResultDetailsForTeacher = async (req, res, next) => {
  const teacherId = req.user.id; // Get teacher ID from authenticated user
  const gameResultId = req.params.gameResultId; // Get game result ID from URL parameters

  try {
    // Call the game service function to get details of the specific game result
    // The service now handles verification if the teacher is authorized
    const gameResult = await gameService.getGameResultDetails(gameResultId, teacherId); // Pass teacherId

    if (!gameResult) {
      // This case should ideally be caught by the service throwing "Game result not found",
      // but this is a defensive check.
      return res.status(404).json({ message: 'Game result not found' });
    }

    res.status(200).json(gameResult);

  } catch (error) {
    console.error('Error in getGameResultDetailsForTeacher controller:', error);
    // Handle specific authorization error or not found error from service
    if (error.message === 'Teacher not authorized to view this game result') {
      return res.status(403).json({ message: error.message }); // 403 Forbidden
    }
    if (error.message === 'Game result not found') {
      return res.status(404).json({ message: error.message }); // 404 Not Found
    }
    next(error); // Pass other errors to the error handler
  }
};

// Controller function to handle change password request for the logged-in teacher
const changePassword = async (req, res, next) => {
  // Check for validation errors from the validateChangePassword middleware
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const { oldPassword, newPassword } = req.body;

  try {
    await userService.changePassword(userId, oldPassword, newPassword);
    res.status(200).json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Error in changePassword controller:', error);
    if (error.message === 'User not found' || error.message === 'Incorrect old password') {
      return res.status(401).json({ message: error.message });
    }
    next(error);
  }
};


const getGroupStudentRanking = async (req, res, next) => {
  const teacherId = req.user.id; // Obtener ID del profesor autenticado
  const groupId = req.params.groupId; // Obtener ID del grupo de los parámetros URL

  try {
      // Llama al servicio para obtener el ranking del grupo
      const ranking = await groupService.getGroupStudentRanking(groupId, teacherId);

      if (!ranking) {
          // Esto podría suceder si el grupo no se encuentra o el profesor no está autorizado
          // El servicio ya lanza un error en esos casos, así que este if es más un fallback.
          return res.status(404).json({ message: 'Group not found or access denied' });
      }

      res.status(200).json(ranking);

  } catch (error) {
      console.error('Error in getGroupStudentRanking controller:', error);
      if (error.message === 'Group not found or access denied') {
          return res.status(404).json({ message: error.message });
      }
      // Pasa otros errores al middleware centralizado de manejo de errores
      next(error);
  }
};



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

  // New Game Result functions for Teacher
  getStudentGameResultsForTeacher,
  getWordleGameResultsForTeacher,
  getGroupGameResultsForTeacher,
  getGameResultDetailsForTeacher,
  getGroupStudentRanking
};
