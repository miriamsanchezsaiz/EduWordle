// src/api/routes/index.js (Updated)
const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const studentRoutes = require('./studentRoutes'); // Import student routes
const teacherRoutes = require('./teacherRoutes'); // Import teacher routes


// Mount the auth routes under the /auth path
router.use('/auth', authRoutes);

// Mount the student routes under the /student path
router.use('/student', studentRoutes);

// Mount the teacher routes under the /teacher path
router.use('/teacher', teacherRoutes);

// If you have game routes not covered by student/teacher prefixes:
// const gameRoutes = require('./gameRoutes');
// router.use('/game', gameRoutes);


module.exports = router;