// src/api/routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController'); 
const { authenticateJWT, authorizeRole } = require('../middlewares/authMiddleware'); 
const { validateChangePassword,
    validateSaveGameResult } = require('../middlewares/userValidation'); 


router.use(authenticateJWT);
router.use(authorizeRole(['student']));

// Route to change the password for the logged-in student
// PUT /api/student/change-password
router.put('/change-password',
    validateChangePassword, 
    studentController.changePassword
);

// Route to get active groups for the logged-in student
// GET /api/student/groups/active
router.get('/groups/active', studentController.getActiveGroups);

// Route to get details of a specific group
// GET /api/student/groups/:groupId
router.get('/groups/:groupId', studentController.getGroupDetails);


// Route to get accessible wordles for the logged-in student
// GET /api/student/wordles/accessible
router.get('/wordles/accessible', studentController.getAccessibleWordles);

// Route to get game data for a specific wordle
// GET /api/student/wordles/:wordleId/game-data
router.get('/wordles/:wordleId/game-data', studentController.getWordleGameData);

// // Route to get all game results for the logged-in student
// // GET /api/student/game-results
// router.get('/game-results', studentController.getStudentGameResults);

// Route to save the result of a completed game
// POST /api/student/games/:wordleId/save-result
router.post('/games/:wordleId/save-result',
    validateSaveGameResult,
    studentController.saveGameResult
);




module.exports = router;