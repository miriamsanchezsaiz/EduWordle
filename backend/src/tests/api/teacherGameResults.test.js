// __tests__/api/teacherGameResults.test.js
const request = require('supertest');
const app = require('../../../app'); // Assuming your Express app is exported from src/app.js
const sequelize = require('../../config/database'); // Import sequelize for DB operations
const { User, Group, StudentGroup, Wordle, Word, Question, WordleGroup, GameResult } = require('../../api/models'); // Import models
const userService = require('../../api/services/userService'); // Import userService to create users
const groupService = require('../../api/services/groupService'); // Import groupService to create groups
const wordleService = require('../../api/services/wordleService'); // Import wordleService to create wordles
const gameService = require('../../api/services/gameService'); // Import gameService to save results

// Ensure NODE_ENV=test is set when running these tests to use the test database

describe('Teacher Game Results Endpoints (Integration Tests)', () => {
  // Define test users
  const testTeacherCredentials = {
    name: 'Teacher Results Test',
    email: 'teacher_results_test@example.com',
    password: 'Password123!',
    role: 'teacher', // Use 'teacher' role
  };
   const testStudentCredentials = {
    name: 'Student Results Test',
    email: 'student_results_test@example.com',
    password: 'StudentP@ssw0rd456!',
    role: 'student', // Use 'student' role
  };
    const testOtherTeacherCredentials = {
    name: 'Other Teacher Results',
    email: 'other_teacher_results@example.com',
    password: 'OtherTeacherP@ssw0rd456!',
    role: 'teacher',
  };
     const testOtherStudentCredentials = {
    name: 'Other Student Results',
    email: 'other_student_results@example.com',
    password: 'OtherStudentP@ssw0rd456!',
    role: 'student',
  };


  // Store authenticated teacher token and user objects
  let teacherAuthToken;
  let teacherUser;
  let studentUser;
  let otherTeacherUser;
  let otherStudentUser;

  // Store created data IDs needed across tests
  let teacherGroup1Id; // Group owned by main teacher
  let otherTeacherGroup1Id; // Group owned by other teacher
  let teacherWordle1Id; // Wordle owned by main teacher, accessible to teacherGroup1Id
  let otherTeacherWordle1Id; // Wordle owned by other teacher, accessible to otherTeacherGroup1Id
  let studentGameResultId1; // Result: main student playing teacherWordle1Id
  let otherStudentGameResultId1; // Result: other student playing otherTeacherWordle1Id


  // Before running any tests in this suite, synchronize the database and create base users/data
  beforeAll(async () => {
    // Connect to the test database and recreate schema
    await sequelize.sync({ force: true });

    // Create base users using the service to ensure password hashing
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
      otherStudentUser = await userService.createUser(
        testOtherStudentCredentials.email,
        testOtherStudentCredentials.name,
        testOtherStudentCredentials.password,
        testOtherStudentCredentials.role
    );


    // Login the teacher to get a token for protected routes
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testTeacherCredentials.email,
        password: testTeacherCredentials.password,
      });
    teacherAuthToken = loginRes.body.token;


     // Create groups and wordles for both teachers
     // Main Teacher's Group and Wordle
     const teacherGroupData1 = { name: 'Teacher 1 Group 1', startDate: '2025-01-01', endDate: null, studentEmails: [testStudentCredentials.email] };
      const groupRes1 = await request(app)
        .post('/api/teacher/groups')
        .set('Authorization', `Bearer ${teacherAuthToken}`)
        .send(teacherGroupData1);
     teacherGroup1Id = groupRes1.body.id;

     const teacherWordleData1 = {
         name: 'Teacher 1 Wordle 1',
         word: { title: 'WORDLE1', hint: 'Hint1' },
         questions: [{ type: 'single', statement: 'Q1?', answer: 'A', options: ['A'] }],
         groupAccessIds: [teacherGroup1Id] // Link to the teacher's group
     };
     const wordleRes1 = await request(app)
        .post('/api/teacher/wordles')
        .set('Authorization', `Bearer ${teacherAuthToken}`)
        .send(teacherWordleData1);
     teacherWordle1Id = wordleRes1.body.id;


     // Other Teacher's Group and Wordle
      const otherTeacherLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testOtherTeacherCredentials.email, password: testOtherTeacherCredentials.password });
      const otherTeacherAuthToken = otherTeacherLoginRes.body.token;

     const otherTeacherGroupData1 = { name: 'Teacher 2 Group 1', startDate: '2025-01-01', endDate: null, studentEmails: [testOtherStudentCredentials.email] };
      const otherGroupRes1 = await request(app)
        .post('/api/teacher/groups')
        .set('Authorization', `Bearer ${otherTeacherAuthToken}`)
        .send(otherTeacherGroupData1);
     otherTeacherGroup1Id = otherGroupRes1.body.id;

     const otherTeacherWordleData1 = {
         name: 'Teacher 2 Wordle 1',
         word: { title: 'WORDLE2', hint: 'Hint2' },
         questions: [{ type: 'single', statement: 'Q2?', answer: 'B', options: ['B'] }],
         groupAccessIds: [otherTeacherGroup1Id] // Link to the other teacher's group
     };
      const otherWordleRes1 = await request(app)
        .post('/api/teacher/wordles')
        .set('Authorization', `Bearer ${otherTeacherAuthToken}`)
        .send(otherTeacherWordleData1);
     otherTeacherWordle1Id = otherWordleRes1.body.id;


     // Create Game Results
     // Main student playing main teacher's wordle (accessible)
     const result1 = await gameService.saveGameResult(studentUser.id, teacherWordle1Id, 100);
     studentGameResultId1 = result1.id;

     // Other student playing other teacher's wordle (inaccessible to main teacher)
     const result2 = await gameService.saveGameResult(otherStudentUser.id, otherTeacherWordle1Id, 150);
     otherStudentGameResultId1 = result2.id;

      // Main student playing other teacher's wordle (inaccessible to main teacher unless shared)
      // Assuming it's not shared with main teacher's groups:
      await gameService.saveGameResult(studentUser.id, otherTeacherWordle1Id, 200);

       // Other student playing main teacher's wordle (inaccessible to main teacher unless other student is in main teacher's group)
       // Assuming other student is NOT in main teacher's group:
       await gameService.saveGameResult(otherStudentUser.id, teacherWordle1Id, 50);

  });

  // After all tests in this suite are done, close the database connection
  afterAll(async () => {
    await sequelize.close();
  });

   // Optional: Clean up data before each test if needed
   // beforeEach(async () => {
   //     // Clean up specific data if needed
   // });


  // --- Test Suite for GET /api/teacher/game-results/student/:userId ---
  describe('GET /api/teacher/game-results/student/:userId', () => {

      it('should return game results for a student in the teacher\'s group', async () => {
          const res = await request(app)
            .get(`/api/teacher/game-results/student/${studentUser.id}`) // Get results for the student in the teacher's group
            .set('Authorization', `Bearer ${teacherAuthToken}`); // Use teacher token

          // Assertions
          expect(res.statusCode).toBe(200);
          expect(res.body).toBeInstanceOf(Array);
          // Expect to see results for studentUser, including those for teacherWordle1Id and otherTeacherWordle1Id
          // The service should fetch ALL results for the student, authorization check is if teacher can view student.
          expect(res.body.length).toBeGreaterThanOrEqual(2); // At least the two results created for studentUser
          expect(res.body.every(result => result.userId === studentUser.id)).toBe(true);

          // Check structure
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('score');
          expect(res.body[0]).toHaveProperty('player');
          expect(res.body[0].player).toHaveProperty('name', studentUser.name);
          expect(res.body[0]).toHaveProperty('wordle');
          expect(res.body[0].wordle).toHaveProperty('name');
      });

      it('should return 404 if the student is not found', async () => {
          const nonExistentStudentId = 99999; // An ID that should not exist

          const res = await request(app)
            .get(`/api/teacher/game-results/student/${nonExistentStudentId}`)
            .set('Authorization', `Bearer ${teacherAuthToken}`);

          expect(res.statusCode).toBe(404);
          expect(res.body).toHaveProperty('message', 'Student user not found');
      });


      //TODO : ERROR FORBIDEN 403

      it('should return 403 Forbidden if the student exists but is NOT in any of the teacher\'s groups', async () => {
        // --- Make the API request ---
        const res = await request(app)
            .get(`/api/teacher/game-results/student/${otherStudentUser.id}`) // Target the student NOT in the teacher's groups
            .set('Authorization', `Bearer ${teacherAuthToken}`); // Authenticate as the teacher

        // --- Assertions ---
        // Expecting 403 because the service layer's authorization check should fail.
        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty('message', 'Forbidden'); 
        
        expect(res.body.results).toBeUndefined(); // No results should be returned
      });

       //  Add a test case here to verify that a teacher CANNOT view results
       // for a student who is NOT in any of their groups.
       // This requires implementing the authorization check in the controller or service.
       // Current implementation in teacherController.js does NOT have this check.
      //  it.skip('should return 403 if the student is found but NOT in any of the teacher\'s groups', async () => {
      //       const res = await request(app)
      //           .get(`/api/teacher/game-results/student/${otherStudentUser.id}`) // Get results for a student not in teacher's groups
      //           .set('Authorization', `Bearer ${teacherAuthToken}`);

      //       expect(res.statusCode).toBe(403); // Or 404 depending on exact implementation
      //       expect(res.body).toHaveProperty('message', 'Forbidden'); // Or similar
      //  });


      it('should return 401 if not authenticated', async () => {
        const res = await request(app)
          .get(`/api/teacher/game-results/student/${studentUser.id}`); // Valid student ID, but no token

        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Unauthorized');
      });

       it('should return 403 if authenticated as a student', async () => {
         const studentLoginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testStudentCredentials.email, password: testStudentCredentials.password });
         const studentAuthToken = studentLoginRes.body.token;

        const res = await request(app)
            .get(`/api/teacher/game-results/student/${studentUser.id}`)
            .set('Authorization', `Bearer ${studentAuthToken}`); // Use student token

        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty('message', 'Forbidden');
     });

  });


  // --- Test Suite for GET /api/teacher/game-results/wordle/:wordleId ---
  describe('GET /api/teacher/game-results/wordle/:wordleId', () => {

      it('should return game results for a wordle created by the teacher', async () => {
          const res = await request(app)
            .get(`/api/teacher/game-results/wordle/${teacherWordle1Id}`) // Get results for teacher's wordle
            .set('Authorization', `Bearer ${teacherAuthToken}`); // Use teacher token

          // Assertions
          expect(res.statusCode).toBe(200);
          expect(res.body).toBeInstanceOf(Array);
          // Expect to see results for this wordle, including those by studentUser and otherStudentUser
          // The service fetches ALL results for the wordle, authorization check is if teacher created wordle.
          expect(res.body.length).toBeGreaterThanOrEqual(2); // At least the two results for teacherWordle1Id
          expect(res.body.every(result => result.wordleId === teacherWordle1Id)).toBe(true);

           // Check structure
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('score');
          expect(res.body[0]).toHaveProperty('player');
          expect(res.body[0]).toHaveProperty('wordle');
      });

      it('should return 404 if the wordle is not found', async () => {
          const nonExistentWordleId = 99999;

          const res = await request(app)
            .get(`/api/teacher/game-results/wordle/${nonExistentWordleId}`)
            .set('Authorization', `Bearer ${teacherAuthToken}`);

          expect(res.statusCode).toBe(404);
          expect(res.body).toHaveProperty('message', 'Wordle not found or access denied'); // Message from getWordleDetails
      });

       it('should return 404 if the wordle is found but NOT created by the teacher', async () => {
           const res = await request(app)
            .get(`/api/teacher/game-results/wordle/${otherTeacherWordle1Id}`) // Get results for other teacher's wordle
            .set('Authorization', `Bearer ${teacherAuthToken}`); // Authenticated as the first teacher

          // The controller reuses getWordleDetails which checks ownership and returns 404 if not found/owned
          expect(res.statusCode).toBe(404);
          expect(res.body).toHaveProperty('message', 'Wordle not found or access denied');
       });


      it('should return 401 if not authenticated', async () => {
        const res = await request(app)
          .get(`/api/teacher/game-results/wordle/${teacherWordle1Id}`); // Valid wordle ID, but no token

        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Unauthorized');
      });

       it('should return 403 if authenticated as a student', async () => {
         const studentLoginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testStudentCredentials.email, password: testStudentCredentials.password });
         const studentAuthToken = studentLoginRes.body.token;

        const res = await request(app)
            .get(`/api/teacher/game-results/wordle/${teacherWordle1Id}`)
            .set('Authorization', `Bearer ${studentAuthToken}`); // Use student token

        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty('message', 'Forbidden');
     });

  });


  // --- Test Suite for GET /api/teacher/game-results/group/:groupId ---
  describe('GET /api/teacher/game-results/group/:groupId', () => {

      it('should return game results for a group created by the teacher', async () => {
          const res = await request(app)
            .get(`/api/teacher/game-results/group/${teacherGroup1Id}`) // Get results for teacher's group
            .set('Authorization', `Bearer ${teacherAuthToken}`); // Use teacher token

          // Assertions
          expect(res.statusCode).toBe(200);
          expect(res.body).toBeInstanceOf(Array);
          // Expect to see results for students in this group playing wordles accessible to this group
          // Based on setup: studentUser is in teacherGroup1Id, teacherWordle1Id is accessible to teacherGroup1Id
          // So, expect results for studentUser playing teacherWordle1Id
          expect(res.body.length).toBeGreaterThanOrEqual(1); // At least the result for studentUser playing teacherWordle1Id
          expect(res.body.every(result => result.player.id === studentUser.id && result.wordle.id === teacherWordle1Id)).toBe(true);

           // Check structure
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('score');
          expect(res.body[0]).toHaveProperty('player');
          expect(res.body[0]).toHaveProperty('wordle');
      });

      it('should return 404 if the group is not found', async () => {
          const nonExistentGroupId = 99999;

          const res = await request(app)
            .get(`/api/teacher/game-results/group/${nonExistentGroupId}`)
            .set('Authorization', `Bearer ${teacherAuthToken}`);

          expect(res.statusCode).toBe(404);
          expect(res.body).toHaveProperty('message', 'Group not found or access denied'); // Message from getGroupDetails
      });

       it('should return 404 if the group is found but NOT created by the teacher', async () => {
           const res = await request(app)
            .get(`/api/teacher/game-results/group/${otherTeacherGroup1Id}`) // Get results for other teacher's group
            .set('Authorization', `Bearer ${teacherAuthToken}`); // Authenticated as the first teacher

          // The controller reuses getGroupDetails which checks ownership and returns 404 if not found/owned
          expect(res.statusCode).toBe(404);
          expect(res.body).toHaveProperty('message', 'Group not found or access denied');
       });


      it('should return 401 if not authenticated', async () => {
        const res = await request(app)
          .get(`/api/teacher/game-results/group/${teacherGroup1Id}`); // Valid group ID, but no token

        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Unauthorized');
      });

       it('should return 403 if authenticated as a student', async () => {
         const studentLoginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testStudentCredentials.email, password: testStudentCredentials.password });
         const studentAuthToken = studentLoginRes.body.token;

        const res = await request(app)
            .get(`/api/teacher/game-results/group/${teacherGroup1Id}`)
            .set('Authorization', `Bearer ${studentAuthToken}`); // Use student token

        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty('message', 'Forbidden');
     });

  });


  // --- Test Suite for GET /api/teacher/game-results/:gameResultId ---
  describe('GET /api/teacher/game-results/:gameResultId', () => {

      it('should return details for a game result if the teacher is authorized (e.g., owns the wordle)', async () => {
          const res = await request(app)
            .get(`/api/teacher/game-results/${studentGameResultId1}`) // Get details for a result of teacher's wordle
            .set('Authorization', `Bearer ${teacherAuthToken}`); // Use teacher token

          // Assertions
          expect(res.statusCode).toBe(200);
          expect(res.body).toHaveProperty('id', studentGameResultId1);
          expect(res.body).toHaveProperty('score');
          expect(res.body).toHaveProperty('player');
          expect(res.body).toHaveProperty('wordle');
      });

      it('should return 404 if the game result is not found', async () => {
          const nonExistentResultId = 99999;

          const res = await request(app)
            .get(`/api/teacher/game-results/${nonExistentResultId}`)
            .set('Authorization', `Bearer ${teacherAuthToken}`);

          expect(res.statusCode).toBe(404);
          expect(res.body).toHaveProperty('message', 'Game result not found');
      });


      //TODO: DONE SIN PENSAR
       //  Add a test case here to verify that a teacher CANNOT view details
       // for a game result they are NOT authorized to see (e.g., result for a wordle
       // they didn't create, played by a student not in their groups).
       // This requires implementing the authorization check in the controller or service.
       // Current implementation in teacherController.js does NOT have this check.
       it('should return 403 if the game result is found but the teacher is NOT authorized', async () => {
            const res = await request(app)
                .get(`/api/teacher/game-results/${otherStudentGameResultId1}`) // Get details for a result of other teacher's wordle
                .set('Authorization', `Bearer ${teacherAuthToken}`);

            expect(res.statusCode).toBe(403); // Or 404 depending on exact implementation
            expect(res.body).toHaveProperty('message', 'Forbidden'); // Or similar
       });


      it('should return 401 if not authenticated', async () => {
        const res = await request(app)
          .get(`/api/teacher/game-results/${studentGameResultId1}`); // Valid result ID, but no token

        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Unauthorized');
      });

       it('should return 403 if authenticated as a student', async () => {
         const studentLoginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testStudentCredentials.email, password: testStudentCredentials.password });
         const studentAuthToken = studentLoginRes.body.token;

        const res = await request(app)
            .get(`/api/teacher/game-results/${studentGameResultId1}`)
            .set('Authorization', `Bearer ${studentAuthToken}`); // Use student token

        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty('message', 'Forbidden');
     });

  });

});
