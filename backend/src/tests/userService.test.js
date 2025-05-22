// backend/src/tests/userService.test.js

// Import the userService that we want to test
const userService = require('../api/services/userService');

// Import the models and sequelize, which we will mock
const { User, Group, StudentGroup } = require('../api/models'); // Assuming your models are exported from index.js
const sequelize = require('../config/database'); // Import sequelize to mock transactions

// Mock the entire models module to control the behavior of the Sequelize models
// This tells Jest to replace the actual '../api/models' module with a mock version
jest.mock('../api/models', () => ({
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    // Mock model instance methods if they are called in the service
    // For example, if a user model instance has methods like getStudentGroups, save, destroy
    // We will add mocks for these on the objects returned by findOne/findByPk/create
  },
  Group: {
      findByPk: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      // Mock model instance methods if needed (e.g., addStudent, hasStudent)
  },
  StudentGroup: {
      bulkCreate: jest.fn(),
      destroy: jest.fn(),
      // ... mock other methods
  }
}));

// Mock the bcrypt module for password hashing and comparison
jest.mock('bcrypt', () => ({
  // Simulate hashing: prefix password with 'hashed_'
  hash: jest.fn(password => Promise.resolve(`hashed_${password}`)),
  // Simulate comparison: check if password matches the original part of the hashed password
  compare: jest.fn((password, hashedPassword) => Promise.resolve(password === hashedPassword.replace('hashed_', ''))),
}));

// Mock the emailService module
jest.mock('../api/services/emailService', () => ({
    sendInitialPasswordEmail: jest.fn(() => Promise.resolve(true)), // Simulate successful email sending
}));

// Mock sequelize for transaction handling
jest.mock('../config/database', () => ({
    sequelize: {
        transaction: jest.fn(() => ({ // Mock the transaction method
            commit: jest.fn(() => Promise.resolve()), // Mock commit
            rollback: jest.fn(() => Promise.resolve()), // Mock rollback
        })),
    },
}));


// Define a mock SALT_ROUNDS constant if your service uses it directly
// If it's loaded from .env, ensure your test environment setup handles it or mock process.env
const SALT_ROUNDS = 10; // Assuming this value is used in userService


