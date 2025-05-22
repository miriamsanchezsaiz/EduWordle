// __tests__/api/teacherGroups.test.js
const request = require('supertest');
const app = require('../../../app'); // Assuming your Express app is exported from src/app.js
const sequelize = require('../../config/database'); // Import sequelize for DB operations
const { User, Group, StudentGroup } = require('../../api/models'); // Import models
const userService = require('../../api/services/userService'); // Import userService to create users
const { Op } = require('sequelize'); // Import Op for date filtering checks

// Ensure NODE_ENV=test is set when running these tests to use the test database

describe('Teacher Groups Endpoints (Integration Tests)', () => {
  // Define test users and group data
  const testTeacherCredentials = {
    name: 'Teacher Groups Test',
    email: 'teacher_groups_test@example.com',
    password: 'Password123!',
    role: 'teacher',
  };
   const testStudentCredentials = {
    name: 'Student Group Test',
    email: 'student_group_test@example.com',
    password: 'StudentP@ssw0rd456!',
    role: 'student',
  };
    const testOtherTeacherCredentials = {
    name: 'Other Teacher',
    email: 'other_teacher_groups@example.com',
    password: 'OtherTeacherP@ssw0rd456!',
    role: 'teacher',
  };


  // Store authenticated teacher token and user object
  let teacherAuthToken;
  let teacherUser;
  let studentUser;
  let otherTeacherUser;

  // Store created group IDs and other data needed across tests
  let teacherGroupId1;
  let teacherGroupId2;
  let otherTeacherGroupId;

  // Mock the Date object to control time-based logic in tests (e.g., active/inactive groups)
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

     // Login the student to get a token if needed for student-specific tests later
     const studentLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testStudentCredentials.email,
        password: testStudentCredentials.password,
      });
    // studentAuthToken = studentLoginRes.body.token; // Store if needed
  });

  // After all tests in this suite are done, close the database connection
  afterAll(async () => {
    await sequelize.close();
     // Restore the original Date object
    global.Date = originalDate;
  });

   // Optional: Clean up data before each test if needed
   beforeEach(async () => {
       // Clean up groups created in previous tests within this suite if necessary
       // await Group.destroy({ where: {}, truncate: true }); // Use truncate for faster reset
       // await StudentGroup.destroy({ where: {}, truncate: true });
   });


  // --- Test Suite for POST /api/teacher/groups ---
  describe('POST /api/teacher/groups', () => {
    const groupData = {
      name: 'New Test Group',
      startDate: '2025-06-01',
      endDate: '2026-06-01',
      studentEmails: [testStudentCredentials.email, 'newstudent@example.com'], // Add existing and new student
    };

    it('should create a new group with students linked/created', async () => {
      const res = await request(app)
        .post('/api/teacher/groups')
        .set('Authorization', `Bearer ${teacherAuthToken}`) // Use teacher token
        .send(groupData);

      // Assertions
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', groupData.name);
      expect(res.body).toHaveProperty('initDate'); // Check date format if needed
      expect(res.body).toHaveProperty('endDate'); // Check date format if needed
      expect(res.body).toHaveProperty('userId', teacherUser.id); // Check group is linked to the teacher
      expect(res.body).toHaveProperty('students'); // Check that students were included in the response
      expect(res.body.students).toHaveLength(2); // Expect both students to be linked
      expect(res.body).toHaveProperty('createdStudents'); // Check createdStudents list
      expect(res.body.createdStudents).toHaveLength(1); // Expect one new student created
      expect(res.body.createdStudents).toEqual(expect.arrayContaining(['newstudent@example.com']));
      expect(res.body).toHaveProperty('linkedStudents'); // Check linkedStudents list
      expect(res.body.linkedStudents).toHaveLength(1); // Expect one existing student linked
      expect(res.body.linkedStudents).toEqual(expect.arrayContaining([testStudentCredentials.email]));


      // Verify the group was created in the database
      const createdGroupInDB = await Group.findByPk(res.body.id);
      expect(createdGroupInDB).not.toBeNull();
      expect(createdGroupInDB.name).toBe(groupData.name);
      expect(createdGroupInDB.userId).toBe(teacherUser.id);

      // Verify students are linked in the StudentGroup table
      const studentGroups = await StudentGroup.findAll({ where: { group_id: res.body.id } });
      expect(studentGroups).toHaveLength(2); // Should have 2 entries in the join table

      // Find the new student created
      const newStudentInDB = await User.findOne({ where: { email: 'newstudent@example.com' } });
      expect(newStudentInDB).not.toBeNull();
      expect(newStudentInDB.role).toBe('student'); // New users should be students

      // Store the created group ID for later tests
      teacherGroupId1 = res.body.id;
    });

     it('should create a group with no students if studentEmails array is empty', async () => {
        const groupDataNoStudents = {
            name: 'Group No Students',
            startDate: '2025-07-01',
            endDate: null,
            studentEmails: [], // Empty student list
        };

        const res = await request(app)
            .post('/api/teacher/groups')
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send(groupDataNoStudents);

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('name', groupDataNoStudents.name);
        expect(res.body).toHaveProperty('students');
        expect(res.body.students).toHaveLength(0); // No students linked
         expect(res.body).toHaveProperty('createdStudents', []);
         expect(res.body).toHaveProperty('linkedStudents', []);


        // Verify the group was created
        const createdGroupInDB = await Group.findByPk(res.body.id);
        expect(createdGroupInDB).not.toBeNull();

        // Verify no entries in StudentGroup for this group
        const studentGroups = await StudentGroup.findAll({ where: { group_id: res.body.id } });
        expect(studentGroups).toHaveLength(0);

         // Store the created group ID
         teacherGroupId2 = res.body.id;
     });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/teacher/groups')
        .send(groupData); // No Authorization header

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });

     it('should return 403 if authenticated as a student', async () => {
         // Assuming you have a studentAuthToken stored from auth.test.js or login here
         const studentLoginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testStudentCredentials.email, password: testStudentCredentials.password });
         const studentAuthToken = studentLoginRes.body.token;

        const res = await request(app)
            .post('/api/teacher/groups')
            .set('Authorization', `Bearer ${studentAuthToken}`) // Use student token
            .send(groupData);

        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty('message', 'Forbidden');
     });


    it('should return 400 for missing required fields', async () => {
        // Test missing name
        let res = await request(app)
            .post('/api/teacher/groups')
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send({ startDate: '2025-01-01', studentEmails: [] });

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toEqual(expect.arrayContaining([
             expect.objectContaining({ msg: 'Group name is required' })
        ]));

         // Test missing startDate
        res = await request(app)
            .post('/api/teacher/groups')
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send({ name: 'Missing Start Date', studentEmails: [] });

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
         expect(res.body.errors).toEqual(expect.arrayContaining([
             expect.objectContaining({ msg: 'Start date is required' })
        ]));
    });

     it('should return 400 for invalid date format', async () => {
        const invalidGroupData = {
            name: 'Invalid Date Group',
            startDate: 'not-a-date', // Invalid date
            endDate: null,
            studentEmails: [],
        };

        const res = await request(app)
            .post('/api/teacher/groups')
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send(invalidGroupData);

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toEqual(expect.arrayContaining([
             expect.objectContaining({ msg: 'Invalid start date format (YYYY-MM-DD)' })
        ]));
     });

     it('should return 400 if endDate is before startDate', async () => {
         const invalidGroupData = {
            name: 'Invalid Date Range',
            startDate: '2025-06-01',
            endDate: '2025-05-01', // End date before start date
            studentEmails: [],
        };

        const res = await request(app)
            .post('/api/teacher/groups')
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send(invalidGroupData);

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toEqual(expect.arrayContaining([
             expect.objectContaining({ msg: 'End date cannot be before start date' })
        ]));
     });

      it('should return 400 for invalid student email format', async () => {
         const invalidGroupData = {
            name: 'Invalid Email Group',
            startDate: '2025-06-01',
            endDate: null,
            studentEmails: ['invalid-email', 'another@example.com'], // One invalid email
        };

        const res = await request(app)
            .post('/api/teacher/groups')
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send(invalidGroupData);

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toEqual(expect.arrayContaining([
             expect.objectContaining({ msg: 'Invalid email format for student: invalid-email' })
        ]));
      });
  });


  // --- Test Suite for GET /api/teacher/groups ---
  describe('GET /api/teacher/groups', () => {

      // Create a group for the other teacher to ensure filtering works
      beforeAll(async () => {
           const otherTeacherGroupData = {
                name: 'Other Teacher Group',
                startDate: '2025-01-01',
                endDate: null,
                studentEmails: [],
           };
           const otherTeacherLoginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: testOtherTeacherCredentials.email, password: testOtherTeacherCredentials.password });
           const otherTeacherAuthToken = otherTeacherLoginRes.body.token;

           const res = await request(app)
                .post('/api/teacher/groups')
                .set('Authorization', `Bearer ${otherTeacherAuthToken}`)
                .send(otherTeacherGroupData);
           otherTeacherGroupId = res.body.id;
      });


      it('should return all groups created by the authenticated teacher', async () => {
          const res = await request(app)
            .get('/api/teacher/groups')
            .set('Authorization', `Bearer ${teacherAuthToken}`); // Use teacher token

          // Assertions
          expect(res.statusCode).toBe(200);
          expect(res.body).toBeInstanceOf(Array);
          // Expect to see the groups created by teacherUser, but not by otherTeacherUser
          expect(res.body.length).toBeGreaterThanOrEqual(2); // Should include teacherGroupId1 and teacherGroupId2
          expect(res.body.some(group => group.id === teacherGroupId1)).toBe(true);
          expect(res.body.some(group => group.id === teacherGroupId2)).toBe(true);
          expect(res.body.some(group => group.id === otherTeacherGroupId)).toBe(false); // Should not include other teacher's group

          // Check the structure of returned groups (should include isActive)
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('name');
          expect(res.body[0]).toHaveProperty('initDate');
          expect(res.body[0]).toHaveProperty('endDate');
          expect(res.body[0]).toHaveProperty('isActive'); // Check that isActive is included
      });

      it('should return only active groups when status filter is "active"', async () => {
           // Create an inactive group for the teacher
           const inactiveGroupData = {
                name: 'Inactive Past Group',
                startDate: '2024-01-01',
                endDate: '2024-12-31', // Ended in the past relative to mockDate
                studentEmails: [],
           };
           const inactiveGroupRes = await request(app)
                .post('/api/teacher/groups')
                .set('Authorization', `Bearer ${teacherAuthToken}`)
                .send(inactiveGroupData);
           const inactiveGroupId = inactiveGroupRes.body.id;

           // Create a future group for the teacher
           const futureGroupData = {
                name: 'Future Group',
                startDate: '2026-01-01', // Starts in the future relative to mockDate
                endDate: null,
                studentEmails: [],
           };
            const futureGroupRes = await request(app)
                .post('/api/teacher/groups')
                .set('Authorization', `Bearer ${teacherAuthToken}`)
                .send(futureGroupData);
           const futureGroupId = futureGroupRes.body.id;


          const res = await request(app)
            .get('/api/teacher/groups?status=active') // Add status query param
            .set('Authorization', `Bearer ${teacherAuthToken}`);

          expect(res.statusCode).toBe(200);
          expect(res.body).toBeInstanceOf(Array);
          // Expect only active groups (teacherGroupId1 and teacherGroupId2 based on initial creation dates)
          expect(res.body.some(group => group.id === teacherGroupId1)).toBe(true);
          expect(res.body.some(group => group.id === teacherGroupId2)).toBe(true);
          expect(res.body.some(group => group.id === inactiveGroupId)).toBe(false); // Should not include inactive group
          expect(res.body.some(group => group.id === futureGroupId)).toBe(false); // Should not include future group
          expect(res.body.every(group => group.isActive === true)).toBe(true); // All returned should be active
      });

       it('should return only inactive groups when status filter is "inactive"', async () => {
           // Ensure inactive and future groups exist (created in the previous test)
           const res = await request(app)
            .get('/api/teacher/groups?status=inactive') // Add status query param
            .set('Authorization', `Bearer ${teacherAuthToken}`);

          expect(res.statusCode).toBe(200);
          expect(res.body).toBeInstanceOf(Array);
          // Expect only inactive groups
          expect(res.body.some(group => group.id === teacherGroupId1)).toBe(false); // Active
          expect(res.body.some(group => group.id === teacherGroupId2)).toBe(false); // Active
          // Find the inactive and future group IDs from the previous test's response body if needed, or rely on their creation logic
          // For simplicity, let's assume we know their rough IDs or can query them if needed
          // A more robust approach would store these IDs after creation
          // Let's just check that some inactive groups are returned and they are marked inactive
          expect(res.body.length).toBeGreaterThanOrEqual(2); // Should include at least the inactive and future groups
          expect(res.body.every(group => group.isActive === false)).toBe(true); // All returned should be inactive
      });


      it('should return 401 if not authenticated', async () => {
        const res = await request(app)
          .get('/api/teacher/groups'); // No Authorization header

        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Unauthorized');
      });

       it('should return 403 if authenticated as a student', async () => {
         const studentLoginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testStudentCredentials.email, password: testStudentCredentials.password });
         const studentAuthToken = studentLoginRes.body.token;

        const res = await request(app)
            .get('/api/teacher/groups')
            .set('Authorization', `Bearer ${studentAuthToken}`); // Use student token

        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty('message', 'Forbidden');
     });

  });


  // --- Test Suite for GET /api/teacher/groups/:groupId ---
  describe('GET /api/teacher/groups/:groupId', () => {

      it('should return details for a specific group created by the teacher', async () => {
          const res = await request(app)
            .get(`/api/teacher/groups/${teacherGroupId1}`) // Use a group ID created by this teacher
            .set('Authorization', `Bearer ${teacherAuthToken}`);

          // Assertions
          expect(res.statusCode).toBe(200);
          expect(res.body).toHaveProperty('id', teacherGroupId1);
          expect(res.body).toHaveProperty('name', 'New Test Group'); // Check name from creation
          expect(res.body).toHaveProperty('userId', teacherUser.id);
          expect(res.body).toHaveProperty('students'); // Should include students
          expect(res.body.students).toBeInstanceOf(Array);
          expect(res.body.students.length).toBeGreaterThanOrEqual(1); // Should include at least the student added during creation
          expect(res.body).toHaveProperty('accessibleWordles'); // Should include accessible wordles (initially empty)
          expect(res.body.accessibleWordles).toBeInstanceOf(Array);
      });

      it('should return 404 if the group is not found', async () => {
          const nonExistentGroupId = 99999; // An ID that should not exist

          const res = await request(app)
            .get(`/api/teacher/groups/${nonExistentGroupId}`)
            .set('Authorization', `Bearer ${teacherAuthToken}`);

          expect(res.statusCode).toBe(404);
          expect(res.body).toHaveProperty('message', 'Group not found');
      });

       it('should return 404 if the group is found but not created by the teacher', async () => {
           // Use a group ID created by the other teacher
           const res = await request(app)
            .get(`/api/teacher/groups/${otherTeacherGroupId}`)
            .set('Authorization', `Bearer ${teacherAuthToken}`); // Authenticated as the first teacher

          // The service should return null if the group doesn't belong to the teacher,
          // and the controller should return 404 in that case.
          expect(res.statusCode).toBe(404);
          expect(res.body).toHaveProperty('message', 'Group not found'); // Or similar message indicating not found/unauthorized
       });


      it('should return 401 if not authenticated', async () => {
        const res = await request(app)
          .get(`/api/teacher/groups/${teacherGroupId1}`); // No Authorization header

        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Unauthorized');
      });

       it('should return 403 if authenticated as a student', async () => {
          const studentLoginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testStudentCredentials.email, password: testStudentCredentials.password });
         const studentAuthToken = studentLoginRes.body.token;

        const res = await request(app)
            .get(`/api/teacher/groups/${teacherGroupId1}`)
            .set('Authorization', `Bearer ${studentAuthToken}`); // Use student token

        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty('message', 'Forbidden');
     });

  });

  // --- Test Suite for PUT /api/teacher/groups/:groupId ---
  describe('PUT /api/teacher/groups/:groupId', () => {
      const updateData = {
          name: 'Updated Group Name',
          endDate: '2027-12-31',
          addStudentEmails: ['anothernewstudent@example.com'], // Add a new student
          removeStudentIds: [studentUser.id], // Remove the existing student
      };

       // Create another student to be removed
       let studentToRemove;
       beforeAll(async () => {
            studentToRemove = await userService.createUser(
                'student_to_remove@example.com',
                'Student To Remove',
                'removepass',
                'student'
            );
            // Link this student to the group teacherGroupId1 manually in the DB for the test
            await StudentGroup.create({ user_id: studentToRemove.id, group_id: teacherGroupId1 });
       });


      it('should update group details and manage students', async () => {
          const res = await request(app)
            .put(`/api/teacher/groups/${teacherGroupId1}`) // Update the first group created
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send(updateData);

          // Assertions
          expect(res.statusCode).toBe(200);
          expect(res.body).toHaveProperty('id', teacherGroupId1);
          expect(res.body).toHaveProperty('name', updateData.name);
          expect(res.body).toHaveProperty('endDate'); // Check updated end date
          expect(res.body).toHaveProperty('students'); // Should include updated student list
          expect(res.body.students).toBeInstanceOf(Array);
          // Check the updated student list
          const studentEmailsInResponse = res.body.students.map(s => s.email);
          expect(studentEmailsInResponse).not.toContain(testStudentCredentials.email); // Original student removed
          expect(studentEmailsInResponse).not.toContain('student_to_remove@example.com'); // StudentToRemove removed
          expect(studentEmailsInResponse).toContain('anothernewstudent@example.com'); // New student added

          expect(res.body).toHaveProperty('createdStudents');
          expect(res.body.createdStudents).toEqual(expect.arrayContaining(['anothernewstudent@example.com']));
          expect(res.body).toHaveProperty('linkedStudents', []); // No existing students were added in this update

          // Verify changes in the database
          const updatedGroupInDB = await Group.findByPk(teacherGroupId1, {
              include: [{ model: User, as: 'students' }]
          });
          expect(updatedGroupInDB.name).toBe(updateData.name);
          expect(updatedGroupInDB.endDate).toEqual(new Date(updateData.endDate));
          expect(updatedGroupInDB.students.map(s => s.email)).toHaveLength(1); // Only the new student should be linked
          expect(updatedGroupInDB.students.map(s => s.email)).toContain('anothernewstudent@example.com');

          // Verify the removed student is no longer in StudentGroup for this group
          const removedStudentLink = await StudentGroup.findOne({ where: { user_id: studentUser.id, group_id: teacherGroupId1 } });
          expect(removedStudentLink).toBeNull();
           const removedStudentLink2 = await StudentGroup.findOne({ where: { user_id: studentToRemove.id, group_id: teacherGroupId1 } });
          expect(removedStudentLink2).toBeNull();

          // Verify the new student was created and linked
          const newStudentInDB = await User.findOne({ where: { email: 'anothernewstudent@example.com' } });
          expect(newStudentInDB).not.toBeNull();
          const newStudentLink = await StudentGroup.findOne({ where: { user_id: newStudentInDB.id, group_id: teacherGroupId1 } });
          expect(newStudentLink).not.toBeNull();
      });

      it('should return 404 if the group is not found', async () => {
          const nonExistentGroupId = 99999;

          const res = await request(app)
            .put(`/api/teacher/groups/${nonExistentGroupId}`)
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send(updateData);

          expect(res.statusCode).toBe(404);
          expect(res.body).toHaveProperty('message', 'Group not found');
      });

      it('should return 404 if the group is found but not created by the teacher', async () => {
           const res = await request(app)
            .put(`/api/teacher/groups/${otherTeacherGroupId}`)
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send(updateData);

          expect(res.statusCode).toBe(404);
          expect(res.body).toHaveProperty('message', 'Group not found');
       });


      it('should return 401 if not authenticated', async () => {
        const res = await request(app)
          .put(`/api/teacher/groups/${teacherGroupId1}`)
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
            .put(`/api/teacher/groups/${teacherGroupId1}`)
            .set('Authorization', `Bearer ${studentAuthToken}`)
            .send(updateData);

        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty('message', 'Forbidden');
     });

      it('should return 400 for invalid date format in update', async () => {
        const invalidUpdateData = { startDate: 'not-a-date' };

        const res = await request(app)
            .put(`/api/teacher/groups/${teacherGroupId1}`)
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send(invalidUpdateData);

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toEqual(expect.arrayContaining([
             expect.objectContaining({ msg: 'Invalid start date format (YYYY-MM-DD)' })
        ]));
      });

      it('should return 400 if endDate is before startDate in update', async () => {
         const invalidUpdateData = {
            startDate: '2028-06-01',
            endDate: '2028-05-01', // End date before start date
        };

        const res = await request(app)
            .put(`/api/teacher/groups/${teacherGroupId1}`)
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send(invalidUpdateData);

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toEqual(expect.arrayContaining([
             expect.objectContaining({ msg: 'End date cannot be before start date' })
        ]));
     });

      it('should return 400 for invalid student email format in addStudentEmails', async () => {
         const invalidUpdateData = { addStudentEmails: ['invalid-email'] };

        const res = await request(app)
            .put(`/api/teacher/groups/${teacherGroupId1}`)
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send(invalidUpdateData);

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toEqual(expect.arrayContaining([
             expect.objectContaining({ msg: 'Invalid email format for student: invalid-email' })
        ]));
      });

       it('should return 400 for non-numeric student ID in removeStudentIds', async () => {
         const invalidUpdateData = { removeStudentIds: ['not-a-number'] };

        const res = await request(app)
            .put(`/api/teacher/groups/${teacherGroupId1}`)
            .set('Authorization', `Bearer ${teacherAuthToken}`)
            .send(invalidUpdateData);

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toEqual(expect.arrayContaining([
             expect.objectContaining({ msg: 'Invalid student ID format for removal' })
        ]));
      });
  });


  // --- Test Suite for DELETE /api/teacher/groups/:groupId ---
  describe('DELETE /api/teacher/groups/:groupId', () => {

      // Create a group specifically for deletion testing
      let groupToDeleteId;
      let studentInGroupToDelete;
      beforeAll(async () => {
           const groupToDeleteData = {
                name: 'Group To Delete',
                startDate: '2025-01-01',
                endDate: null,
                studentEmails: ['student_in_group_to_delete@example.com'],
           };
            const res = await request(app)
                .post('/api/teacher/groups')
                .set('Authorization', `Bearer ${teacherAuthToken}`)
                .send(groupToDeleteData);
            groupToDeleteId = res.body.id;

            // Find the student created in this group
            studentInGroupToDelete = await User.findOne({ where: { email: 'student_in_group_to_delete@example.com' } });
      });


      it('should delete a group created by the teacher', async () => {
          const res = await request(app)
            .delete(`/api/teacher/groups/${groupToDeleteId}`) // Delete the group created for this test
            .set('Authorization', `Bearer ${teacherAuthToken}`);

          // Assertions
          expect(res.statusCode).toBe(200);
          expect(res.body).toHaveProperty('message', 'Group deleted successfully');

          // Verify the group was deleted from the database
          const deletedGroupInDB = await Group.findByPk(groupToDeleteId);
          expect(deletedGroupInDB).toBeNull();

          // Verify the student linked to this group was checked for deletion
          // Since this student was only in this group, they should be deleted
          const deletedStudentInDB = await User.findByPk(studentInGroupToDelete.id);
          expect(deletedStudentInDB).toBeNull();

           // Verify the StudentGroup link was deleted (cascaded)
           const studentGroupLink = await StudentGroup.findOne({ where: { group_id: groupToDeleteId } });
           expect(studentGroupLink).toBeNull();
      });

      it('should return 404 if the group is not found', async () => {
          const nonExistentGroupId = 99999;

          const res = await request(app)
            .delete(`/api/teacher/groups/${nonExistentGroupId}`)
            .set('Authorization', `Bearer ${teacherAuthToken}`);

          expect(res.statusCode).toBe(404);
          expect(res.body).toHaveProperty('message', 'Group not found');
      });

       it('should return 404 if the group is found but not created by the teacher', async () => {
           // Attempt to delete a group created by the other teacher
           const res = await request(app)
            .delete(`/api/teacher/groups/${otherTeacherGroupId}`)
            .set('Authorization', `Bearer ${teacherAuthToken}`); // Authenticated as the first teacher

          expect(res.statusCode).toBe(404);
          expect(res.body).toHaveProperty('message', 'Group not found'); // Or similar message indicating not found/unauthorized
       });


      it('should return 401 if not authenticated', async () => {
        const res = await request(app)
          .delete(`/api/teacher/groups/${groupToDeleteId}`); // Use a valid ID, but no token

        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Unauthorized');
      });

       it('should return 403 if authenticated as a student', async () => {
         const studentLoginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testStudentCredentials.email, password: testStudentCredentials.password });
         const studentAuthToken = studentLoginRes.body.token;

        const res = await request(app)
            .delete(`/api/teacher/groups/${groupToDeleteId}`)
            .set('Authorization', `Bearer ${studentAuthToken}`); // Use student token

        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty('message', 'Forbidden');
     });

  });

});
