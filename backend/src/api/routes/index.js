// src/api/routes/index.js (Updated)
const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const studentRoutes = require('./studentRoutes'); 
const teacherRoutes = require('./teacherRoutes'); 


// Mount the auth routes under the /auth path
router.use('/auth', authRoutes);

// Mount the student routes under the /student path
router.use('/student', studentRoutes);

// Mount the teacher routes under the /teacher path
router.use('/teacher', teacherRoutes);



module.exports = router;