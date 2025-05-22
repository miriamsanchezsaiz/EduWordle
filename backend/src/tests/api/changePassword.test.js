// __tests__/api/changePassword.test.js
const request = require('supertest');
const app = require('../../../app'); // Assuming your Express app is exported from src/app.js
const sequelize = require('../../config/database'); // Import sequelize for DB operations
const { User } = require('../../api/models'); // Import the User model
const userService = require('../../api/services/userService'); // Import userService to create users and hash passwords
const bcrypt = require('bcrypt'); // Import bcrypt to compare passwords in tests (optional but good for verification)

// Ensure NODE_ENV=test is set when running these tests to use the test database


describe('Change Password Endpoints (Integration Tests)', () => {
  // Define test users
  const testStudentCredentials = {
    name: 'Student Change Pass',
    email: 'student_changepass@example.com',
    password: 'OldP@ssw0rd123!', // Original password
    role: 'student',
  };
  const testTeacherCredentials = {
    name: 'Teacher Change Pass',
    email: 'teacher_changepass@example.com',
    password: 'OldTeacher_P@ssw0rd!', // Original password
    role: 'teacher',
  };

  // Store authenticated tokens and user objects
  let studentAuthToken;
  let studentUser;
  let teacherAuthToken;
  let teacherUser;

  // Define new passwords
  const newStudentPassword = 'NewStudentP@ssw0rd456!';
  const newTeacherPassword = 'NewTeacher_P@ssw0rd789!';


  // Before running any tests in this suite, synchronize the database and create base users
  beforeAll(async () => {
    // Connect to the test database and recreate schema
    await sequelize.sync({ force: true });


  });

  // After all tests in this suite are done, close the database connection
  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {

    // DESHABILITAR COMPROBACIONES DE CLAVES FORÁNEAS TEMPORALMENTE
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', null, { raw: true });

    // Eliminar datos de tablas en el orden correcto si hay dependencias
    // O más fácil: usar truncate en cada tabla
    
    await User.destroy({ where: {}, truncate: true }); // Ahora debería funcionar porque las dependencias ya no están o se han reseteado.

    // HABILITAR COMPROBACIONES DE CLAVES FORÁNEAS DE NUEVO
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', null, { raw: true });

    // Create base users using the service to ensure password hashing
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


    // Login users to get tokens for protected routes
    const studentLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testStudentCredentials.email,
        password: testStudentCredentials.password,
      });
    studentAuthToken = studentLoginRes.body.token;

    const teacherLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testTeacherCredentials.email,
        password: testTeacherCredentials.password,
      });
    teacherAuthToken = teacherLoginRes.body.token;

    testStudentCredentials.password = 'OldP@ssw0rd123!'; 
    testTeacherCredentials.password = 'OldTeacher_P@ssw0rd!';

  })


  // --- Test Suite for PUT /api/student/change-password ---
  describe('PUT /api/student/change-password', () => {

    it('should allow a student to change their password with correct old password', async () => {
      const res = await request(app)
        .put('/api/student/change-password')
        .set('Authorization', `Bearer ${studentAuthToken}`) // Authenticated as the student
        .send({
          oldPassword: testStudentCredentials.password,
          newPassword: newStudentPassword,
        });

      // Assertions
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Password changed successfully');


      //  Verify the password change in the database by attempting to log in with the new password
      const loginWithNewPassRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testStudentCredentials.email,
          password: newStudentPassword,
        });
      expect(loginWithNewPassRes.statusCode).toBe(200); // Should be able to log in with new password

      // Verify the old password no longer works
      const loginWithOldPassRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testStudentCredentials.email,
          password: testStudentCredentials.password,
        });
      expect(loginWithOldPassRes.statusCode).toBe(401); // Old password should fail

    });

    it('should return 401 if the old password is incorrect', async () => {
      const res = await request(app)
        .put('/api/student/change-password')
        .set('Authorization', `Bearer ${studentAuthToken}`) // Authenticated as the student
        .send({
          oldPassword: 'incorrectoldpassword', // Incorrect old password
          newPassword: "new_Password777",
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message', 'Incorrect old password');

      // Verify the password was NOT changed by attempting to log in with the new password
      const loginWithNewPassRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testStudentCredentials.email,
          password: "new_Password777",
        });
      expect(loginWithNewPassRes.statusCode).toBe(401); // Should NOT be able to log in with new password
      // Verify the old password still works

      const loginWithOldPassRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testStudentCredentials.email,
          password: testStudentCredentials.password,
        });
      expect(loginWithOldPassRes.statusCode).toBe(200); // Old password should still work
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .put('/api/student/change-password')
        .send({ oldPassword: 'any', newPassword: 'any' }); // No Authorization header

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message', 'Authentication token required');
    });

    it('should return 403 if authenticated as a teacher', async () => {
      const teacherLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testTeacherCredentials.email, password: testTeacherCredentials.password });
      const teacherAuthToken = teacherLoginRes.body.token;

      const res = await request(app)
        .put('/api/student/change-password')
        .set('Authorization', `Bearer ${teacherAuthToken}`) // Use teacher token
        .send({ oldPassword: 'any', newPassword: 'any' });

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('message', 'Access denied: Insufficient permissions');
    });


    it('should return 400 for missing required fields', async () => {
      // Test missing oldPassword
      let res = await request(app)
        .put('/api/student/change-password')
        .set('Authorization', `Bearer ${studentAuthToken}`)
        .send({ newPassword: 'new' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ msg: 'Old password is required' })
      ]));

      // Test missing newPassword
      res = await request(app)
        .put('/api/student/change-password')
        .set('Authorization', `Bearer ${studentAuthToken}`)
        .send({ oldPassword: 'old' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ msg: 'New password is required' })
      ]));
    });

    // Note: Testing changing password for a non-existent user is implicitly covered
    // by the 401/403 checks, as the user ID from the token is used.
    // If the user corresponding to the token didn't exist, authentication would fail first.

  });


  // --- Test Suite for PUT /api/teacher/change-password ---
  describe('PUT /api/teacher/change-password', () => {

    it('should allow a teacher to change their password with correct old password', async () => {
      const res = await request(app)
        .put('/api/teacher/change-password')
        .set('Authorization', `Bearer ${teacherAuthToken}`) // Authenticated as the teacher
        .send({
          oldPassword: testTeacherCredentials.password,
          newPassword: newTeacherPassword,
        });

      // Assertions
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Password changed successfully');

      // Optional: Verify the password change in the database by attempting to log in with the new password
      const loginWithNewPassRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testTeacherCredentials.email,
          password: newTeacherPassword,
        });
      expect(loginWithNewPassRes.statusCode).toBe(200); // Should be able to log in with new password

      // Optional: Verify the old password no longer works
      const loginWithOldPassRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testTeacherCredentials.email,
          password: testTeacherCredentials.password,
        });
      expect(loginWithOldPassRes.statusCode).toBe(401); // Old password should fail
    });

    it('should return 401 if the old password is incorrect', async () => {
      const res = await request(app)
        .put('/api/teacher/change-password')
        .set('Authorization', `Bearer ${teacherAuthToken}`) // Authenticated as the teacher
        .send({
          oldPassword: 'incorrectoldpassword', // Incorrect old password
          newPassword: "new_Password777",
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message', 'Incorrect old password');

      // Verify the password was NOT changed by attempting to log in with the new password
      const loginWithNewPassRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testTeacherCredentials.email,
          password: "new_Password777",
        });
      expect(loginWithNewPassRes.statusCode).toBe(401); // Should NOT be able to log in with new password
      // Verify the old password still works
      const loginWithOldPassRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testTeacherCredentials.email,
          password: testTeacherCredentials.password,
        });
      expect(loginWithOldPassRes.statusCode).toBe(200); // Old password should still work
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .put('/api/teacher/change-password')
        .send({ oldPassword: 'any', newPassword: 'any' }); // No Authorization header

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message', 'Authentication token required');
    });

    it('should return 403 if authenticated as a student', async () => {
      let newStudentAuthToken;
      const studentLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testStudentCredentials.email, password: testStudentCredentials.password });
      const studentAuthToken = studentLoginRes.body.token;

      const res = await request(app)
        .put('/api/teacher/change-password')
        .set('Authorization', `Bearer ${studentAuthToken}`) // Use student token
        .send({ oldPassword: 'any', newPassword: 'any' });

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('message', 'Access denied: Insufficient permissions');
    });


    it('should return 400 for missing required fields', async () => {
      // Test missing oldPassword
      let res = await request(app)
        .put('/api/teacher/change-password')
        .set('Authorization', `Bearer ${teacherAuthToken}`)
        .send({ newPassword: 'new' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ msg: 'Old password is required' })
      ]));

      // Test missing newPassword
      res = await request(app)
        .put('/api/teacher/change-password')
        .set('Authorization', `Bearer ${teacherAuthToken}`)
        .send({ oldPassword: 'old' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ msg: 'New password is required' })
      ]));
    });

  });

});
