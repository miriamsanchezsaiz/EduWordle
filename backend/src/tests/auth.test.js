// __tests__/api/auth.test.js
const request = require('supertest');
const app = require('../../app'); // Assuming your Express app is exported from src/app.js
const sequelize = require('../config/database'); // Import sequelize for DB operations
const { User } = require('../api/models'); // Import the User model

// Ensure NODE_ENV=test is set when running these tests to use the test database

describe('Auth Endpoints (Integration Tests)', () => {
  // Define test users
  const testStudentCredentials = {
    name: 'Test Student',
    email: 'student_auth_test@example.com',
    password: 'Password123!',
    role: 'student',
  };
   const testTeacherCredentials = {
    name: 'Test Teacher',
    email: 'teacher_auth_test@example.com',
    password: 'Teacher_password123!',
    role: 'teacher',
  };

  // Store authenticated user and token for protected route tests later
  let studentAuthToken;
  let teacherAuthToken;
  let studentUser;
  let teacherUser;


  // Before running any tests in this suite, synchronize the database
  // This ensures a clean state for each test run
  beforeAll(async () => {
    // Connect to the test database and recreate schema
    // WARNING: This will drop all tables! Only use in your dedicated test environment.
    await sequelize.sync({ force: true });

    // Create test users directly in the database for login tests
    // We use the service here to ensure password hashing is handled correctly
    // In some scenarios, you might insert directly if you mock hashing in service tests
    const userService = require('../../src/api/services/userService');
    studentUser = await userService.createUser(
        testStudentCredentials.email,
        testStudentCredentials.name,
        testStudentCredentials.password,
        testStudentCredentials.role
    );
     teacherUser = await userService.createUser(
        testTeacherCredentials.email,
        testTeacherCredentials.name,
        testTeacherCredentials.password,
        testTeacherCredentials.role
    );
  });

  // After all tests in this suite are done, close the database connection
  afterAll(async () => {
    await sequelize.close();
  });

   // Optional: Clean up data before each test if needed, but force: true in beforeAll is often sufficient
   // beforeEach(async () => {
   //     // Clean up specific data if needed
   // });


  // --- Test Suite for POST /api/auth/login ---
  describe('POST /api/auth/login', () => {
    it('should login a student user successfully and return a token and user info', async () => {
      const res = await request(app)
        .post('/api/auth/login') // Adjust the endpoint path if necessary
        .send({
          email: testStudentCredentials.email,
          password: testStudentCredentials.password,
        });

      // Assertions
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(typeof res.body.token).toBe('string');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('id', studentUser.id);
      expect(res.body.user).toHaveProperty('email', testStudentCredentials.email);
      expect(res.body.user).toHaveProperty('role', 'student');
      expect(res.body.user).not.toHaveProperty('password'); // Password should not be returned

      // Store the token and user info for subsequent tests
      studentAuthToken = res.body.token;
      // studentUser = res.body.user; // You might update the user object here if needed
    });

     it('should login a teacher user successfully and return a token and user info', async () => {
      const res = await request(app)
        .post('/api/auth/login') // Adjust the endpoint path if necessary
        .send({
          email: testTeacherCredentials.email,
          password: testTeacherCredentials.password,
        });

      // Assertions
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(typeof res.body.token).toBe('string');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('id', teacherUser.id);
      expect(res.body.user).toHaveProperty('email', testTeacherCredentials.email);
      expect(res.body.user).toHaveProperty('role', 'teacher');
      expect(res.body.user).not.toHaveProperty('password'); // Password should not be returned

      // Store the token and user info for subsequent tests
      teacherAuthToken = res.body.token;
      // teacherUser = res.body.user; // You might update the user object here if needed
    });


    it('should return 401 for invalid login credentials (wrong password)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testStudentCredentials.email,
          password: 'Wrong_password123', // Incorrect password
        });

      // Assertions
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message', 'Invalid credentials');
      expect(res.body).not.toHaveProperty('token');
      expect(res.body).not.toHaveProperty('user');
    });

     it('should return 401 for invalid login credentials (non-existent email)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com', // Email not in DB
          password: 'Any_password159',
        });

      // Assertions
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message', 'Invalid credentials');
      expect(res.body).not.toHaveProperty('token');
      expect(res.body).not.toHaveProperty('user');
    });

     it('should return 400 for missing email or password in request body', async () => {
        // Test missing email
        let res = await request(app)
            .post('/api/auth/login')
            .send({ password: testStudentCredentials.password });

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toEqual(expect.arrayContaining([
             expect.objectContaining({ msg: 'Email is required' })
        ]));

        // Test missing password
        res = await request(app)
            .post('/api/auth/login')
            .send({ email: testStudentCredentials.email });

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
         expect(res.body.errors).toEqual(expect.arrayContaining([
             expect.objectContaining({ msg: 'Password is required' })
        ]));
     });
  });

  // --- Test Suite for POST /api/auth/create-user (Only for Test Environment) ---
  // This endpoint should ideally only be available in test/development environments
  // or have strict access control in production.
  describe('POST /api/auth/create-user', () => {
      const newUserCredentials = {
          name: 'New User',
          email: 'newuser_test@example.com',
          password: 'New_password123!',
          role: 'student' // or 'teacher'
      };

      // Ensure this test only runs if NODE_ENV is 'test'
      if (process.env.NODE_ENV === 'test') {
          it('should create a new user successfully', async () => {
              const res = await request(app)
                .post('/api/auth/create-user')
                .send(newUserCredentials);

              expect(res.statusCode).toBe(201);
              expect(res.body).toHaveProperty('id');
              expect(res.body).toHaveProperty('email', newUserCredentials.email);
              expect(res.body).toHaveProperty('role', newUserCredentials.role);
              expect(res.body).not.toHaveProperty('password'); // Password should not be returned

              // Verify the user was created in the database
              const createdUserInDB = await User.findByPk(res.body.id);
              expect(createdUserInDB).not.toBeNull();
              expect(createdUserInDB.email).toBe(newUserCredentials.email);
              expect(createdUserInDB.role).toBe(newUserCredentials.role);
              // You could also test if the password in DB is hashed (e.g., check length/format)
          });

          it('should return 409 if the email already exists', async () => {
              // Attempt to create a user with an email that already exists (e.g., the student test user)
              const res = await request(app)
                .post('/api/auth/create-user')
                .send(testStudentCredentials); // Use existing email

              expect(res.statusCode).toBe(409);
              expect(res.body).toHaveProperty('message', 'Email already in use');
          });

          it('should return 400 for missing required fields', async () => {
              // Test missing email
              let res = await request(app)
                .post('/api/auth/create-user')
                .send({ name: 'Missing Email', password: 'Password_258', role: 'student' });

              expect(res.statusCode).toBe(400);
              expect(res.body).toHaveProperty('errors');
              expect(res.body.errors).toEqual(expect.arrayContaining([
                  expect.objectContaining({ msg: 'Email is required' })
              ]));

               // Test missing password
              res = await request(app)
                .post('/api/auth/create-user')
                .send({ name: 'Missing Password', email: 'm@ex.com', role: 'student' });

              expect(res.statusCode).toBe(400);
              expect(res.body).toHaveProperty('errors');
               expect(res.body.errors).toEqual(expect.arrayContaining([
                  expect.objectContaining({ msg: 'Password is required' })
              ]));

              // Test missing role
              res = await request(app)
                .post('/api/auth/create-user')
                .send({ name: 'Missing Role', email: 'mr@ex.com', password: 'Password_258' });

              expect(res.statusCode).toBe(400);
              expect(res.body).toHaveProperty('errors');
               expect(res.body.errors).toEqual(expect.arrayContaining([
                  expect.objectContaining({ msg: 'Role is required' })
              ]));
          });

           it('should return 400 for invalid role', async () => {
              const res = await request(app)
                .post('/api/auth/create-user')
                .send({ ...newUserCredentials, email: 'invalidrole@ex.com', role: 'admin' }); // Invalid role

              expect(res.statusCode).toBe(400);
              expect(res.body).toHaveProperty('errors');
               expect(res.body.errors).toEqual(expect.arrayContaining([
                  expect.objectContaining({ msg: 'Role must be either "student" or "teacher"' })
              ]));
          });

      } else {
          // If not in test environment, skip these tests or test for expected production behavior (e.g., 404 or 403)
          it('should not allow user creation in non-test environments', () => {
              console.warn('Skipping /api/auth/create-user tests in non-test environment.');
              // You could add a test here to verify the endpoint returns 404/403 in production
          });
      }
  });

  // --- Example of how to use the token for a protected route test ---
  // You would put these tests in their respective files (e.g., teacherGroups.test.js)
  /*
  describe('Protected Route Example', () => {
      it('should access a protected route with a valid token', async () => {
          // Assuming you have a protected endpoint like GET /api/teacher/groups
          const res = await request(app)
              .get('/api/teacher/groups')
              .set('Authorization', `Bearer ${teacherAuthToken}`); // Use the stored teacher token

          expect(res.statusCode).toBe(200);
          // Assert on the expected response body for the protected route
          // expect(res.body).toBeInstanceOf(Array);
      });

       it('should return 401 for a protected route without a token', async () => {
          const res = await request(app)
              .get('/api/teacher/groups'); // No Authorization header

          expect(res.statusCode).toBe(401);
          expect(res.body).toHaveProperty('message', 'Unauthorized');
      });

       it('should return 401 for a protected route with an invalid token', async () => {
          const res = await request(app)
              .get('/api/teacher/groups')
               .set('Authorization', 'Bearer invalid_token'); // Invalid token

          expect(res.statusCode).toBe(401);
          expect(res.body).toHaveProperty('message', 'Unauthorized');
      });

       it('should return 403 for a protected teacher route accessed by a student', async () => {
           // Assuming /api/teacher/groups is only for teachers
            const res = await request(app)
              .get('/api/teacher/groups')
              .set('Authorization', `Bearer ${studentAuthToken}`); // Use the stored student token

          expect(res.statusCode).toBe(403);
          expect(res.body).toHaveProperty('message', 'Forbidden');
       });
  });
  */

});
