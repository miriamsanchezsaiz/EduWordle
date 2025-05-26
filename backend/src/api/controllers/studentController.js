// src/api/controllers/studentController.js
const {
  userService,
  groupService,
  wordleService,
  gameService
} = require('../services');
const { validationResult } = require('express-validator');

// Controller function to get active groups for the logged-in student
const getActiveGroups = async (req, res) => {
  // req.user will contain { id, email, role } from the authenticateJWT middleware
  const studentId = req.user.id;


    if (!studentId) {
        // En un caso real, esto debería ser manejado por el middleware de autenticación
        // o lanzar un error 401 Unauthorized.
        return res.status(401).json({ message: 'Authentication required: User ID missing.' });
    }

  try {
    // Call a service function to get active groups for the student
    // You will need to implement groupService.getActiveGroupsForStudent
    const activeGroups = await groupService.getActiveGroupsForStudent(studentId);

    if (!activeGroups) {
             return res.status(200).json([]); // Envía un array vacío si no hay grupos
        }
    res.status(200).json(activeGroups);

  } catch (error) {
    console.error('Error in getActiveGroups controller:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Controller function to get accessible wordles for the logged-in student
const getAccessibleWordles = async (req, res) => {
  const studentId = req.user.id;

  try {
    // Call a service function to get accessible wordles for the student
    // This service needs to consider the student's groups and the wordle_groups table
    // You will need to implement wordleService.getAccessibleWordlesForStudent
    const accessibleWordles = await wordleService.getAccessibleWordlesForStudent(studentId);

    res.status(200).json(accessibleWordles);

  } catch (error) {
    console.error('Error in getAccessibleWordles controller:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Controller function to get game data for a specific wordle
const getWordleGameData = async (req, res) => {
  const wordleId = req.params.wordleId; 
  const studentId = req.user.id; 

  
  try {
    // Call a service function to get the wordle data (word and questions)
    const wordleData = await wordleService.getWordleDataForGame(wordleId, studentId);

    if (!wordleData) {
      // Should not happen if checkStudentAccess passed, but good defensive check
      return res.status(404).json({ message: 'Wordle not found or no game data available' });
    }

    res.status(200).json(wordleData);

  } catch (error) {
    console.error('Error in getWordleGameData controller:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Controller function to save the result of a completed game
// Note: Based on your last DB structure update, the 'partidas' table
// only stores userId, wordleId, and creationDate, NOT the actual result details.
// This controller needs to be adjusted based on what you ACTUALLY want to save.
// For now, it just saves the basic game entry. If you need results,
// the GameResult model and gameService need columns for results.
const saveGameResult = async (req, res, next) => {
  // You might need a validation middleware for the request body (attemptsTaken, isGuessed, score)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const wordleId = req.params.wordleId;
  const studentId = req.user.id;

  // Based on the API spec, the request body might contain result details:
  const { score } = req.body;
  if (score === undefined || score === null || !Number.isInteger(score) || score < 0) {
    return res.status(400).json({ message: 'Valid score (integer >= 0) is required in the request body' });
  }


  try {
    // Verify if the student has access to this wordle before saving result
    const hasAccess = await wordleService.checkStudentAccess(studentId, wordleId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to save result for this wordle' });
    }

    // Call a service function to save the game result
    // You will need to implement gameService.saveGameResult
    // This function will interact with the GameResult model ('partidas' table)
    // If you need to save attempts, score, etc., you MUST add those columns
    // to the 'partidas' table and modify gameService.saveGameResult
    const savedResult = await gameService.saveGameResult(studentId, wordleId, score);

    res.status(201).json({ message: 'Game result saved successfully', gameResult: savedResult });

  } catch (error) {
    console.error('Error in saveGameResult controller:', error);
    // Handle potential errors like database errors
    next(error);
  }
};

// Controller function to get all game results for the logged-in student
const getStudentGameResults = async (req, res, next) => {
  const studentId = req.user.id; // Get student ID from authenticated user

  try {
    // Call the game service function to get all game results for this student
    const gameResults = await gameService.getGameResultsForStudent(studentId);

    res.status(200).json(gameResults);

  } catch (error) {
    console.error('Error in getStudentGameResults controller:', error);
    next(error);
  }
};

// Controller function to get details of a specific game result for the logged-in student
const getStudentGameResultDetails = async (req, res, next) => {
  const studentId = req.user.id; // Get student ID from authenticated user
  const gameResultId = req.params.gameResultId; // Get game result ID from URL parameters

  try {
    // Call the game service function to get details of the specific game result
    const gameResult = await gameService.getGameResultDetails(gameResultId);

    // Verify that the game result belongs to the logged-in student
    if (!gameResult || gameResult.userId !== studentId) {
      return res.status(404).json({ message: 'Game result not found or access denied' });
    }

    res.status(200).json(gameResult);

  } catch (error) {
    console.error('Error in getStudentGameResultDetails controller:', error);
    next(error);
  }
};


// Controller function to handle change password request for the logged-in student
const changePassword = async (req, res) => {
  // You might need a validation middleware for this endpoint too (oldPassword, newPassword)
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


module.exports = {
  getActiveGroups,
  getAccessibleWordles,
  getWordleGameData,
  saveGameResult,
  getStudentGameResults,
  getStudentGameResultDetails,
  changePassword
};