// __tests__/api/teacherWordles.test.js
const request = require('supertest');
const app = require('../../../app'); // Assuming your Express app is exported from src/app.js
const sequelize = require('../../config/database'); // Import sequelize for DB operations
const { User, Wordle, Word, Question, Group, WordleGroup } = require('../../api/models'); // Import models
const userService = require('../../api/services/userService.js'); // Import userService to create users

// Ensure NODE_ENV=test is set when running these tests to use the test database

describe('Teacher Wordles Endpoints (Integration Tests)', () => {
  // Define test users and data
  const testTeacherCredentials = {
    name: 'Teacher Wordles Test',
    email: 'teacher_wordles_test@example.com',
    password: 'Password123!',
    role: 'teacher',
  };
   const testStudentCredentials = {
    name: 'Student Wordle Test',
    email: 'student_wordle_test@example.com',
    password: 'StudentP@ssw0rd456!',
    role: 'student',
  };
    const testOtherTeacherCredentials = {
    name: 'Other Teacher Wordle',
    email: 'other_teacher_wordles@example.com',
    password: 'OtherTeacherP@ssw0rd456!',
    role: 'teacher',
  };


  // Store authenticated teacher token and user object
  let teacherAuthToken;
  let teacherUser;
  let studentUser;
  let otherTeacherUser;

  // Store created data IDs needed across tests
  let teacherWordleId1;
  let teacherWordleId2; // For update/delete tests
  let otherTeacherWordleId;
  let teacherGroupId1; // For group access tests

  // Before running any tests in this suite, synchronize the database and create base users/data
  beforeAll(async () => {
    // Connect to the test database and recreate schema
    // WARNING: This will drop all tables! Only use in your dedicated test environment.
    await sequelize.sync({ force: true });

    // Create base users directly in the database using the service to ensure hashing
    teacherUser = await userService.createUser(
        testTeacherCredentials.email,
        testTeacherCredentials.name,
        testTeacherCredentials.password,
        testTeacherCredentials.role
    );
     studentUser = await userService.createUser(
        testStudentCredentials.email,
        testStudentCredentials.name,
        testStudentCredentials.password,
        testStudentCredentials.role
    );
     otherTeacherUser = await userService.createUser(
        testOtherTeacherCredentials.email,
        testOtherTeacherCredentials.name,
        testOtherTeacherCredentials.password,
        testOtherTeacherCredentials.role
    );


    // Login the teacher to get a token for protected routes
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testTeacherCredentials.email,
        password: testTeacherCredentials.password,
      });
    teacherAuthToken = loginRes.body.token;

     // Create a group for the teacher to use in wordle access tests
     const groupData = {
         name: 'Teacher Group for Wordle Access',
         startDate: '2025-01-01',
         endDate: null,
         studentEmails: [],
     };
     const groupRes = await request(app)
        .post('/api/teacher/groups')
        .set('Authorization', `Bearer ${teacherAuthToken}`)
        .send(groupData);
     teacherGroupId1 = groupRes.body.id;

  });

  // After all tests in this suite are done, close the database connection
  afterAll(async () => {
    await sequelize.close();
  });

   // Optional: Clean up data before each test if needed
   // beforeEach(async () => {
   //     // Clean up specific data if needed, e.g., delete wordles created in previous tests
   //     await Wordle.destroy({ where: {}, truncate: true });
   //     await Word.destroy({ where: {}, truncate: true });
   //     await Question.destroy({ where: {}, truncate: true });
   //     await WordleGroup.destroy({ where: {}, truncate: true });
   // });


  // --- Test Suite for POST /api/teacher/wordles ---
  describe('POST /api/teacher/wordles', () => {
    const wordleData = {
      name: 'New Test Wordle',
      word: { title: 'INTEGRATION', hint: 'Used in testing' },
      questions: [
        { type: 'single', statement: 'Is this a test?', answer: 'yes', options: ['yes', 'no'] },
        { type: 'multychoice', statement: 'What are test types?', answer: ['unit', 'integration'], options: ['unit', 'integration', 'e2e'] },
      ],
      groupAccessIds: [teacherGroupId1], // Grant access to the teacher's group
    };

    it('should create a new wordle with word, questions, and group access', async () => {
      const res = await request(app)
        .post('/api/teacher/wordles')
        .set('Authorization', `Bearer ${teacherAuthToken}`) // Use teacher token
        .send(wordleData);

      // Assertions
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', wordleData.name);
      expect(res.body).toHaveProperty('userId', teacherUser.id); // Check wordle is linked to the teacher
      expect(res.body).toHaveProperty('word');
      expect(res.body.word).toHaveProperty('word', wordleData.word.title);
      expect(res.body.word).toHaveProperty('hint', wordleData.word.hint);
      expect(res.body).toHaveProperty('questions');
      expect(res.body.questions).toBeInstanceOf(Array);
      expect(res.body.questions).toHaveLength(wordleData.questions.length);
      // Check structure of questions (options and answer should be parsed JSON)
      expect(res.body.questions[0]).toHaveProperty('question', wordleData.questions[0].statement);
      expect(res.body.questions[0]).toHaveProperty('options', wordleData.questions[0].options); // Assuming service returns parsed JSON
      expect(res.body.questions[0]).toHaveProperty('correctAnswer', wordleData.questions[0].answer); // Assuming service returns parsed JSON
      expect(res.body).toHaveProperty('groupsWithAccess');
      expect(res.body.groupsWithAccess).toBeInstanceOf(Array);
      expect(res.body.groupsWithAccess).toHaveLength(wordleData.groupAccessIds.length);
      expect(res.body.groupsWithAccess[0]).toHaveProperty('id', teacherGroupId1);


      // Verify the wordle and related data were created in the database
      const createdWordleInDB = await Wordle.findByPk(res.body.id, {
          include: [
              { model: Word, as: 'word' },
              { model: Question, as: 'questions' },
              { model: Group, as: 'groupsWithAccess' }
          ]
      });
      expect(createdWordleInDB).not.toBeNull();
      expect(createdWordleInDB.name).toBe(wordleData.name);
      expect(createdWordleInDB.userId).toBe(teacherUser.id);
      expect(createdWordleInDB.word).not.toBeNull();
      expect(createdWordleInDB.word.word).toBe(wordleData.word.title);
      expect(createdWordleInDB.questions).toHaveLength(wordleData.questions.length);
      expect(createdWordleInDB.groupsWithAccess).toHaveLength(wordleData.groupAccessIds.length);
      expect(createdWordleInDB.groupsWithAccess[0].id).toBe(teacherGroupId1);


      // Store the created wordle ID for later tests
      teacherWordleId1 = res.body.id;
    });

     it('should create a wordle with no group access if groupAccessIds array is empty', async () => {
        const wordleDataNoGroups = {
            name: 'Wordle No Groups',
            word: { title: 'NOGROUP', hint: 'No access initially' },
            questions: [{ type: 'single', statement: 'Q?', answer: 'Yes', options: ['Yes', 'No'] }],
            groupAccessIds: [], // Empty group list
        };

        const res = await request(app)
            .post('/api/teacher/wordles')
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send(wordleDataNoGroups);

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('name', wordleDataNoGroups.name);
        expect(res.body).toHaveProperty('groupsWithAccess', []); // No groups linked

        // Verify in DB
        const createdWordleInDB = await Wordle.findByPk(res.body.id, {
            include: [{ model: Group, as: 'groupsWithAccess' }]
        });
        expect(createdWordleInDB).not.toBeNull();
        expect(createdWordleInDB.groupsWithAccess).toHaveLength(0);

        // Store the created wordle ID for update/delete tests
        teacherWordleId2 = res.body.id;
     });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/teacher/wordles')
        .send(wordleData); // No Authorization header

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });

     it('should return 403 if authenticated as a student', async () => {
         const studentLoginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testStudentCredentials.email, password: testStudentCredentials.password });
         const studentAuthToken = studentLoginRes.body.token;

        const res = await request(app)
            .post('/api/teacher/wordles')
            .set('Authorization', `Bearer ${studentAuthToken}`) // Use student token
            .send(wordleData);

        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty('message', 'Forbidden');
     });


    it('should return 400 for missing required fields', async () => {
        // Test missing name
        let res = await request(app)
            .post('/api/teacher/wordles')
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send({ word: { title: 'W' }, questions: [{ type: 'single', statement: 'Q?', answer: 'Y', options: ['Y'] }] });

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toEqual(expect.arrayContaining([
             expect.objectContaining({ msg: 'Wordle name is required' })
        ]));

         // Test missing word title
        res = await request(app)
            .post('/api/teacher/wordles')
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send({ name: 'No Word', word: { hint: 'H' }, questions: [{ type: 'single', statement: 'Q?', answer: 'Y', options: ['Y'] }] });

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
         expect(res.body.errors).toEqual(expect.arrayContaining([
             expect.objectContaining({ msg: 'Word title is required' })
        ]));

        // Test missing questions
        res = await request(app)
            .post('/api/teacher/wordles')
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send({ name: 'No Qs', word: { title: 'WQ' }, questions: [] });

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
         expect(res.body.errors).toEqual(expect.arrayContaining([
             expect.objectContaining({ msg: 'At least one question is required' })
        ]));
    });

     it('should return 400 for invalid question data', async () => {
        const invalidWordleData = {
            name: 'Invalid Q Data',
            word: { title: 'INVALIDQ', hint: 'Bad data' },
            questions: [
                 { type: 'single', statement: 'Q1', answer: 'A', options: ['A'] },
                 { type: 'invalid-type', statement: 'Q2', answer: 'B', options: ['B'] }, // Invalid type
            ],
            groupAccessIds: [],
        };

        const res = await request(app)
            .post('/api/teacher/wordles')
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send(invalidWordleData);

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toEqual(expect.arrayContaining([
             expect.objectContaining({ msg: 'Invalid question type for question 2' })
        ]));
     });

      it('should return 400 if teacher does not own a group in groupAccessIds', async () => {
         // Create a group for the other teacher
         const otherTeacherGroupData = {
                name: 'Group for Other Teacher',
                startDate: '2025-01-01',
                endDate: null,
                studentEmails: [],
           };
           const otherTeacherLoginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: testOtherTeacherCredentials.email, password: testOtherTeacherCredentials.password });
           const otherTeacherAuthToken = otherTeacherLoginRes.body.token;

           const groupRes = await request(app)
                .post('/api/teacher/groups')
                .set('Authorization', `Bearer ${otherTeacherAuthToken}`)
                .send(otherTeacherGroupData);
           const otherTeacherGroupId = groupRes.body.id;


          const invalidWordleData = {
            name: 'Access Other Group',
            word: { title: 'OTHERGROUP', hint: 'Access' },
            questions: [{ type: 'single', statement: 'Q?', answer: 'Y', options: ['Y'] }],
            groupAccessIds: [teacherGroupId1, otherTeacherGroupId], // Includes a group not owned by this teacher
        };

        const res = await request(app)
            .post('/api/teacher/wordles')
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send(invalidWordleData);

        expect(res.statusCode).toBe(400); // Or 403 depending on your validation/error handling
        expect(res.body).toHaveProperty('message', `Cannot grant access to groups not owned by the teacher: ${otherTeacherGroupId}`); // Check the specific error message
      });
  });


  // --- Test Suite for GET /api/teacher/wordles ---
  describe('GET /api/teacher/wordles', () => {

      // Create a wordle for the other teacher to ensure filtering works
      beforeAll(async () => {
           const otherTeacherWordleData = {
                name: 'Other Teacher Wordle',
                word: { title: 'OTHERW', hint: 'Other' },
                questions: [{ type: 'single', statement: 'Q?', answer: 'Y', options: ['Y'] }],
                groupAccessIds: [],
           };
           const otherTeacherLoginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: testOtherTeacherCredentials.email, password: testOtherTeacherCredentials.password });
           const otherTeacherAuthToken = otherTeacherLoginRes.body.token;

           const res = await request(app)
                .post('/api/teacher/wordles')
                .set('Authorization', `Bearer ${otherTeacherAuthToken}`)
                .send(otherTeacherWordleData);
           otherTeacherWordleId = res.body.id;
      });


      it('should return all wordles created by the authenticated teacher', async () => {
          const res = await request(app)
            .get('/api/teacher/wordles')
            .set('Authorization', `Bearer ${teacherAuthToken}`); // Use teacher token

          // Assertions
          expect(res.statusCode).toBe(200);
          expect(res.body).toBeInstanceOf(Array);
          // Expect to see the wordles created by teacherUser, but not by otherTeacherUser
          expect(res.body.length).toBeGreaterThanOrEqual(2); // Should include teacherWordleId1 and teacherWordleId2
          expect(res.body.some(wordle => wordle.id === teacherWordleId1)).toBe(true);
          expect(res.body.some(wordle => wordle.id === teacherWordleId2)).toBe(true);
          expect(res.body.some(wordle => wordle.id === otherTeacherWordleId)).toBe(false); // Should not include other teacher's wordle

          // Check the structure of returned wordles
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('name');
          expect(res.body[0]).toHaveProperty('word');
          expect(res.body[0].word).toHaveProperty('word'); // Should include the word title
      });


      it('should return 401 if not authenticated', async () => {
        const res = await request(app)
          .get('/api/teacher/wordles'); // No Authorization header

        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Unauthorized');
      });

       it('should return 403 if authenticated as a student', async () => {
         const studentLoginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testStudentCredentials.email, password: testStudentCredentials.password });
         const studentAuthToken = studentLoginRes.body.token;

        const res = await request(app)
            .get('/api/teacher/wordles')
            .set('Authorization', `Bearer ${studentAuthToken}`); // Use student token

        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty('message', 'Forbidden');
     });

  });


  // --- Test Suite for GET /api/teacher/wordles/:wordleId ---
  describe('GET /api/teacher/wordles/:wordleId', () => {

      it('should return details for a specific wordle created by the teacher', async () => {
          const res = await request(app)
            .get(`/api/teacher/wordles/${teacherWordleId1}`) // Use a wordle ID created by this teacher
            .set('Authorization', `Bearer ${teacherAuthToken}`);

          // Assertions
          expect(res.statusCode).toBe(200);
          expect(res.body).toHaveProperty('id', teacherWordleId1);
          expect(res.body).toHaveProperty('name', 'New Test Wordle'); // Check name from creation
          expect(res.body).toHaveProperty('userId', teacherUser.id);
          expect(res.body).toHaveProperty('word'); // Should include word details
          expect(res.body.word).toHaveProperty('word', 'INTEGRATION');
          expect(res.body.word).toHaveProperty('hint', 'Used in testing');
          expect(res.body).toHaveProperty('questions'); // Should include questions
          expect(res.body.questions).toBeInstanceOf(Array);
          expect(res.body.questions.length).toBeGreaterThanOrEqual(1);
           // Check question structure (options/answer should be parsed JSON)
          expect(res.body.questions[0]).toHaveProperty('options');
          expect(res.body.questions[0].options).toBeInstanceOf(Array);
          expect(res.body.questions[0]).toHaveProperty('correctAnswer');
          expect(res.body.questions[0].correctAnswer).toBeInstanceOf(String); // Assuming single answer is string
          expect(res.body).toHaveProperty('groupsWithAccess'); // Should include groups with access
          expect(res.body.groupsWithAccess).toBeInstanceOf(Array);
          expect(res.body.groupsWithAccess.length).toBeGreaterThanOrEqual(1);
          expect(res.body.groupsWithAccess[0]).toHaveProperty('id', teacherGroupId1);
      });

      it('should return 404 if the wordle is not found', async () => {
          const nonExistentWordleId = 99999; // An ID that should not exist

          const res = await request(app)
            .get(`/api/teacher/wordles/${nonExistentWordleId}`)
            .set('Authorization', `Bearer ${teacherAuthToken}`);

          expect(res.statusCode).toBe(404);
          expect(res.body).toHaveProperty('message', 'Wordle not found');
      });

       it('should return 404 if the wordle is found but not created by the teacher', async () => {
           // Use a wordle ID created by the other teacher
           const res = await request(app)
            .get(`/api/teacher/wordles/${otherTeacherWordleId}`)
            .set('Authorization', `Bearer ${teacherAuthToken}`); // Authenticated as the first teacher

          // The service should return null if the wordle doesn't belong to the teacher,
          // and the controller should return 404 in that case.
          expect(res.statusCode).toBe(404);
          expect(res.body).toHaveProperty('message', 'Wordle not found'); // Or similar message indicating not found/unauthorized
       });


      it('should return 401 if not authenticated', async () => {
        const res = await request(app)
          .get(`/api/teacher/wordles/${teacherWordleId1}`); // No Authorization header

        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Unauthorized');
      });

       it('should return 403 if authenticated as a student', async () => {
          const studentLoginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testStudentCredentials.email, password: testStudentCredentials.password });
         const studentAuthToken = studentLoginRes.body.token;

        const res = await request(app)
            .get(`/api/teacher/wordles/${teacherWordleId1}`)
            .set('Authorization', `Bearer ${studentAuthToken}`); // Use student token

        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty('message', 'Forbidden');
     });

  });

  // --- Test Suite for PUT /api/teacher/wordles/:wordleId ---
  describe('PUT /api/teacher/wordles/:wordleId', () => {
      const updateData = {
          name: 'Updated Wordle Name',
          word: { title: 'UPDATED', hint: 'New Hint' },
          questions: [
              { id: 1, type: 'single', statement: 'Q1 Updated', answer: 'Yes', options: ['Yes', 'No'] }, // Update existing (assuming ID 1 exists or will be created)
              { type: 'multychoice', statement: 'New Q', answer: ['X', 'Y'], options: ['X', 'Y', 'Z'] }, // Create new
          ],
          groupAccessIds: [], // Remove all group access
      };

      // Create a wordle with specific questions and group access for update testing
       let wordleToUpdateId;
       let originalQuestionId1;
       let originalQuestionId2;
       let originalGroupAccessId;

       beforeAll(async () => {
            const wordleDataForUpdate = {
                name: 'Wordle For Update',
                word: { title: 'TOUPDATE', hint: 'Old Hint' },
                questions: [
                    { type: 'single', statement: 'Q1 Original', answer: 'A', options: ['A', 'B'] },
                    { type: 'multychoice', statement: 'Q2 Original', answer: ['C'], options: ['C', 'D'] },
                ],
                groupAccessIds: [teacherGroupId1], // Link to the teacher's group
            };
            const res = await request(app)
                .post('/api/teacher/wordles')
                .set('Authorization', `Bearer ${teacherAuthToken}`)
                .send(wordleDataForUpdate);
            wordleToUpdateId = res.body.id;

            // Fetch the created questions and group access to get their IDs
            const createdWordle = await Wordle.findByPk(wordleToUpdateId, {
                 include: [
                    { model: Question, as: 'questions' },
                    { model: Group, as: 'groupsWithAccess' }
                 ]
            });
            originalQuestionId1 = createdWordle.questions.find(q => q.statement === 'Q1 Original').id;
            originalQuestionId2 = createdWordle.questions.find(q => q.statement === 'Q2 Original').id;
            originalGroupAccessId = createdWordle.groupsWithAccess[0].id;

            // Update the updateData to use the actual original question ID
            updateData.questions[0].id = originalQuestionId1;

       });


      it('should update wordle details, word, questions, and group access', async () => {
          const res = await request(app)
            .put(`/api/teacher/wordles/${wordleToUpdateId}`) // Update the wordle created for this test
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send(updateData);

          // Assertions
          expect(res.statusCode).toBe(200);
          expect(res.body).toHaveProperty('id', wordleToUpdateId);
          expect(res.body).toHaveProperty('name', updateData.name);
          expect(res.body).toHaveProperty('word');
          expect(res.body.word).toHaveProperty('word', updateData.word.title);
          expect(res.body.word).toHaveProperty('hint', updateData.word.hint);
          expect(res.body).toHaveProperty('questions');
          expect(res.body.questions).toBeInstanceOf(Array);
          // Expect 2 questions: updated original Q1 and the new Q
          expect(res.body.questions).toHaveLength(2);
          const updatedQ1 = res.body.questions.find(q => q.id === originalQuestionId1);
          expect(updatedQ1).not.toBeNull();
          expect(updatedQ1).toHaveProperty('statement', updateData.questions[0].statement);
          const newQ = res.body.questions.find(q => q.statement === updateData.questions[1].statement);
          expect(newQ).not.toBeNull();
          expect(res.body).toHaveProperty('groupsWithAccess', []); // Expect no groups linked

          // Verify changes in the database
          const updatedWordleInDB = await Wordle.findByPk(wordleToUpdateId, {
               include: [
                    { model: Word, as: 'word' },
                    { model: Question, as: 'questions' },
                    { model: Group, as: 'groupsWithAccess' }
                 ]
          });
          expect(updatedWordleInDB.name).toBe(updateData.name);
          expect(updatedWordleInDB.word.word).toBe(updateData.word.title);
          expect(updatedWordleInDB.word.hint).toBe(updateData.word.hint);
          expect(updatedWordleInDB.questions).toHaveLength(2); // Updated Q1 and new Q
          expect(updatedWordleInDB.questions.some(q => q.id === originalQuestionId2)).toBe(false); // Original Q2 should be deleted
          expect(updatedWordleInDB.groupsWithAccess).toHaveLength(0); // Group access removed

          // Verify group link was deleted
          const wordleGroupLink = await WordleGroup.findOne({ where: { wordle_id: wordleToUpdateId, group_id: originalGroupAccessId } });
          expect(wordleGroupLink).toBeNull();
      });

       it('should update only the name if only name is provided', async () => {
          const partialUpdateData = { name: 'Only Name Change' };

          const res = await request(app)
            .put(`/api/teacher/wordles/${teacherWordleId1}`) // Update the first wordle created
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send(partialUpdateData);

          // Assertions
          expect(res.statusCode).toBe(200);
          expect(res.body).toHaveProperty('id', teacherWordleId1);
          expect(res.body).toHaveProperty('name', partialUpdateData.name);
          // Check that word, questions, groups were not changed (based on original creation)
          expect(res.body).toHaveProperty('word');
          expect(res.body.word).toHaveProperty('word', 'INTEGRATION'); // Original word title
          expect(res.body).toHaveProperty('questions');
          expect(res.body.questions).toHaveLength(2); // Original number of questions
          expect(res.body).toHaveProperty('groupsWithAccess');
          expect(res.body.groupsWithAccess).toHaveLength(1); // Original number of groups
      });


      it('should return 404 if the wordle is not found', async () => {
          const nonExistentWordleId = 99999;

          const res = await request(app)
            .put(`/api/teacher/wordles/${nonExistentWordleId}`)
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send(updateData);

          expect(res.statusCode).toBe(404);
          expect(res.body).toHaveProperty('message', 'Wordle not found');
      });

       it('should return 404 if the wordle is found but not created by the teacher', async () => {
           const res = await request(app)
            .put(`/api/teacher/wordles/${otherTeacherWordleId}`)
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send(updateData);

          expect(res.statusCode).toBe(404);
          expect(res.body).toHaveProperty('message', 'Wordle not found');
       });


      it('should return 401 if not authenticated', async () => {
        const res = await request(app)
          .put(`/api/teacher/wordles/${teacherWordleId1}`)
          .send(updateData); // No Authorization header

        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Unauthorized');
      });

       it('should return 403 if authenticated as a student', async () => {
         const studentLoginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testStudentCredentials.email, password: testStudentCredentials.password });
         const studentAuthToken = studentLoginRes.body.token;

        const res = await request(app)
            .put(`/api/teacher/wordles/${teacherWordleId1}`)
            .set('Authorization', `Bearer ${studentAuthToken}`)
            .send(updateData);

        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty('message', 'Forbidden');
     });

     it('should return 400 for invalid question data in update', async () => {
        const invalidUpdateData = {
            questions: [
                 { id: originalQuestionId1, type: 'invalid-type', statement: 'Q1 Updated', answer: 'A', options: ['A'] }, // Invalid type
            ],
        };

        const res = await request(app)
            .put(`/api/teacher/wordles/${wordleToUpdateId}`)
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send(invalidUpdateData);

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toEqual(expect.arrayContaining([
             expect.objectContaining({ msg: 'Invalid question type for question 1' })
        ]));
     });

      it('should return 400 if teacher does not own a group in groupAccessIds update', async () => {
         // Use the group created for the other teacher in the GET /wordles test
          const invalidUpdateData = {
            groupAccessIds: [teacherGroupId1, otherTeacherGroupId], // Includes a group not owned by this teacher
        };

        const res = await request(app)
            .put(`/api/teacher/wordles/${wordleToUpdateId}`)
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send(invalidUpdateData);

        expect(res.statusCode).toBe(400); // Or 403
        expect(res.body).toHaveProperty('message', `Cannot grant access to groups not owned by the teacher: ${otherTeacherGroupId}`); // Check the specific error message
      });

  });


  // --- Test Suite for DELETE /api/teacher/wordles/:wordleId ---
  describe('DELETE /api/teacher/wordles/:wordleId', () => {

      // Use teacherWordleId2 created earlier for deletion testing

      it('should delete a wordle created by the teacher', async () => {
          const res = await request(app)
            .delete(`/api/teacher/wordles/${teacherWordleId2}`) // Delete the second wordle created
            .set('Authorization', `Bearer ${teacherAuthToken}`);

          // Assertions
          expect(res.statusCode).toBe(200);
          expect(res.body).toHaveProperty('message', 'Wordle deleted successfully');

          // Verify the wordle and related data were deleted from the database
          const deletedWordleInDB = await Wordle.findByPk(teacherWordleId2);
          expect(deletedWordleInDB).toBeNull();

          // Verify related data (Word, Questions, WordleGroup) were also deleted (cascaded)
          const deletedWord = await Word.findOne({ where: { wordleId: teacherWordleId2 } });
          expect(deletedWord).toBeNull();
          const deletedQuestions = await Question.findAll({ where: { wordleId: teacherWordleId2 } });
          expect(deletedQuestions).toHaveLength(0);
          const deletedWordleGroups = await WordleGroup.findAll({ where: { wordleId: teacherWordleId2 } });
          expect(deletedWordleGroups).toHaveLength(0);
      });

      it('should return 404 if the wordle is not found', async () => {
          const nonExistentWordleId = 99999;

          const res = await request(app)
            .delete(`/api/teacher/wordles/${nonExistentWordleId}`)
            .set('Authorization', `Bearer ${teacherAuthToken}`);

          expect(res.statusCode).toBe(404);
          expect(res.body).toHaveProperty('message', 'Wordle not found');
      });

       it('should return 404 if the wordle is found but not created by the teacher', async () => {
           // Attempt to delete a wordle created by the other teacher
           const res = await request(app)
            .delete(`/api/teacher/wordles/${otherTeacherWordleId}`)
            .set('Authorization', `Bearer ${teacherAuthToken}`); // Authenticated as the first teacher

          expect(res.statusCode).toBe(404);
          expect(res.body).toHaveProperty('message', 'Wordle not found'); // Or similar message indicating not found/unauthorized
       });


      it('should return 401 if not authenticated', async () => {
        const res = await request(app)
          .delete(`/api/teacher/wordles/${teacherWordleId1}`); // Use a valid ID, but no token

        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Unauthorized');
      });

       it('should return 403 if authenticated as a student', async () => {
         const studentLoginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testStudentCredentials.email, password: testStudentCredentials.password });
         const studentAuthToken = studentLoginRes.body.token;

        const res = await request(app)
            .delete(`/api/teacher/wordles/${teacherWordleId1}`)
            .set('Authorization', `Bearer ${studentAuthToken}`); // Use student token

        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty('message', 'Forbidden');
     });

  });

});
