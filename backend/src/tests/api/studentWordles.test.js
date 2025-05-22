// __tests__/api/studentWordles.test.js
const request = require('supertest');
const app = require('../../../app'); // Assuming your Express app is exported from src/app.js
const sequelize = require('../../config/database'); // Import sequelize for DB operations
const { User, Group, StudentGroup, Wordle, Word, Question, WordleGroup, GameResult } = require('../../api/models'); // Import models
const userService = require('../../api/services/userService'); // Import userService to create users
const { Op } = require('sequelize'); // Import Op for date filtering checks

// Ensure NODE_ENV=test is set when running these tests to use the test database

describe('Student Wordles Endpoints (Integration Tests)', () => {
  // Define test users and data
  const testTeacherCredentials = {
    name: 'Teacher Student Wordle Test',
    email: 'teacher_student_wordle@example.com',
    password: 'Password123!',
    role: 'teacher',
  };
   const testStudentCredentials = {
    name: 'Student Wordle Test',
    email: 'student_wordle_test@example.com',
    password: 'StudentP@ssw0rd456!',
    role: 'student',
  };
    const testOtherStudentCredentials = {
    name: 'Other Student',
    email: 'other_student_wordle@example.com',
    password: 'OtherStudentP@ssw0rd456!',
    role: 'student',
  };


  // Store authenticated student token and user object
  let studentAuthToken;
  let studentUser;
  let teacherUser;
  let otherStudentUser;

  // Store created data IDs needed across tests
  let teacherGroupId1; // Group the student is in
  let teacherGroupId2; // Another group the student is NOT in
  let teacherWordleId1; // Accessible wordle via group 1
  let teacherWordleId2; // Accessible wordle via group 1 and 2
  let teacherWordleId3; // Not accessible initially
  let otherTeacherWordleId; // Not accessible

  // Mock the Date object to control time-based logic in tests (e.g., active/inactive groups/wordles)
  const mockDate = new Date('2025-05-10T10:00:00Z');
  const originalDate = global.Date;

  global.Date = jest.fn(() => mockDate);
  global.Date.now = jest.fn(() => mockDate.getTime());
  global.Date.parse = jest.fn(originalDate.parse);
  global.Date.UTC = jest.fn(originalDate.UTC);
  global.Date.prototype.getTime = jest.fn(() => mockDate.getTime()); // Mock instance getTime


  // Before running any tests in this suite, synchronize the database and create base users/data
  beforeAll(async () => {
    // Connect to the test database and recreate schema
    await sequelize.sync({ force: true });

    // Create base users using the service
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
     otherStudentUser = await userService.createUser(
        testOtherStudentCredentials.email,
        testOtherStudentCredentials.name,
        testOtherStudentCredentials.password,
        testOtherStudentCredentials.role
    );


    // Login the student to get a token for protected routes
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testStudentCredentials.email,
        password: testStudentCredentials.password,
      });
    studentAuthToken = loginRes.body.token;

     // Create groups for the teacher
     const groupData1 = { name: 'Student Accessible Group 1', startDate: '2025-01-01', endDate: null, studentEmails: [testStudentCredentials.email] }; // Student is in this group
     const groupData2 = { name: 'Student Accessible Group 2', startDate: '2025-03-01', endDate: '2025-12-31', studentEmails: [testStudentCredentials.email] }; // Student is also in this group
     const groupData3 = { name: 'Student Inaccessible Group', startDate: '2025-01-01', endDate: null, studentEmails: [] }; // Student is NOT in this group
     const groupDataInactive = { name: 'Inactive Group', startDate: '2026-01-01', endDate: null, studentEmails: [testStudentCredentials.email] }; // Student is in this group, but it's inactive

     const teacherLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testTeacherCredentials.email, password: testTeacherCredentials.password });
     const teacherAuthToken = teacherLoginRes.body.token; // Need teacher token to create groups/wordles

     const groupRes1 = await request(app).post('/api/teacher/groups').set('Authorization', `Bearer ${teacherAuthToken}`).send(groupData1);
     teacherGroupId1 = groupRes1.body.id;
     const groupRes2 = await request(app).post('/api/teacher/groups').set('Authorization', `Bearer ${teacherAuthToken}`).send(groupData2);
     const teacherGroupId2 = groupRes2.body.id; // Store if needed later, but not strictly necessary for student access tests
     const groupRes3 = await request(app).post('/api/teacher/groups').set('Authorization', `Bearer ${teacherAuthToken}`).send(groupData3);
     const teacherGroupId3 = groupRes3.body.id; // Store if needed later
      const groupResInactive = await request(app).post('/api/teacher/groups').set('Authorization', `Bearer ${teacherAuthToken}`).send(groupDataInactive);
     const teacherGroupIdInactive = groupResInactive.body.id; // Store if needed later


     // Create wordles for the teacher
     const wordleData1 = { name: 'Accessible Wordle 1', word: { title: 'TEST1', hint: 'Hint1' }, questions: [{ type: 'single', statement: 'Q1?', answer: 'A', options: ['A'] }], groupAccessIds: [teacherGroupId1] }; // Accessible via group 1
     const wordleData2 = { name: 'Accessible Wordle 2', word: { title: 'TEST2', hint: 'Hint2' }, questions: [{ type: 'single', statement: 'Q2?', answer: 'B', options: ['B'] }], groupAccessIds: [teacherGroupId1, teacherGroupId2] }; // Accessible via group 1 and 2
     const wordleData3 = { name: 'Inaccessible Wordle', word: { title: 'TEST3', hint: 'Hint3' }, questions: [{ type: 'single', statement: 'Q3?', answer: 'C', options: ['C'] }], groupAccessIds: [teacherGroupId3] }; // Accessible only via group 3 (student not in)
     const wordleDataNoGroups = { name: 'No Group Access Wordle', word: { title: 'TEST4', hint: 'Hint4' }, questions: [{ type: 'single', statement: 'Q4?', answer: 'D', options: ['D'] }], groupAccessIds: [] }; // No group access at all

     const wordleRes1 = await request(app).post('/api/teacher/wordles').set('Authorization', `Bearer ${teacherAuthToken}`).send(wordleData1);
     teacherWordleId1 = wordleRes1.body.id;
     const wordleRes2 = await request(app).post('/api/teacher/wordles').set('Authorization', `Bearer ${teacherAuthToken}`).send(wordleData2);
     teacherWordleId2 = wordleRes2.body.id;
     const wordleRes3 = await request(app).post('/api/teacher/wordles').set('Authorization', `Bearer ${teacherAuthToken}`).send(wordleData3);
     teacherWordleId3 = wordleRes3.body.id;
     const wordleResNoGroups = await request(app).post('/api/teacher/wordles').set('Authorization', `Bearer ${teacherAuthToken}`).send(wordleDataNoGroups);
     const teacherWordleIdNoGroups = wordleResNoGroups.body.id; // Store if needed later


     // Create a wordle by another teacher
      const otherTeacherLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testOtherTeacherCredentials.email, password: testOtherTeacherCredentials.password });
      const otherTeacherAuthToken = otherTeacherLoginRes.body.token;

      const otherTeacherWordleData = { name: 'Other Teacher Wordle', word: { title: 'OTEST', hint: 'OHint' }, questions: [{ type: 'single', statement: 'OQ?', answer: 'O', options: ['O'] }], groupAccessIds: [] };
      const otherTeacherWordleRes = await request(app).post('/api/teacher/wordles').set('Authorization', `Bearer ${otherTeacherAuthToken}`).send(otherTeacherWordleData);
      otherTeacherWordleId = otherTeacherWordleRes.body.id;

  });

  // After all tests in this suite are done, close the database connection
  afterAll(async () => {
    await sequelize.close();
     // Restore the original Date object
    global.Date = originalDate;
  });

   // Optional: Clean up data before each test if needed
   beforeEach(async () => {
       // Clean up game results before each test suite that creates them
       await GameResult.destroy({ where: {}, truncate: true });
   });


  // --- Test Suite for GET /api/student/wordles/accessible ---
  describe('GET /api/student/wordles/accessible', () => {

      it('should return wordles accessible to the authenticated student via active groups', async () => {
          const res = await request(app)
            .get('/api/student/wordles/accessible')
            .set('Authorization', `Bearer ${studentAuthToken}`); // Use student token

          // Assertions
          expect(res.statusCode).toBe(200);
          expect(res.body).toBeInstanceOf(Array);
          // Expect to see wordle1 and wordle2 (accessible via groups 1 and 2)
          expect(res.body.length).toBeGreaterThanOrEqual(2); // Should include at least wordle1 and wordle2
          expect(res.body.some(wordle => wordle.id === teacherWordleId1)).toBe(true);
          expect(res.body.some(wordle => wordle.id === teacherWordleId2)).toBe(true);
          // Should NOT include wordle3 (inaccessible group), wordle with no groups, or other teacher's wordle
          expect(res.body.some(wordle => wordle.id === teacherWordleId3)).toBe(false);
          // Check the structure of returned wordles (should include word details)
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('name');
          expect(res.body[0]).toHaveProperty('word');
          expect(res.body[0].word).toHaveProperty('word');
          expect(res.body[0].word).toHaveProperty('hint');
      });

      it('should return an empty array if the student is not in any active group', async () => {
          // Create a new student who is not in any group
           const studentNoGroupCredentials = {
                name: 'Student No Group',
                email: 'student_no_group@example.com',
                password: 'No_grouppass123!',
                role: 'student',
            };
            const studentNoGroupUser = await userService.createUser(
                studentNoGroupCredentials.email,
                studentNoGroupCredentials.name,
                studentNoGroupCredentials.password,
                studentNoGroupCredentials.role
            );
             const studentNoGroupLoginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: studentNoGroupCredentials.email, password: studentNoGroupCredentials.password });
            const studentNoGroupAuthToken = studentNoGroupLoginRes.body.token;


          const res = await request(app)
            .get('/api/student/wordles/accessible')
            .set('Authorization', `Bearer ${studentNoGroupAuthToken}`); // Use the no-group student's token

          expect(res.statusCode).toBe(200);
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body).toHaveLength(0); // No accessible wordles
      });


      it('should return 401 if not authenticated', async () => {
        const res = await request(app)
          .get('/api/student/wordles/accessible'); // No Authorization header

        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Unauthorized');
      });

       it('should return 403 if authenticated as a teacher', async () => {
         const teacherLoginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testTeacherCredentials.email, password: testTeacherCredentials.password });
         const teacherAuthToken = teacherLoginRes.body.token;

        const res = await request(app)
            .get('/api/student/wordles/accessible')
            .set('Authorization', `Bearer ${teacherAuthToken}`); // Use teacher token

        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty('message', 'Forbidden');
     });

  });


  // --- Test Suite for GET /api/student/wordles/:wordleId/game-data ---
  describe('GET /api/student/wordles/:wordleId/game-data', () => {

      it('should return wordle game data if the student has access', async () => {
          const res = await request(app)
            .get(`/api/student/wordles/${teacherWordleId1}/game-data`) // Accessible wordle
            .set('Authorization', `Bearer ${studentAuthToken}`); // Use student token

          // Assertions
          expect(res.statusCode).toBe(200);
          expect(res.body).toHaveProperty('id', teacherWordleId1);
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('word'); // Should include word details
          expect(res.body.word).toHaveProperty('word');
          expect(res.body.word).toHaveProperty('hint');
          expect(res.body).toHaveProperty('questions'); // Should include questions
          expect(res.body.questions).toBeInstanceOf(Array);
          expect(res.body.questions.length).toBeGreaterThanOrEqual(1);
          // Check question structure (options/answer should be parsed JSON)
          expect(res.body.questions[0]).toHaveProperty('options');
          expect(res.body.questions[0].options).toBeInstanceOf(Array);
          expect(res.body.questions[0]).toHaveProperty('correctAnswer');
          // Note: correctAnswer might be string or array depending on question type and service parsing
      });

      it('should return 404 if the wordle is not found', async () => {
          const nonExistentWordleId = 99999;

          const res = await request(app)
            .get(`/api/student/wordles/${nonExistentWordleId}/game-data`)
            .set('Authorization', `Bearer ${studentAuthToken}`);

          expect(res.statusCode).toBe(404);
          expect(res.body).toHaveProperty('message', 'Wordle not found');
      });

       it('should return 403 if the student does NOT have access to the wordle', async () => {
           const res = await request(app)
            .get(`/api/student/wordles/${teacherWordleId3}/game-data`) // Inaccessible wordle
            .set('Authorization', `Bearer ${studentAuthToken}`); // Use student token

          expect(res.statusCode).toBe(403);
          expect(res.body).toHaveProperty('message', 'Forbidden'); // Or similar message indicating no access
       });

       it('should return 403 if the wordle has no group access configured', async () => {
            const res = await request(app)
            .get(`/api/student/wordles/${teacherWordleIdNoGroups}/game-data`) // Wordle with no group access
            .set('Authorization', `Bearer ${studentAuthToken}`); // Use student token

          expect(res.statusCode).toBe(403);
          expect(res.body).toHaveProperty('message', 'Forbidden'); // Or similar message indicating no access
       });

       it('should return 403 if the wordle is created by another teacher and not shared', async () => {
            const res = await request(app)
            .get(`/api/student/wordles/${otherTeacherWordleId}/game-data`) // Other teacher's wordle
            .set('Authorization', `Bearer ${studentAuthToken}`); // Use student token

          expect(res.statusCode).toBe(403);
          expect(res.body).toHaveProperty('message', 'Forbidden'); // Or similar message indicating no access
       });


      it('should return 401 if not authenticated', async () => {
        const res = await request(app)
          .get(`/api/student/wordles/${teacherWordleId1}/game-data`); // Accessible wordle, but no token

        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Unauthorized');
      });

       it('should return 403 if authenticated as a teacher', async () => {
         const teacherLoginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testTeacherCredentials.email, password: testTeacherCredentials.password });
         const teacherAuthToken = teacherLoginRes.body.token;

        const res = await request(app)
            .get(`/api/student/wordles/${teacherWordleId1}/game-data`)
            .set('Authorization', `Bearer ${teacherAuthToken}`); // Use teacher token

        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty('message', 'Forbidden');
     });

  });


  // --- Test Suite for POST /api/student/games/:wordleId/save-result ---
  describe('POST /api/student/games/:wordleId/save-result', () => {
      const scoreData = { score: 150 };

      it('should save a new game result if none exists for the wordle', async () => {
          const res = await request(app)
            .post(`/api/student/games/${teacherWordleId1}/save-result`) // Accessible wordle
            .set('Authorization', `Bearer ${studentAuthToken}`)
            .send(scoreData);

          // Assertions
          expect(res.statusCode).toBe(201); // Created
          expect(res.body).toHaveProperty('message', 'New game result created');
          expect(res.body).toHaveProperty('gameResult');
          expect(res.body.gameResult).toHaveProperty('id');
          expect(res.body.gameResult).toHaveProperty('userId', studentUser.id);
          expect(res.body.gameResult).toHaveProperty('wordleId', teacherWordleId1);
          expect(res.body.gameResult).toHaveProperty('score', scoreData.score);
          expect(res.body.gameResult).toHaveProperty('creationDate');

          // Verify in DB
          const savedResultInDB = await GameResult.findOne({
              where: { userId: studentUser.id, wordleId: teacherWordleId1 }
          });
          expect(savedResultInDB).not.toBeNull();
          expect(savedResultInDB.score).toBe(scoreData.score);
      });

       it('should update the game result if a higher score is submitted', async () => {
           // Create an existing result with a lower score
           await GameResult.create({ userId: studentUser.id, wordleId: teacherWordleId1, score: 100 });

           const res = await request(app)
            .post(`/api/student/games/${teacherWordleId1}/save-result`) // Accessible wordle
            .set('Authorization', `Bearer ${studentAuthToken}`)
            .send(scoreData); // Higher score (150)

          // Assertions
          expect(res.statusCode).toBe(200); // OK (Updated)
          expect(res.body).toHaveProperty('message', 'Game result updated with a higher score');
          expect(res.body).toHaveProperty('gameResult');
          expect(res.body.gameResult).toHaveProperty('score', scoreData.score); // Score should be updated

          // Verify in DB
          const updatedResultInDB = await GameResult.findOne({
              where: { userId: studentUser.id, wordleId: teacherWordleId1 }
          });
          expect(updatedResultInDB).not.toBeNull();
          expect(updatedResultInDB.score).toBe(scoreData.score); // Check updated score
       });

       it('should NOT update the game result if a lower or equal score is submitted', async () => {
           // Create an existing result with a higher score
           await GameResult.create({ userId: studentUser.id, wordleId: teacherWordleId1, score: 200 });

           const res = await request(app)
            .post(`/api/student/games/${teacherWordleId1}/save-result`) // Accessible wordle
            .set('Authorization', `Bearer ${studentAuthToken}`)
            .send(scoreData); // Lower score (150)

          // Assertions
          expect(res.statusCode).toBe(200); // OK (No change)
          expect(res.body).toHaveProperty('message', 'Existing game result has a higher or equal score');
          expect(res.body).toHaveProperty('gameResult');
          expect(res.body.gameResult).toHaveProperty('score', 200); // Score should NOT be updated

           // Create an existing result with an equal score
           await GameResult.destroy({ where: { userId: studentUser.id, wordleId: teacherWordleId1 } }); // Clean up previous
           await GameResult.create({ userId: studentUser.id, wordleId: teacherWordleId1, score: 150 }); // Equal score (150)

           const resEqual = await request(app)
            .post(`/api/student/games/${teacherWordleId1}/save-result`)
            .set('Authorization', `Bearer ${studentAuthToken}`)
            .send(scoreData); // Equal score (150)

          expect(resEqual.statusCode).toBe(200);
          expect(resEqual.body).toHaveProperty('message', 'Existing game result has a higher or equal score');
          expect(resEqual.body).toHaveProperty('gameResult');
          expect(resEqual.body.gameResult).toHaveProperty('score', 150); // Score should NOT be updated
       });


      it('should return 404 if the wordle is not found', async () => {
          const nonExistentWordleId = 99999;

          const res = await request(app)
            .post(`/api/student/games/${nonExistentWordleId}/save-result`)
            .set('Authorization', `Bearer ${studentAuthToken}`)
            .send(scoreData);

          expect(res.statusCode).toBe(404);
          expect(res.body).toHaveProperty('message', 'Wordle not found');
      });

       it('should return 403 if the student does NOT have access to the wordle', async () => {
           const res = await request(app)
            .post(`/api/student/games/${teacherWordleId3}/save-result`) // Inaccessible wordle
            .set('Authorization', `Bearer ${studentAuthToken}`)
            .send(scoreData);

          expect(res.statusCode).toBe(403);
          expect(res.body).toHaveProperty('message', 'Forbidden'); // Or similar message indicating no access
       });


      it('should return 401 if not authenticated', async () => {
        const res = await request(app)
          .post(`/api/student/games/${teacherWordleId1}/save-result`)
          .send(scoreData); // No Authorization header

        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Unauthorized');
      });

       it('should return 403 if authenticated as a teacher', async () => {
         const teacherLoginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testTeacherCredentials.email, password: testTeacherCredentials.password });
         const teacherAuthToken = teacherLoginRes.body.token;

        const res = await request(app)
            .post(`/api/student/games/${teacherWordleId1}/save-result`)
            .set('Authorization', `Bearer ${teacherAuthToken}`) // Use teacher token
            .send(scoreData);

        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty('message', 'Forbidden');
     });

      it('should return 400 for missing score in request body', async () => {
           const res = await request(app)
            .post(`/api/student/games/${teacherWordleId1}/save-result`)
            .set('Authorization', `Bearer ${studentAuthToken}`)
            .send({}); // Empty body

          expect(res.statusCode).toBe(400);
          expect(res.body).toHaveProperty('errors');
           expect(res.body.errors).toEqual(expect.arrayContaining([
             expect.objectContaining({ msg: 'Score is required' })
          ]));
      });

       it('should return 400 for invalid score format', async () => {
           const res = await request(app)
            .post(`/api/student/games/${teacherWordleId1}/save-result`)
            .set('Authorization', `Bearer ${studentAuthToken}`)
            .send({ score: 'not-a-number' }); // Invalid score

          expect(res.statusCode).toBe(400);
          expect(res.body).toHaveProperty('errors');
           expect(res.body.errors).toEqual(expect.arrayContaining([
             expect.objectContaining({ msg: 'Score must be a number' })
          ]));
       });

  });


  // --- Test Suite for GET /api/student/game-results ---
  describe('GET /api/student/game-results', () => {

      // Create some game results for the student
      beforeAll(async () => {
           await GameResult.create({ userId: studentUser.id, wordleId: teacherWordleId1, score: 100, creationDate: new Date('2025-05-01') });
           await GameResult.create({ userId: studentUser.id, wordleId: teacherWordleId2, score: 150, creationDate: new Date('2025-05-05') });
           // Create a result for another student to ensure filtering
           await GameResult.create({ userId: otherStudentUser.id, wordleId: teacherWordleId1, score: 200, creationDate: new Date('2025-05-02') });
      });

      it('should return all game results for the authenticated student, ordered by date desc', async () => {
          const res = await request(app)
            .get('/api/student/game-results')
            .set('Authorization', `Bearer ${studentAuthToken}`); // Use student token

          // Assertions
          expect(res.statusCode).toBe(200);
          expect(res.body).toBeInstanceOf(Array);
          // Expect only results for the authenticated student
          expect(res.body.length).toBeGreaterThanOrEqual(2); // Should include the two results created above
          expect(res.body.every(result => result.userId === studentUser.id)).toBe(true);
          // Check ordering (most recent first)
          expect(res.body[0]).toHaveProperty('wordleId', teacherWordleId2); // Created 2025-05-05
          expect(res.body[1]).toHaveProperty('wordleId', teacherWordleId1); // Created 2025-05-01

          // Check structure of returned results
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('score');
          expect(res.body[0]).toHaveProperty('creationDate');
          expect(res.body[0]).toHaveProperty('player'); // Should include player info
          expect(res.body[0].player).toHaveProperty('name', studentUser.name);
          expect(res.body[0]).toHaveProperty('wordle'); // Should include wordle info
          expect(res.body[0].wordle).toHaveProperty('name');
      });

      it('should return an empty array if the student has no game results', async () => {
          // Create a new student with no results
           const studentNoResultCredentials = {
                name: 'Student No Result',
                email: 'student_no_result@example.com',
                password: 'No_resultpass123!',
                role: 'student',
            };
            const studentNoResultUser = await userService.createUser(
                studentNoResultCredentials.email,
                studentNoResultCredentials.name,
                studentNoResultCredentials.password,
                studentNoResultCredentials.role
            );
             const studentNoResultLoginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: studentNoResultCredentials.email, password: studentNoResultCredentials.password });
            const studentNoResultAuthToken = studentNoResultLoginRes.body.token;

          const res = await request(app)
            .get('/api/student/game-results')
            .set('Authorization', `Bearer ${studentNoResultAuthToken}`); // Use the no-result student's token

          expect(res.statusCode).toBe(200);
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body).toHaveLength(0);
      });


      it('should return 401 if not authenticated', async () => {
        const res = await request(app)
          .get('/api/student/game-results'); // No Authorization header

        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Unauthorized');
      });

       it('should return 403 if authenticated as a teacher', async () => {
         const teacherLoginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testTeacherCredentials.email, password: testTeacherCredentials.password });
         const teacherAuthToken = teacherLoginRes.body.token;

        const res = await request(app)
            .get('/api/student/game-results')
            .set('Authorization', `Bearer ${teacherAuthToken}`); // Use teacher token

        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty('message', 'Forbidden');
     });

  });


  // --- Test Suite for GET /api/student/game-results/:gameResultId ---
  describe('GET /api/student/game-results/:gameResultId', () => {

      // Create a game result for the student and another for a different student
      let studentGameResultId;
      let otherStudentGameResultId;
      beforeAll(async () => {
           const result1 = await GameResult.create({ userId: studentUser.id, wordleId: teacherWordleId1, score: 100, creationDate: new Date() });
           studentGameResultId = result1.id;
           const result2 = await GameResult.create({ userId: otherStudentUser.id, wordleId: teacherWordleId1, score: 150, creationDate: new Date() });
           otherStudentGameResultId = result2.id;
      });


      it('should return details for a specific game result owned by the student', async () => {
          const res = await request(app)
            .get(`/api/student/game-results/${studentGameResultId}`) // Result owned by authenticated student
            .set('Authorization', `Bearer ${studentAuthToken}`); // Use student token

          // Assertions
          expect(res.statusCode).toBe(200);
          expect(res.body).toHaveProperty('id', studentGameResultId);
          expect(res.body).toHaveProperty('userId', studentUser.id);
          expect(res.body).toHaveProperty('wordleId', teacherWordleId1);
          expect(res.body).toHaveProperty('score', 100);
          expect(res.body).toHaveProperty('creationDate');
          expect(res.body).toHaveProperty('player'); // Should include player info
          expect(res.body.player).toHaveProperty('name', studentUser.name);
          expect(res.body).toHaveProperty('wordle'); // Should include wordle info
          expect(res.body.wordle).toHaveProperty('name');
      });

      it('should return 404 if the game result is not found', async () => {
          const nonExistentResultId = 99999;

          const res = await request(app)
            .get(`/api/student/game-results/${nonExistentResultId}`)
            .set('Authorization', `Bearer ${studentAuthToken}`);

          expect(res.statusCode).toBe(404);
          expect(res.body).toHaveProperty('message', 'Game result not found');
      });

       it('should return 404 if the game result is found but NOT owned by the authenticated student', async () => {
           const res = await request(app)
            .get(`/api/student/game-results/${otherStudentGameResultId}`) // Result owned by another student
            .set('Authorization', `Bearer ${studentAuthToken}`); // Authenticated as the first student

          // The service should return null if the result doesn't belong to the user,
          // and the controller should return 404 in that case.
          expect(res.statusCode).toBe(404);
          expect(res.body).toHaveProperty('message', 'Game result not found'); // Or similar message indicating not found/unauthorized
       });


      it('should return 401 if not authenticated', async () => {
        const res = await request(app)
          .get(`/api/student/game-results/${studentGameResultId}`); // Valid ID, but no token

        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Unauthorized');
      });

       it('should return 403 if authenticated as a teacher', async () => {
         const teacherLoginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testTeacherCredentials.email, password: testTeacherCredentials.password });
         const teacherAuthToken = teacherLoginRes.body.token;

        const res = await request(app)
            .get(`/api/student/game-results/${studentGameResultId}`)
            .set('Authorization', `Bearer ${teacherAuthToken}`); // Use teacher token

        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty('message', 'Forbidden');
     });

  });

});