// Describe block to group tests for the userService
describe('userService', () => {

  // Clean up mocks before each test to ensure isolation
  beforeEach(() => {
    // Clear any previous mock calls, instances, and results
    jest.clearAllMocks();
  });

  // Test suite for the findUserByEmail function
  describe('findUserByEmail', () => {

    // Test case: User is found
    it('should return the user model instance if found by email', async () => {
      // Define the mock return value for User.findOne
      // Simulate a user object that Sequelize would return (a model instance)
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        password: 'Hashed_password123!',
        role: 'student',
        // Add any methods the service might call on the returned instance
        toJSON: jest.fn(() => ({ // Mock toJSON if the controller calls it
             id: 1,
             name: 'Test User',
             email: 'test@example.com',
             password: 'Hashed_password123!',
             role: 'student',
        })),
        getStudentGroups: jest.fn(), // Mock getStudentGroups if deleteStudentIfNoGroups uses it
        save: jest.fn(), // Mock save if changePassword uses it
        destroy: jest.fn(), // Mock destroy if deleteStudentIfNoGroups uses it
      };

      // Configure the mock to return the mockUser when called
      User.findOne.mockResolvedValue(mockUser); // Use mockResolvedValue for async functions

      // Call the service function
      const emailToFind = 'test@example.com';
      const foundUser = await userService.findUserByEmail(emailToFind);

      // Assertions:
      // 1. Check if User.findOne was called exactly once
      expect(User.findOne).toHaveBeenCalledTimes(1);
      // 2. Check if User.findOne was called with the correct arguments
      expect(User.findOne).toHaveBeenCalledWith({ where: { email: emailToFind } });
      // 3. Check if the service function returned the expected user object (model instance)
      expect(foundUser).toEqual(mockUser);
    });

    // Test case: User is not found
    it('should return null if user is not found by email', async () => {
      // Configure the mock to return null when no user is found
      User.findOne.mockResolvedValue(null);

      // Call the service function
      const emailToFind = 'nonexistent@example.com';
      const foundUser = await userService.findUserByEmail(emailToFind);

      // Assertions:
      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(User.findOne).toHaveBeenCalledWith({ where: { email: emailToFind } });
      // Check if the service function returned null
      expect(foundUser).toBeNull();
    });

    // Test case: An error occurs during database query
    it('should throw an error if the database query fails', async () => {
        // Simulate a database error
        const dbError = new Error('Database connection failed');
        User.findOne.mockRejectedValue(dbError); // Use mockRejectedValue for errors

        // Call the service function and expect it to throw an error
        const emailToFind = 'test@example.com';

        // Use Jest's .rejects to test for rejected promises (errors)
        await expect(userService.findUserByEmail(emailToFind)).rejects.toThrow('Database connection failed');

        // Assertions:
        expect(User.findOne).toHaveBeenCalledTimes(1);
        expect(User.findOne).toHaveBeenCalledWith({ where: { email: emailToFind } });
    });

  });

  // Test suite for the createUser function
  describe('createUser', () => {
    const email = 'newuser@example.com';
    const name = 'New User';
    const password = 'New_password456!';
    const role = 'student';

    // Test case: User is created successfully
    it('should create a new user and return the model instance', async () => {
      // Mock findUserByEmail to return null (user does not exist)
      User.findOne.mockResolvedValue(null);

      // Mock bcrypt.hash to return a hashed password
      const hashedPassword = `hashed_${password}`;
      bcrypt.hash.mockResolvedValue(hashedPassword);

      // Define the mock return value for User.create (a model instance)
      const mockNewUser = {
        id: 2,
        email,
        name,
        password: hashedPassword,
        role,
         toJSON: jest.fn(() => ({ // Mock toJSON if the controller calls it
             id: 2,
             email,
             name,
             password: hashedPassword,
             role,
        })),
        getStudentGroups: jest.fn(),
        save: jest.fn(),
        destroy: jest.fn(),
      };
      User.create.mockResolvedValue(mockNewUser);

      // Call the service function
      const createdUser = await userService.createUser(email, name, password, role);

      // Assertions:
      // 1. Check if findUserByEmail was called
      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(User.findOne).toHaveBeenCalledWith({ where: { email } });
      // 2. Check if bcrypt.hash was called with the correct password and salt rounds
      expect(bcrypt.hash).toHaveBeenCalledTimes(1);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, SALT_ROUNDS); // Assuming SALT_ROUNDS is accessible
      // 3. Check if User.create was called with the correct arguments (including hashed password)
      expect(User.create).toHaveBeenCalledTimes(1);
      expect(User.create).toHaveBeenCalledWith({
        email,
        name,
        password: hashedPassword,
        role,
      }, { transaction: undefined }); // createUser doesn't use transaction internally by default

      // 4. Check if the service function returned the expected new user object (model instance)
      expect(createdUser).toEqual(mockNewUser);
    });

    // Test case: Email already exists
    it('should throw an error if the email already exists', async () => {
      // Mock findUserByEmail to return an existing user
      const existingUser = { id: 1, email, name: 'Existing User', role: 'student' };
      User.findOne.mockResolvedValue(existingUser);

      // Call the service function and expect it to throw an error
      await expect(userService.createUser(email, name, password, role)).rejects.toThrow('Email already in use');

      // Assertions:
      // 1. Check if findUserByEmail was called
      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(User.findOne).toHaveBeenCalledWith({ where: { email } });
      // 2. Check that bcrypt.hash and User.create were NOT called
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(User.create).not.toHaveBeenCalled();
    });

    // Test case: An error occurs during password hashing
    it('should throw an error if password hashing fails', async () => {
        // Mock findUserByEmail to return null
        User.findOne.mockResolvedValue(null);

        // Simulate a hashing error
        const hashError = new Error('Hashing failed');
        bcrypt.hash.mockRejectedValue(hashError);

        // Call the service function and expect it to throw an error
        await expect(userService.createUser(email, name, password, role)).rejects.toThrow('Hashing failed');

        // Assertions:
        expect(User.findOne).toHaveBeenCalledTimes(1);
        expect(bcrypt.hash).toHaveBeenCalledTimes(1);
        expect(User.create).not.toHaveBeenCalled(); // User.create should not be called
    });

     // Test case: An error occurs during User.create
    it('should throw an error if User.create fails', async () => {
        // Mock findUserByEmail to return null
        User.findOne.mockResolvedValue(null);

        // Mock bcrypt.hash to return a hashed password
        const hashedPassword = `hashed_${password}`;
        bcrypt.hash.mockResolvedValue(hashedPassword);

        // Simulate a database error during creation
        const createError = new Error('Database insert failed');
        User.create.mockRejectedValue(createError);

        // Call the service function and expect it to throw an error
        await expect(userService.createUser(email, name, password, role)).rejects.toThrow('Database insert failed');

        // Assertions:
        expect(User.findOne).toHaveBeenCalledTimes(1);
        expect(bcrypt.hash).toHaveBeenCalledTimes(1);
        expect(User.create).toHaveBeenCalledTimes(1); // User.create should be called
    });

  });

  // Test suite for the changePassword function
  describe('changePassword', () => {
      const userId = 1;
      const oldPassword = 'Old_password987!';
      const newPassword = 'New_password456!';
      const hashedPassword = 'hashed_Old_password987!';
      const hashedNewPassword = 'hashed_New_password456!';

      // Mock a user model instance with necessary methods
      const mockUser = {
          id: userId,
          email: 'test@example.com',
          password: hashedPassword,
          role: 'student',
          save: jest.fn(() => Promise.resolve()), // Mock the save method
          toJSON: jest.fn(), // Mock toJSON if needed elsewhere
          getStudentGroups: jest.fn(),
          destroy: jest.fn(),
      };

      // Mock sequelize transaction methods
      const mockTransaction = {
          commit: jest.fn(() => Promise.resolve()),
          rollback: jest.fn(() => Promise.resolve()),
      };
      sequelize.transaction.mockResolvedValue(mockTransaction);


      // Test case: Password change successful
      it('should change the password successfully if old password is correct', async () => {
          // Mock findByPk to return the user
          User.findByPk.mockResolvedValue(mockUser);

          // Mock bcrypt.compare to return true (old password is valid)
          bcrypt.compare.mockResolvedValue(true);

          // Mock bcrypt.hash for the new password
          bcrypt.hash.mockResolvedValue(hashedNewPassword);

          // Call the service function
          const result = await userService.changePassword(userId, oldPassword, newPassword);

          // Assertions:
          // 1. Check if a transaction was started
          expect(sequelize.transaction).toHaveBeenCalledTimes(1);
          // 2. Check if findByPk was called within the transaction
          expect(User.findByPk).toHaveBeenCalledTimes(1);
          expect(User.findByPk).toHaveBeenCalledWith(userId, { transaction: mockTransaction });
          // 3. Check if bcrypt.compare was called with correct passwords
          expect(bcrypt.compare).toHaveBeenCalledTimes(1);
          expect(bcrypt.compare).toHaveBeenCalledWith(oldPassword, hashedPassword);
          // 4. Check if bcrypt.hash was called with the new password and salt rounds
          expect(bcrypt.hash).toHaveBeenCalledTimes(1);
          expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, SALT_ROUNDS);
          // 5. Check if the user's password was updated on the model instance
          expect(mockUser.password).toBe(hashedNewPassword);
          // 6. Check if user.save was called within the transaction
          expect(mockUser.save).toHaveBeenCalledTimes(1);
          expect(mockUser.save).toHaveBeenCalledWith({ transaction: mockTransaction });
          // 7. Check if the transaction was committed
          expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
          expect(mockTransaction.rollback).not.toHaveBeenCalled(); // Rollback should not be called
          // 8. Check the return value
          expect(result).toBe(true);
      });

      // Test case: User not found
      it('should throw an error if the user is not found', async () => {
          // Mock findByPk to return null
          User.findByPk.mockResolvedValue(null);

          // Call the service function and expect it to throw an error
          await expect(userService.changePassword(userId, oldPassword, newPassword)).rejects.toThrow('User not found');

          // Assertions:
          expect(sequelize.transaction).toHaveBeenCalledTimes(1);
          expect(User.findByPk).toHaveBeenCalledTimes(1);
          expect(bcrypt.compare).not.toHaveBeenCalled(); // Comparison should not happen
          expect(bcrypt.hash).not.toHaveBeenCalled(); // Hashing should not happen
          expect(mockUser.save).not.toHaveBeenCalled(); // Save should not happen
          expect(mockTransaction.commit).not.toHaveBeenCalled(); // Commit should not happen
          expect(mockTransaction.rollback).toHaveBeenCalledTimes(1); // Transaction should be rolled back
      });

      // Test case: Incorrect old password
      it('should throw an error if the old password is incorrect', async () => {
          // Mock findByPk to return the user
          User.findByPk.mockResolvedValue(mockUser);

          // Mock bcrypt.compare to return false (old password is invalid)
          bcrypt.compare.mockResolvedValue(false);

          // Call the service function and expect it to throw an error
          await expect(userService.changePassword(userId, oldPassword, newPassword)).rejects.toThrow('Incorrect old password');

          // Assertions:
          expect(sequelize.transaction).toHaveBeenCalledTimes(1);
          expect(User.findByPk).toHaveBeenCalledTimes(1);
          expect(bcrypt.compare).toHaveBeenCalledTimes(1);
          expect(bcrypt.hash).not.toHaveBeenCalled(); // Hashing should not happen
          expect(mockUser.save).not.toHaveBeenCalled(); // Save should not happen
          expect(mockTransaction.commit).not.toHaveBeenCalled(); // Commit should not happen
          expect(mockTransaction.rollback).toHaveBeenCalledTimes(1); // Transaction should be rolled back
      });

       // Test case: Error during bcrypt.compare
      it('should throw an error if bcrypt.compare fails', async () => {
          // Mock findByPk to return the user
          User.findByPk.mockResolvedValue(mockUser);

          // Simulate a comparison error
          const compareError = new Error('Comparison failed');
          bcrypt.compare.mockRejectedValue(compareError);

          // Call the service function and expect it to throw an error
          await expect(userService.changePassword(userId, oldPassword, newPassword)).rejects.toThrow('Comparison failed');

          // Assertions:
          expect(sequelize.transaction).toHaveBeenCalledTimes(1);
          expect(User.findByPk).toHaveBeenCalledTimes(1);
          expect(bcrypt.compare).toHaveBeenCalledTimes(1);
          expect(bcrypt.hash).not.toHaveBeenCalled();
          expect(mockUser.save).not.toHaveBeenCalled();
          expect(mockTransaction.commit).not.toHaveBeenCalled();
          expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
      });

      // Test case: Error during bcrypt.hash (new password)
      it('should throw an error if hashing the new password fails', async () => {
          // Mock findByPk to return the user
          User.findByPk.mockResolvedValue(mockUser);

          // Mock bcrypt.compare to return true
          bcrypt.compare.mockResolvedValue(true);

          // Simulate a hashing error for the new password
          const hashError = new Error('New password hashing failed');
          bcrypt.hash.mockRejectedValue(hashError);

          // Call the service function and expect it to throw an error
          await expect(userService.changePassword(userId, oldPassword, newPassword)).rejects.toThrow('New password hashing failed');

          // Assertions:
          expect(sequelize.transaction).toHaveBeenCalledTimes(1);
          expect(User.findByPk).toHaveBeenCalledTimes(1);
          expect(bcrypt.compare).toHaveBeenCalledTimes(1);
          expect(bcrypt.hash).toHaveBeenCalledTimes(1);
          expect(mockUser.save).not.toHaveBeenCalled();
          expect(mockTransaction.commit).not.toHaveBeenCalled();
          expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
      });

       // Test case: Error during user.save
      it('should throw an error if user.save fails', async () => {
          // Mock findByPk to return the user
          User.findByPk.mockResolvedValue(mockUser);

          // Mock bcrypt.compare to return true
          bcrypt.compare.mockResolvedValue(true);

          // Mock bcrypt.hash to return a hashed new password
          bcrypt.hash.mockResolvedValue(hashedNewPassword);

          // Simulate a save error
          const saveError = new Error('Database save failed');
          mockUser.save.mockRejectedValue(saveError); // Mock the save method on the mock user instance

          // Call the service function and expect it to throw an error
          await expect(userService.changePassword(userId, oldPassword, newPassword)).rejects.toThrow('Database save failed');

          // Assertions:
          expect(sequelize.transaction).toHaveBeenCalledTimes(1);
          expect(User.findByPk).toHaveBeenCalledTimes(1);
          expect(bcrypt.compare).toHaveBeenCalledTimes(1);
          expect(bcrypt.hash).toHaveBeenCalledTimes(1);
          expect(mockUser.save).toHaveBeenCalledTimes(1);
          expect(mockTransaction.commit).not.toHaveBeenCalled();
          expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
      });
  });

  // Test suite for the getUserById function
  describe('getUserById', () => {
      const userId = 1;

      // Test case: User is found
      it('should return the user model instance if found by ID', async () => {
          // Define the mock return value for User.findByPk
          const mockUser = {
              id: userId,
              name: 'Test User',
              email: 'test@example.com',
              role: 'student',
               toJSON: jest.fn(), // Mock toJSON if needed
               getStudentGroups: jest.fn(),
               save: jest.fn(),
               destroy: jest.fn(),
          };
          User.findByPk.mockResolvedValue(mockUser);

          // Call the service function
          const foundUser = await userService.getUserById(userId);

          // Assertions:
          expect(User.findByPk).toHaveBeenCalledTimes(1);
          expect(User.findByPk).toHaveBeenCalledWith(userId); // No transaction needed here in service
          expect(foundUser).toEqual(mockUser);
      });

      // Test case: User is not found
      it('should return null if user is not found by ID', async () => {
          // Mock findByPk to return null
          User.findByPk.mockResolvedValue(null);

          // Call the service function
          const foundUser = await userService.getUserById(userId);

          // Assertions:
          expect(User.findByPk).toHaveBeenCalledTimes(1);
          expect(User.findByPk).toHaveBeenCalledWith(userId);
          expect(foundUser).toBeNull();
      });

       // Test case: An error occurs during database query
      it('should throw an error if the database query fails', async () => {
        // Simulate a database error
        const dbError = new Error('Database connection failed');
        User.findByPk.mockRejectedValue(dbError);

        // Call the service function and expect it to throw an error
        await expect(userService.getUserById(userId)).rejects.toThrow('Database connection failed');

        // Assertions:
        expect(User.findByPk).toHaveBeenCalledTimes(1);
        expect(User.findByPk).toHaveBeenCalledWith(userId);
    });
  });

  // Test suite for the deleteStudentIfNoGroups function
  describe('deleteStudentIfNoGroups', () => {
      const studentId = 1;
      const teacherId = 4; // Example teacher ID, though not directly used in this function's logic
      const mockTransaction = { // Mock transaction for when it's passed
          commit: jest.fn(),
          rollback: jest.fn(),
      };

      // Mock a student user model instance
      const mockStudentUser = {
          id: studentId,
          name: 'Student User',
          email: 'student@example.com',
          role: 'student',
          toJSON: jest.fn(),
          save: jest.fn(),
          destroy: jest.fn(() => Promise.resolve()), // Mock destroy method
          getStudentGroups: jest.fn(), // Mock the association method
      };

      // Mock a non-student user model instance
      const mockTeacherUser = {
          id: teacherId,
          name: 'Teacher User',
          email: 'teacher@example.com',
          role: 'teacher',
          toJSON: jest.fn(),
          save: jest.fn(),
          destroy: jest.fn(),
          getStudentGroups: jest.fn(),
      };


      // Test case: Student has no groups and is deleted
      it('should delete the student user if they belong to no groups', async () => {
          // Mock findByPk to return the student user
          User.findByPk.mockResolvedValue(mockStudentUser);

          // Mock getStudentGroups to return an empty array (no groups)
          mockStudentUser.getStudentGroups.mockResolvedValue([]);

          // Call the service function
          const isDeleted = await userService.deleteStudentIfNoGroups(studentId);

          // Assertions:
          // 1. Check if findByPk was called
          expect(User.findByPk).toHaveBeenCalledTimes(1);
          expect(User.findByPk).toHaveBeenCalledWith(studentId, { transaction: undefined }); // No transaction passed initially
          // 2. Check if getStudentGroups was called on the user instance
          expect(mockStudentUser.getStudentGroups).toHaveBeenCalledTimes(1);
          expect(mockStudentUser.getStudentGroups).toHaveBeenCalledWith({ transaction: undefined });
          // 3. Check if user.destroy was called
          expect(mockStudentUser.destroy).toHaveBeenCalledTimes(1);
          expect(mockStudentUser.destroy).toHaveBeenCalledWith({ transaction: undefined });
          // 4. Check the return value
          expect(isDeleted).toBe(true);
      });

       // Test case: Student has groups and is NOT deleted
      it('should NOT delete the student user if they belong to one or more groups', async () => {
           // Mock findByPk to return the student user
          User.findByPk.mockResolvedValue(mockStudentUser);

          // Mock getStudentGroups to return a non-empty array (user is in groups)
          const mockGroups = [{ id: 1, name: 'Group 1' }];
          mockStudentUser.getStudentGroups.mockResolvedValue(mockGroups);

          // Call the service function
          const isDeleted = await userService.deleteStudentIfNoGroups(studentId);

          // Assertions:
          expect(User.findByPk).toHaveBeenCalledTimes(1);
          expect(mockStudentUser.getStudentGroups).toHaveBeenCalledTimes(1);
          // Check if user.destroy was NOT called
          expect(mockStudentUser.destroy).not.toHaveBeenCalled();
          // Check the return value
          expect(isDeleted).toBe(false);
      });

      // Test case: User not found
      it('should return false if the user is not found', async () => {
           // Mock findByPk to return null
          User.findByPk.mockResolvedValue(null);

          // Call the service function
          const isDeleted = await userService.deleteStudentIfNoGroups(studentId);

          // Assertions:
          expect(User.findByPk).toHaveBeenCalledTimes(1);
          // Check that getStudentGroups and destroy were NOT called
          expect(mockStudentUser.getStudentGroups).not.toHaveBeenCalled();
          expect(mockStudentUser.destroy).not.toHaveBeenCalled();
          // Check the return value
          expect(isDeleted).toBe(false);
      });

      // Test case: User is not a student (e.g., is a teacher)
      it('should return false if the user is not a student', async () => {
           // Mock findByPk to return a non-student user (e.g., teacher)
          User.findByPk.mockResolvedValue(mockTeacherUser);

          // Call the service function
          const isDeleted = await userService.deleteStudentIfNoGroups(teacherId); // Use teacherId

          // Assertions:
          expect(User.findByPk).toHaveBeenCalledTimes(1);
          // Check that getStudentGroups and destroy were NOT called
          expect(mockTeacherUser.getStudentGroups).not.toHaveBeenCalled(); // Use mockTeacherUser
          expect(mockTeacherUser.destroy).not.toHaveBeenCalled(); // Use mockTeacherUser
          // Check the return value
          expect(isDeleted).toBe(false);
      });

      // Test case: Error during findByPk
      it('should throw an error if finding the user fails', async () => {
           // Simulate a database error during findByPk
          const dbError = new Error('DB find failed');
          User.findByPk.mockRejectedValue(dbError);

          // Call the service function and expect it to throw an error
          await expect(userService.deleteStudentIfNoGroups(studentId)).rejects.toThrow('DB find failed');

          // Assertions:
          expect(User.findByPk).toHaveBeenCalledTimes(1);
          expect(mockStudentUser.getStudentGroups).not.toHaveBeenCalled();
          expect(mockStudentUser.destroy).not.toHaveBeenCalled();
      });

       // Test case: Error during getStudentGroups
      it('should throw an error if getting student groups fails', async () => {
           // Mock findByPk to return the student user
          User.findByPk.mockResolvedValue(mockStudentUser);

          // Simulate an error during getStudentGroups
          const groupError = new Error('Error fetching groups');
          mockStudentUser.getStudentGroups.mockRejectedValue(groupError);

          // Call the service function and expect it to throw an error
          await expect(userService.deleteStudentIfNoGroups(studentId)).rejects.toThrow('Error fetching groups');

          // Assertions:
          expect(User.findByPk).toHaveBeenCalledTimes(1);
          expect(mockStudentUser.getStudentGroups).toHaveBeenCalledTimes(1);
          expect(mockStudentUser.destroy).not.toHaveBeenCalled();
      });

       // Test case: Error during user.destroy
      it('should throw an error if deleting the user fails', async () => {
           // Mock findByPk to return the student user
          User.findByPk.mockResolvedValue(mockStudentUser);

          // Mock getStudentGroups to return an empty array
          mockStudentUser.getStudentGroups.mockResolvedValue([]);

          // Simulate an error during destroy
          const deleteError = new Error('DB delete failed');
          mockStudentUser.destroy.mockRejectedValue(deleteError);

          // Call the service function and expect it to throw an error
          await expect(userService.deleteStudentIfNoGroups(studentId)).rejects.toThrow('DB delete failed');

          // Assertions:
          expect(User.findByPk).toHaveBeenCalledTimes(1);
          expect(mockStudentUser.getStudentGroups).toHaveBeenCalledTimes(1);
          expect(mockStudentUser.destroy).toHaveBeenCalledTimes(1);
      });

      // Test case: Student has no groups and is deleted (with transaction)
      it('should delete the student user if they belong to no groups (with transaction)', async () => {
           // Mock findByPk to return the student user
          User.findByPk.mockResolvedValue(mockStudentUser);

          // Mock getStudentGroups to return an empty array (no groups)
          mockStudentUser.getStudentGroups.mockResolvedValue([]);

          // Call the service function with a transaction
          const isDeleted = await userService.deleteStudentIfNoGroups(studentId, mockTransaction);

          // Assertions:
          expect(User.findByPk).toHaveBeenCalledTimes(1);
          expect(User.findByPk).toHaveBeenCalledWith(studentId, { transaction: mockTransaction }); // Transaction should be passed
          expect(mockStudentUser.getStudentGroups).toHaveBeenCalledTimes(1);
          expect(mockStudentUser.getStudentGroups).toHaveBeenCalledWith({ transaction: mockTransaction }); // Transaction should be passed
          expect(mockStudentUser.destroy).toHaveBeenCalledTimes(1);
          expect(mockStudentUser.destroy).toHaveBeenCalledWith({ transaction: mockTransaction }); // Transaction should be passed
          expect(isDeleted).toBe(true);
      });

       // Test case: Student has groups and is NOT deleted (with transaction)
      it('should NOT delete the student user if they belong to groups (with transaction)', async () => {
           // Mock findByPk to return the student user
          User.findByPk.mockResolvedValue(mockStudentUser);

          // Mock getStudentGroups to return a non-empty array (user is in groups)
          const mockGroups = [{ id: 1, name: 'Group 1' }];
          mockStudentUser.getStudentGroups.mockResolvedValue(mockGroups);

          // Call the service function with a transaction
          const isDeleted = await userService.deleteStudentIfNoGroups(studentId, mockTransaction);

          // Assertions:
          expect(User.findByPk).toHaveBeenCalledTimes(1);
          expect(User.findByPk).toHaveBeenCalledWith(studentId, { transaction: mockTransaction });
          expect(mockStudentUser.getStudentGroups).toHaveBeenCalledTimes(1);
          expect(mockStudentUser.getStudentGroups).toHaveBeenCalledWith({ transaction: mockTransaction });
          expect(mockStudentUser.destroy).not.toHaveBeenCalled();
          expect(isDeleted).toBe(false);
      });
  });

});
