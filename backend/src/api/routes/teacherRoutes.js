// src/api/routes/teacherRoutes.js
const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController'); 
const { authenticateJWT, authorizeRole } = require('../middlewares/authMiddleware'); 
const {
    validateCreateGroup,
    validateUpdateGroup,
    validateCreateWordle,
    validateUpdateWordle,
    validateChangePassword
} = require('../middlewares/userValidation');


// Only authenticated users with the 'teacher' role can access these routes
router.use(authenticateJWT);
router.use(authorizeRole(['teacher']));

// --- Group Routes ---

// Route to create a new group
// POST /api/teacher/groups
router.post('/groups',
  validateCreateGroup, 
  teacherController.createGroup
);

// Route to get groups created by the logged-in teacher
// GET /api/teacher/groups
// NOTA: Optional query parameters: status, startDateFrom, startDateTo, endDateFrom, endDateTo -> filters
router.get('/groups', teacherController.getTeacherGroups);

// Route to get details of a specific group
// GET /api/teacher/groups/:groupId
router.get('/groups/:groupId', teacherController.getGroupDetails);

// Route to update a specific group
// PUT /api/teacher/groups/:groupId
router.put('/groups/:groupId',
  validateUpdateGroup, 
  teacherController.updateGroup
);

// Route to delete a specific group
// DELETE /api/teacher/groups/:groupId
router.delete('/groups/:groupId', teacherController.deleteGroup);

// --- Other Teacher Routes ---

// Route to change the password for the logged-in teacher
// PUT /api/teacher/change-password
router.put('/change-password',
    validateChangePassword, 
    teacherController.changePassword
);

// --- Game Result Routes for Teacher ---

// Route to get game results for a specific student
// GET /api/teacher/game-results/student/:userId
router.get('/game-results/student/:userId', teacherController.getStudentGameResultsForTeacher);

// Route to get game results for a specific wordle
// GET /api/teacher/game-results/wordle/:wordleId
router.get('/game-results/wordle/:wordleId', teacherController.getWordleGameResultsForTeacher);

// Route to get game results for a specific group
// GET /api/teacher/game-results/group/:groupId
router.get('/game-results/group/:groupId', teacherController.getGroupGameResultsForTeacher);

// Route to get details of a specific game result
// GET /api/teacher/game-results/:gameResultId
router.get('/game-results/:gameResultId', teacherController.getGameResultDetailsForTeacher);


// --- Wordle Routes ---

// Route to get wordles created by the logged-in teacher
// GET /api/teacher/wordles
router.get('/wordles', teacherController.getTeacherWordles);

// Route to create a new wordle
// POST /api/teacher/wordles
router.post('/wordles',
  validateCreateWordle,
  teacherController.createWordle
);

// Route to get details of a specific wordle
// GET /api/teacher/wordles/:wordleId
router.get('/wordles/:wordleId', teacherController.getWordleDetails);

// Route to update a specific wordle
// PUT /api/teacher/wordles/:wordleId
router.put('/wordles/:wordleId',
  validateUpdateWordle, 
  teacherController.updateWordle
);

// Route to delete a specific wordle
// DELETE /api/teacher/wordles/:wordleId
router.delete('/wordles/:wordleId', teacherController.deleteWordle);





module.exports = router;
