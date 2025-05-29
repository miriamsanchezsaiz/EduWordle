// src/api/routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController'); // Import the student controller
const { authenticateJWT, authorizeRole } = require('../middlewares/authMiddleware'); // Import the authentication middleware
const { validateChangePassword,
    validateSaveGameResult } = require('../middlewares/userValidation'); // Assuming you add validation for change password


// Apply authentication middleware to all student routes
router.use(authenticateJWT);
router.use(authorizeRole(['student']));

// Route to get active groups for the logged-in student
// GET /api/student/groups/active
router.get('/groups/active', studentController.getActiveGroups);

// Route to get accessible wordles for the logged-in student
// GET /api/student/wordles/accessible
router.get('/wordles/accessible', studentController.getAccessibleWordles);

// Route to get game data for a specific wordle
// GET /api/student/wordles/:wordleId/game-data
router.get('/wordles/:wordleId/game-data', studentController.getWordleGameData);

// Route to get all game results for the logged-in student
// GET /api/student/game-results
router.get('/game-results', studentController.getStudentGameResults);

// Route to save the result of a completed game
// POST /api/student/games/:wordleId/save-result
router.post('/games/:wordleId/save-result',
    validateSaveGameResult,
    studentController.saveGameResult
);

// Route to change the password for the logged-in student
// PUT /api/student/change-password
router.put('/change-password',
    // Assuming you create a validateChangePassword middleware
    validateChangePassword, // Apply validation middleware
    studentController.changePassword
);

// Route to get details of a specific group
// GET /api/student/groups/:groupId
router.get('/groups/:groupId', studentController.getGroupDetails);



module.exports = router;