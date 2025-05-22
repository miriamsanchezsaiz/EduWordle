// backend/src/tests/wordleService.test.js

// Import the wordleService that we want to test
const wordleService = require('../api/services/wordleService');

// Import dependencies that wordleService uses, which we will mock
const { GameResult, User, Group, Wordle, Word, Question, StudentGroup, WordleGroup } = require('../api/models');
const sequelize = require('../config/database');
const userService = require('../api/services/userService');
const { Op } = require('sequelize'); // Import Op as it's used in the service

// Mock the entire models module
jest.mock('../api/models', () => ({
  GameResult: {
    findOne: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    // Mock instance methods if needed
    save: jest.fn(),
  },
  User: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    // Mock instance methods
    getStudentGroups: jest.fn(),
    toJSON: jest.fn(),
  },
  Group: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    // Mock instance methods
    save: jest.fn(),
    destroy: jest.fn(),
    addStudent: jest.fn(),
    removeStudents: jest.fn(),
    hasStudent: jest.fn(),
    getStudents: jest.fn(),
    getAccessibleWordles: jest.fn(), // Used in getAccessibleWordlesForStudent
    toJSON: jest.fn(),
  },
  Wordle: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    // Mock instance methods
    save: jest.fn(),
    destroy: jest.fn(),
    toJSON: jest.fn(),
    getWord: jest.fn(), // Used in getWordleDataForGame
    getQuestions: jest.fn(), // Used in getWordleDataForGame
    getGroupsWithAccess: jest.fn(), // Used in getWordleDetails
  },
  Word: {
    create: jest.fn(),
    findOne: jest.fn(), // Used in updateWordle
    // Mock instance methods
    save: jest.fn(),
  },
  Question: {
    bulkCreate: jest.fn(),
    findAll: jest.fn(), // Used in updateWordle
    destroy: jest.fn(), // Used in updateWordle
    // Mock instance methods
    save: jest.fn(),
  },
  StudentGroup: {
    bulkCreate: jest.fn(),
    destroy: jest.fn(),
    findOne: jest.fn(), // Used in checkStudentAccess
  },
   WordleGroup: {
      bulkCreate: jest.fn(), // Used in createWordle, updateWordle
      destroy: jest.fn(), // Used in updateWordle
      findOne: jest.fn(), // Used in checkStudentAccess
   },
}));

// Mock the userService module
jest.mock('../api/services/userService', () => ({
  findUserByEmail: jest.fn(),
  createUser: jest.fn(),
  getUserById: jest.fn(),
  deleteStudentIfNoGroups: jest.fn(),
}));

// Mock the emailService module (if used in wordleService, e.g., when creating users via group access)
jest.mock('../api/services/emailService', () => ({
    sendInitialPasswordEmail: jest.fn(() => Promise.resolve(true)),
}));


// Mock sequelize for transaction handling
const mockTransaction = {
    commit: jest.fn(() => Promise.resolve()),
    rollback: jest.fn(() => Promise.resolve()),
};
sequelize.transaction = jest.fn(() => Promise.resolve(mockTransaction));

// Mock the Date object to control time-based logic (for active/inactive groups)
// This is important for testing filters based on dates in getAccessibleWordlesForStudent
const mockDate = new Date('2025-05-10T10:00:00Z');
const originalDate = global.Date;

global.Date = jest.fn(() => mockDate);
global.Date.now = jest.fn(() => mockDate.getTime());
global.Date.parse = jest.fn(originalDate.parse);
global.Date.UTC = jest.fn(originalDate.UTC);
global.Date.prototype.getTime = jest.fn(() => mockDate.getTime()); // Mock instance getTime


// Describe block to group tests for the wordleService
describe('wordleService', () => {

  // Clean up mocks before each test to ensure isolation
  beforeEach(() => {
    jest.clearAllMocks();
  });

   // Restore the original Date object after all tests
  afterAll(() => {
      global.Date = originalDate;
  });


  // --- Test Suites for Helper Functions (already covered in groupService.test.js, but included here as they are in wordleService.js) ---

  describe('isStudentInTeacherGroup', () => {
      const studentId = 1;
      const teacherId = 4;
      const mockStudentUser = {
          id: studentId,
          role: 'student',
          getStudentGroups: jest.fn(), // Mock the association method
      };
      const mockNonStudentUser = {
          id: 2,
          role: 'teacher',
          getStudentGroups: jest.fn(),
      };

      it('should return true if the student is in a group created by the teacher', async () => {
          User.findByPk.mockResolvedValue(mockStudentUser);
          const mockGroups = [{ id: 1, userId: teacherId }]; // Group created by the teacher
          mockStudentUser.getStudentGroups.mockResolvedValue(mockGroups);

          const result = await wordleService.isStudentInTeacherGroup(studentId, teacherId);

          expect(User.findByPk).toHaveBeenCalledWith(studentId);
          expect(mockStudentUser.getStudentGroups).toHaveBeenCalledWith({
              where: { userId: teacherId },
              through: { attributes: [] },
              attributes: ['id']
          });
          expect(result).toBe(true);
      });

      it('should return false if the student is not found', async () => {
          User.findByPk.mockResolvedValue(null);

          const result = await wordleService.isStudentInTeacherGroup(studentId, teacherId);

          expect(User.findByPk).toHaveBeenCalledWith(studentId);
          expect(mockStudentUser.getStudentGroups).not.toHaveBeenCalled();
          expect(result).toBe(false);
      });

       it('should return false if the user found is not a student', async () => {
          User.findByPk.mockResolvedValue(mockNonStudentUser); // Found a teacher instead

          const result = await wordleService.isStudentInTeacherGroup(mockNonStudentUser.id, teacherId);

          expect(User.findByPk).toHaveBeenCalledWith(mockNonStudentUser.id);
          expect(mockNonStudentUser.getStudentGroups).not.toHaveBeenCalled();
          expect(result).toBe(false);
      });

      it('should return false if the student is found but not in any group by the teacher', async () => {
          User.findByPk.mockResolvedValue(mockStudentUser);
          const mockGroups = [{ id: 2, userId: 99 }]; // Group not created by this teacher
          mockStudentUser.getStudentGroups.mockResolvedValue(mockGroups);

          const result = await wordleService.isStudentInTeacherGroup(studentId, teacherId);

          expect(User.findByPk).toHaveBeenCalledWith(studentId);
          expect(mockStudentUser.getStudentGroups).toHaveBeenCalledWith({
              where: { userId: teacherId },
              through: { attributes: [] },
              attributes: ['id']
          });
          expect(result).toBe(false);
      });

      it('should throw an error if a database query fails', async () => {
          const dbError = new Error('DB error');
          User.findByPk.mockRejectedValue(dbError);

          await expect(wordleService.isStudentInTeacherGroup(studentId, teacherId)).rejects.toThrow('DB error');
          expect(User.findByPk).toHaveBeenCalledWith(studentId);
      });
  });

  describe('isWordleCreatedByTeacher', () => {
      const wordleId = 1;
      const teacherId = 4;
      const mockWordle = { id: wordleId, userId: teacherId };
      const mockOtherWordle = { id: 2, userId: 99 };

      it('should return true if the wordle is created by the teacher', async () => {
          Wordle.findOne.mockResolvedValue(mockWordle);

          const result = await wordleService.isWordleCreatedByTeacher(wordleId, teacherId);

          expect(Wordle.findOne).toHaveBeenCalledWith({
              where: { id: wordleId, userId: teacherId },
              attributes: ['id']
          });
          expect(result).toBe(true);
      });

      it('should return false if the wordle is not found', async () => {
          Wordle.findOne.mockResolvedValue(null);

          const result = await wordleService.isWordleCreatedByTeacher(wordleId, teacherId);

          expect(Wordle.findOne).toHaveBeenCalledWith({
              where: { id: wordleId, userId: teacherId },
              attributes: ['id']
          });
          expect(result).toBe(false);
      });

      it('should return false if the wordle is found but created by another teacher', async () => {
          Wordle.findOne.mockResolvedValue(mockOtherWordle);

          const result = await wordleService.isWordleCreatedByTeacher(mockOtherWordle.id, teacherId);

          expect(Wordle.findOne).toHaveBeenCalledWith({
              where: { id: mockOtherWordle.id, userId: teacherId }, // Note: The query includes the teacherId filter
              attributes: ['id']
          });
          expect(result).toBe(false); // The query would return null in a real DB, mock simulates finding it
      });

      it('should throw an error if a database query fails', async () => {
          const dbError = new Error('DB error');
          Wordle.findOne.mockRejectedValue(dbError);

          await expect(wordleService.isWordleCreatedByTeacher(wordleId, teacherId)).rejects.toThrow('DB error');
          expect(Wordle.findOne).toHaveBeenCalledWith({
              where: { id: wordleId, userId: teacherId },
              attributes: ['id']
          });
      });
  });

   describe('isGroupCreatedByTeacher', () => {
      const groupId = 1;
      const teacherId = 4;
      const mockGroup = { id: groupId, userId: teacherId };
      const mockOtherGroup = { id: 2, userId: 99 };

      it('should return true if the group is created by the teacher', async () => {
          Group.findOne.mockResolvedValue(mockGroup);

          const result = await wordleService.isGroupCreatedByTeacher(groupId, teacherId);

          expect(Group.findOne).toHaveBeenCalledWith({
              where: { id: groupId, userId: teacherId },
              attributes: ['id']
          });
          expect(result).toBe(true);
      });

      it('should return false if the group is not found', async () => {
          Group.findOne.mockResolvedValue(null);

          const result = await wordleService.isGroupCreatedByTeacher(groupId, teacherId);

          expect(Group.findOne).toHaveBeenCalledWith({
              where: { id: groupId, userId: teacherId },
              attributes: ['id']
          });
          expect(result).toBe(false);
      });

      it('should return false if the group is found but created by another teacher', async () => {
          Group.findOne.mockResolvedValue(mockOtherGroup);

          const result = await wordleService.isGroupCreatedByTeacher(mockOtherGroup.id, teacherId);

           expect(Group.findOne).toHaveBeenCalledWith({
              where: { id: mockOtherGroup.id, userId: teacherId }, // Note: The query includes the teacherId filter
              attributes: ['id']
          });
          expect(result).toBe(false); // The query would return null in a real DB, mock simulates finding it
      });

      it('should throw an error if a database query fails', async () => {
          const dbError = new Error('DB error');
          Group.findOne.mockRejectedValue(dbError);

          await expect(wordleService.isGroupCreatedByTeacher(groupId, teacherId)).rejects.toThrow('DB error');
          expect(Group.findOne).toHaveBeenCalledWith({
              where: { id: groupId, userId: teacherId },
              attributes: ['id']
          });
      });
  });


  // --- Test Suite for getAccessibleWordlesForStudent ---

  describe('getAccessibleWordlesForStudent', () => {
      const studentId = 1;
      const mockStudentUser = {
          id: studentId,
          role: 'student',
          studentGroups: [], // Mock the association attribute
          toJSON: jest.fn(),
      };

      const mockWordle1 = { id: 10, name: 'Wordle 1', words: { word: 'TEST', hint: 'Hint' }, toJSON: jest.fn(() => ({ id: 10, name: 'Wordle 1', words: { word: 'TEST', hint: 'Hint' } })) };
      const mockWordle2 = { id: 11, name: 'Wordle 2', words: { word: 'MOCK', hint: 'Clue' }, toJSON: jest.fn(() => ({ id: 11, name: 'Wordle 2', words: { word: 'MOCK', hint: 'Clue' } })) };

      const mockGroup1 = {
          id: 1, name: 'Group A', initDate: new Date('2025-01-01'), endDate: null,
          accessibleWordles: [mockWordle1], // Mock the association attribute
          toJSON: jest.fn(),
      };
      const mockGroup2 = {
          id: 2, name: 'Group B', initDate: new Date('2025-03-01'), endDate: new Date('2025-12-31'),
          accessibleWordles: [mockWordle1, mockWordle2], // Mock the association attribute
          toJSON: jest.fn(),
      };
       const mockInactiveGroup = {
          id: 3, name: 'Inactive Group', initDate: new Date('2026-01-01'), endDate: null, // Future date
          accessibleWordles: [mockWordle2],
          toJSON: jest.fn(),
      };


      beforeEach(() => {
          User.findByPk.mockResolvedValue(mockStudentUser); // Default: Student found
      });

      it('should return accessible wordles from active groups', async () => {
          // Configure studentGroups with active groups
          mockStudentUser.studentGroups = [mockGroup1, mockGroup2];

          const result = await wordleService.getAccessibleWordlesForStudent(studentId);

          expect(User.findByPk).toHaveBeenCalledTimes(1);
          expect(User.findByPk).toHaveBeenCalledWith(studentId, {
              include: {
                  model: Group,
                  as: 'studentGroups',
                  through: { attributes: [] },
                  where: {
                      initDate: { [Op.lte]: mockDate },
                      [Op.or]: [
                          { endDate: null },
                          { endDate: { [Op.gte]: mockDate } }
                      ]
                  },
                  include: {
                      model: Wordle,
                      as: 'accessibleWordles',
                      through: { attributes: [] },
                      attributes: ['id', 'name'],
                      include: {
                          model: Word,
                          as: 'words',
                          attributes: ['word', 'hint']
                      }
                  }
              }
          });

          // Expect unique wordles from active groups
          expect(result).toHaveLength(2);
          expect(result.some(w => w.id === mockWordle1.id)).toBe(true);
          expect(result.some(w => w.id === mockWordle2.id)).toBe(true);
          // Check that toJSON was called on the wordle instances
          expect(mockWordle1.toJSON).toHaveBeenCalled();
          expect(mockWordle2.toJSON).toHaveBeenCalled();
      });

       it('should not return wordles from inactive groups', async () => {
          // Configure studentGroups with an inactive group
          mockStudentUser.studentGroups = [mockInactiveGroup]; // This group will be filtered out by the where clause

          const result = await wordleService.getAccessibleWordlesForStudent(studentId);

          expect(User.findByPk).toHaveBeenCalledTimes(1);
           // The where clause in the include should filter out the inactive group
           expect(User.findByPk).toHaveBeenCalledWith(studentId, {
              include: {
                  model: Group,
                  as: 'studentGroups',
                  through: { attributes: [] },
                  where: {
                      initDate: { [Op.lte]: mockDate },
                      [Op.or]: [
                          { endDate: null },
                          { endDate: { [Op.gte]: mockDate } }
                      ]
                  },
                   include: expect.any(Object) // Don't need to check nested include in detail here
              }
          });

          // Expect an empty array as no active groups were found
          expect(result).toHaveLength(0);
      });


      it('should return an empty array if the student is not found', async () => {
          User.findByPk.mockResolvedValue(null); // Student not found

          const result = await wordleService.getAccessibleWordlesForStudent(studentId);

          expect(User.findByPk).toHaveBeenCalledTimes(1);
          expect(result).toHaveLength(0);
      });

      it('should return an empty array if the student is not in any group', async () => {
          mockStudentUser.studentGroups = []; // Student is in no groups

          const result = await wordleService.getAccessibleWordlesForStudent(studentId);

          expect(User.findByPk).toHaveBeenCalledTimes(1);
           // The query should still run, but the result will have an empty studentGroups array
           expect(User.findByPk).toHaveBeenCalledWith(studentId, expect.any(Object));

          expect(result).toHaveLength(0);
      });

      it('should throw an error if a database query fails', async () => {
          const dbError = new Error('DB error');
          User.findByPk.mockRejectedValue(dbError);

          await expect(wordleService.getAccessibleWordlesForStudent(studentId)).rejects.toThrow('DB error');
          expect(User.findByPk).toHaveBeenCalledTimes(1);
      });
  });

  // --- Test Suite for getWordleDataForGame ---

  describe('getWordleDataForGame', () => {
      const wordleId = 1;
      const mockWordle = {
          id: wordleId,
          name: 'Game Wordle',
          difficulty: 'low',
          toJSON: jest.fn(() => ({ // Mock toJSON
              id: wordleId,
              name: 'Game Wordle',
              words: { word: 'TEST', hint: 'Hint' },
              questions: [{ id: 1, question: 'Q1', type: 'single' }],
              difficulty: 'low',
          })),
      };

      beforeEach(() => {
          Wordle.findByPk.mockResolvedValue(mockWordle); // Default: Wordle found
      });

      it('should return wordle data with word and questions for a game', async () => {
          const result = await wordleService.getWordleDataForGame(wordleId);

          expect(Wordle.findByPk).toHaveBeenCalledTimes(1);
          expect(Wordle.findByPk).toHaveBeenCalledWith(wordleId, {
              attributes: ['id', 'name', 'difficulty'],
              include: [
                  { model: Word, as: 'words', attributes: ['word', 'hint'] },
                  { model: Question, as: 'questions', attributes: ['id', 'question', 'options', 'correctAnswer', 'type'] }
              ]
          });
          expect(mockWordle.toJSON).toHaveBeenCalledTimes(1);
          expect(result).toEqual(mockWordle.toJSON());
      });

      it('should return null if the wordle is not found', async () => {
          Wordle.findByPk.mockResolvedValue(null);

          const result = await wordleService.getWordleDataForGame(wordleId);

          expect(Wordle.findByPk).toHaveBeenCalledTimes(1);
          expect(result).toBeNull();
      });

      it('should throw an error if a database query fails', async () => {
          const dbError = new Error('DB error');
          Wordle.findByPk.mockRejectedValue(dbError);

          await expect(wordleService.getWordleDataForGame(wordleId)).rejects.toThrow('DB error');
          expect(Wordle.findByPk).toHaveBeenCalledTimes(1);
      });
  });


  // --- Test Suite for checkStudentAccess ---

  describe('checkStudentAccess', () => {
      const userId = 1;
      const wordleId = 10;

      // Mock objects simulating the structure returned by WordleGroup.findOne with includes
      const mockAccessEntry = {
          wordleId: wordleId,
          groupId: 1,
          group: { // Included Group
              id: 1,
              studentGroup: { // Included StudentGroup (means student is in this group)
                  userId: userId,
                  groupId: 1,
              }
          }
      };

      const mockAccessEntryNoStudent = {
           wordleId: wordleId,
           groupId: 2,
           group: { // Included Group
               id: 2,
               studentGroup: null, // Student is NOT in this group
           }
       };

      const mockAccessEntryNoGroup = {
          wordleId: wordleId,
          groupId: null, // No group linked directly (less likely with current model, but defensive)
          group: null, // No Group included
      };


      beforeEach(() => {
          // Default: Assume access entry is found and student is in the group
          WordleGroup.findOne.mockResolvedValue(mockAccessEntry);
      });

      it('should return true if the student has access to the wordle via a group', async () => {
          const result = await wordleService.checkStudentAccess(userId, wordleId);

          expect(WordleGroup.findOne).toHaveBeenCalledTimes(1);
          expect(WordleGroup.findOne).toHaveBeenCalledWith({
              where: { wordleId: wordleId },
              include: {
                  model: Group,
                  as: 'group',
                  include: {
                      model: StudentGroup,
                      as: 'studentGroup',
                      where: { userId: userId }
                  }
              }
          });
          expect(result).toBe(true);
      });

      it('should return false if an access entry is found but the student is not in that group', async () => {
          WordleGroup.findOne.mockResolvedValue(mockAccessEntryNoStudent); // Found entry, but student not in group

          const result = await wordleService.checkStudentAccess(userId, wordleId);

          expect(WordleGroup.findOne).toHaveBeenCalledTimes(1);
          expect(result).toBe(false);
      });

      it('should return false if no access entry is found for the wordle', async () => {
          WordleGroup.findOne.mockResolvedValue(null); // No access entry found at all

          const result = await wordleService.checkStudentAccess(userId, wordleId);

          expect(WordleGroup.findOne).toHaveBeenCalledTimes(1);
          expect(result).toBe(false);
      });

       it('should return false if the access entry is found but the group is not included (unexpected)', async () => {
           WordleGroup.findOne.mockResolvedValue(mockAccessEntryNoGroup); // Found entry, but no group included

           const result = await wordleService.checkStudentAccess(userId, wordleId);

           expect(WordleGroup.findOne).toHaveBeenCalledTimes(1);
           expect(result).toBe(false);
       });


      it('should throw an error if a database query fails', async () => {
          const dbError = new Error('DB error');
          WordleGroup.findOne.mockRejectedValue(dbError);

          await expect(wordleService.checkStudentAccess(userId, wordleId)).rejects.toThrow('DB error');
          expect(WordleGroup.findOne).toHaveBeenCalledTimes(1);
      });
  });


  // --- Test Suite for createWordle ---

  describe('createWordle', () => {
    const teacherId = 4;
    const wordleData = {
      name: 'New Wordle',
      words: { title: 'TEST', hint: 'A four-letter word' },
      questions: [
        { type: 'single', statement: 'Q1', answer: 'A', options: ['A', 'B'] },
        { type: 'multychoice', statement: 'Q2', answer: ['C', 'D'], options: ['C', 'D', 'E'] },
      ],
      groupAccessIds: [1, 2],
      difficulty: 'high'
    };

    const mockTeacher = { id: teacherId, role: 'teacher' };
    const mockNewWordle = {
        id: 100,
        name: wordleData.name,
        userId: teacherId,
        difficulty: wordleData.difficulty,  
        toJSON: jest.fn(() => ({ // Mock toJSON
            id: 100,
            name: wordleData.name,
            userId: teacherId,
            difficulty: wordleData.difficulty,
        })),
    };
    const mockGroup1 = { id: wordleData.groupAccessIds[0], userId: teacherId };
    const mockGroup2 = { id: wordleData.groupAccessIds[1], userId: teacherId };
    const mockOtherTeacherGroup = { id: 3, userId: 99 };


    beforeEach(() => {
        // Default mocks for a successful scenario
        userService.getUserById.mockResolvedValue(mockTeacher);
        Wordle.create.mockResolvedValue(mockNewWordle);
        Word.create.mockResolvedValue({}); // Mock word creation success
        Question.bulkCreate.mockResolvedValue([]); // Mock questions bulk create success
        Group.findAll.mockResolvedValue([mockGroup1, mockGroup2]); // Default: Teacher owns all requested groups
        WordleGroup.bulkCreate.mockResolvedValue([]); // Mock wordle group bulk create success

        // Mock the final fetch after commit
        Wordle.findByPk.mockResolvedValue({ // Simulate fetched wordle with relations
            ...mockNewWordle,
             toJSON: jest.fn(() => ({ // Mock toJSON for the final returned object
                 ...mockNewWordle.toJSON(),
                 creator: { id: teacherId, name: 'Teacher' },
                 words: { word: 'TEST', hint: 'Hint' },
                 questions: wordleData.questions.map(q => ({ ...q, options: JSON.stringify(q.options), correctAnswer: JSON.stringify(q.answer) })),
                 groupsWithAccess: wordleData.groupAccessIds.map(id => ({ id, name: `Group ${id}` })),
                 difficulty: wordleData.difficulty
             })),
        });
    });


    it('should create a wordle with word, questions, and group access', async () => {
      const result = await wordleService.createWordle(teacherId, wordleData);

      // Assertions:
      expect(sequelize.transaction).toHaveBeenCalledTimes(1);
      expect(userService.getUserById).toHaveBeenCalledTimes(1);
      expect(userService.getUserById).toHaveBeenCalledWith(teacherId);

      expect(Wordle.create).toHaveBeenCalledTimes(1);
      expect(Wordle.create).toHaveBeenCalledWith({
          name: wordleData.name,
          userId: teacherId,
          difficulty: wordleData.difficulty, 
      }, { transaction: mockTransaction });

      expect(Word.create).toHaveBeenCalledTimes(1);

      //TODO: Esto está mal ya que words es un array con varias word s dentro
      
      expect(Word.create).toHaveBeenCalledWith({
          word: wordleData.words.word,
          hint: wordleData.words.hint,
          wordleId: mockNewWordle.id,
      }, { transaction: mockTransaction });

      expect(Question.bulkCreate).toHaveBeenCalledTimes(1);
      expect(Question.bulkCreate).toHaveBeenCalledWith(wordleData.questions.map(q => ({
          question: q.statement,
          options: JSON.stringify(q.options),
          correctAnswer: JSON.stringify(q.answer),
          type: q.type,
          wordleId: mockNewWordle.id,
      })), { transaction: mockTransaction });

      expect(Group.findAll).toHaveBeenCalledTimes(1);
      expect(Group.findAll).toHaveBeenCalledWith({
          where: {
              id: { [Op.in]: wordleData.groupAccessIds },
              userId: teacherId
          },
          attributes: ['id'],
          transaction: mockTransaction
      });

      expect(WordleGroup.bulkCreate).toHaveBeenCalledTimes(1);
      expect(WordleGroup.bulkCreate).toHaveBeenCalledWith(wordleData.groupAccessIds.map(groupId => ({
          wordleId: mockNewWordle.id,
          groupId: groupId,
      })), { transaction: mockTransaction, ignore: true });


      expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
      expect(mockTransaction.rollback).not.toHaveBeenCalled();

      // Check final fetch and return value structure
      expect(Wordle.findByPk).toHaveBeenCalledTimes(1);
      expect(result).toHaveProperty('id', mockNewWordle.id);
      expect(result).toHaveProperty('name', wordleData.name);
      expect(result).toHaveProperty('words');
      expect(result).toHaveProperty('questions');
      expect(result).toHaveProperty('groupsWithAccess');
      expect(result).toHaveProperty('difficulty'); 
    });

     it('should create a wordle without group access if groupAccessIds is empty or null', async () => {
        const wordleDataNoGroups = {
            name: 'Wordle No Groups',
            words: { word: 'NOGROUP', hint: 'No access' },
            questions: [{ type: 'single', statement: 'Q?', answer: 'Yes', options: ['Yes', 'No'] }],
            groupAccessIds: [], 
            difficulty: 'low'
        };

        let result = await wordleService.createWordle(teacherId, wordleDataNoGroups);

        expect(sequelize.transaction).toHaveBeenCalledTimes(1);
        expect(userService.getUserById).toHaveBeenCalledTimes(1);
        expect(Wordle.create).toHaveBeenCalledTimes(1);
        expect(Word.create).toHaveBeenCalledTimes(1);
        expect(Question.bulkCreate).toHaveBeenCalledTimes(1);
        expect(Group.findAll).toHaveBeenCalledTimes(1); // Still called to check empty array
        expect(Group.findAll).toHaveBeenCalledWith({
             where: {
                id: { [Op.in]: [] }, // Check with empty array
                userId: teacherId,
            },
            attributes: ['id'],
            transaction: mockTransaction
        });
        expect(WordleGroup.bulkCreate).not.toHaveBeenCalled(); // No group links to create

        expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
        expect(mockTransaction.rollback).not.toHaveBeenCalled();
        expect(Wordle.findByPk).toHaveBeenCalledTimes(1);
        expect(result).toHaveProperty('id', mockNewWordle.id);
        expect(result).toHaveProperty('difficulty', wordleDataNoGroups.difficulty); 
        expect(result).toHaveProperty('groupsWithAccess', []); // Should have empty groups array

        jest.clearAllMocks(); // Clear mocks for the next test in this scenario
        sequelize.transaction.mockResolvedValue(mockTransaction); // Re-mock transaction
        userService.getUserById.mockResolvedValue(mockTeacher);
        Wordle.create.mockResolvedValue(mockNewWordle);
        Word.create.mockResolvedValue({});
        Question.bulkCreate.mockResolvedValue([]);
         Wordle.findByPk.mockResolvedValue({ // Simulate fetched wordle with relations
            ...mockNewWordle,
             toJSON: jest.fn(() => ({ // Mock toJSON for the final returned object
                 ...mockNewWordle.toJSON(),
                 creator: { id: teacherId, name: 'Teacher' },
                 words: { word: 'NOGROUP', hint: 'No access' },
                 questions: wordleDataNoGroups.questions.map(q => ({ ...q, options: JSON.stringify(q.options), correctAnswer: JSON.stringify(q.answer) })),
                 groupsWithAccess: [],
                 difficulty: wordleDataNoGroups.difficulty
             })),
        });

        // Test with null
        const wordleDataNullGroups = {
             name: 'Wordle Null Groups',
            words: { title: 'NULLGROUP', hint: 'No access' },
            questions: [{ type: 'single', statement: 'Q?', answer: 'Yes', options: ['Yes', 'No'] }],
            groupAccessIds: null,
            difficulty: 'high'
        };
        result = await wordleService.createWordle(teacherId, wordleDataNullGroups);

        expect(sequelize.transaction).toHaveBeenCalledTimes(1);
        expect(userService.getUserById).toHaveBeenCalledTimes(1);
        expect(Wordle.create).toHaveBeenCalledTimes(1);
        expect(Word.create).toHaveBeenCalledTimes(1);
        expect(Question.bulkCreate).toHaveBeenCalledTimes(1);
        expect(Group.findAll).not.toHaveBeenCalled(); // Should not be called if groupAccessIds is null
        expect(WordleGroup.bulkCreate).not.toHaveBeenCalled();

        expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
        expect(mockTransaction.rollback).not.toHaveBeenCalled();
        expect(Wordle.findByPk).toHaveBeenCalledTimes(1);
        expect(result).toHaveProperty('id', mockNewWordle.id);
        expect(result).toHaveProperty('groupsWithAccess', []);
        expect(result).toHaveProperty('difficulty', wordleDataNullGroups.difficulty); 

     });


    it('should throw an error and rollback transaction if teacher is not found', async () => {
        userService.getUserById.mockResolvedValue(null);

        await expect(wordleService.createWordle(teacherId, wordleData)).rejects.toThrow('User not found or not authorized to create wordles');

        expect(sequelize.transaction).toHaveBeenCalledTimes(1);
        expect(userService.getUserById).toHaveBeenCalledTimes(1);
        expect(Wordle.create).not.toHaveBeenCalled();
        expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
        expect(mockTransaction.commit).not.toHaveBeenCalled();
    });

     it('should throw an error and rollback transaction if teacher is not a teacher role', async () => {
        const mockNonTeacher = { id: teacherId, role: 'student' };
        userService.getUserById.mockResolvedValue(mockNonTeacher);

        await expect(wordleService.createWordle(teacherId, wordleData)).rejects.toThrow('User not found or not authorized to create wordles');

        expect(sequelize.transaction).toHaveBeenCalledTimes(1);
        expect(userService.getUserById).toHaveBeenCalledTimes(1);
        expect(Wordle.create).not.toHaveBeenCalled();
        expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
        expect(mockTransaction.commit).not.toHaveBeenCalled();
    });

    it('should throw an error and rollback transaction if Wordle.create fails', async () => {
        const createError = new Error('DB create wordle error');
        Wordle.create.mockRejectedValue(createError);

        await expect(wordleService.createWordle(teacherId, wordleData)).rejects.toThrow('DB create wordle error');

        expect(sequelize.transaction).toHaveBeenCalledTimes(1);
        expect(userService.getUserById).toHaveBeenCalledTimes(1);
        expect(Wordle.create).toHaveBeenCalledTimes(1);
        expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
        expect(mockTransaction.commit).not.toHaveBeenCalled();
    });

     it('should throw an error and rollback transaction if word details are missing', async () => {
        const wordleDataMissingWord = {
            name: 'Wordle No Word',
            questions: [{ type: 'single', statement: 'Q?', answer: 'Yes', options: ['Yes', 'No'] }],
            groupAccessIds: [1],
            difficulty: 'low'
        };

        await expect(wordleService.createWordle(teacherId, wordleDataMissingWord)).rejects.toThrow('Word details (title) are required');

        expect(sequelize.transaction).toHaveBeenCalledTimes(1);
        expect(userService.getUserById).toHaveBeenCalledTimes(1);
        expect(Wordle.create).toHaveBeenCalledTimes(1); // Wordle is created before word check
        expect(Word.create).not.toHaveBeenCalled();
        expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
        expect(mockTransaction.commit).not.toHaveBeenCalled();
     });

     it('should throw an error and rollback transaction if Word.create fails', async () => {
         const wordCreateError = new Error('DB create word error');
         Word.create.mockRejectedValue(wordCreateError);

         await expect(wordleService.createWordle(teacherId, wordleData)).rejects.toThrow('DB create word error');

         expect(sequelize.transaction).toHaveBeenCalledTimes(1);
         expect(userService.getUserById).toHaveBeenCalledTimes(1);
         expect(Wordle.create).toHaveBeenCalledTimes(1);
         expect(Word.create).toHaveBeenCalledTimes(1);
         expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
         expect(mockTransaction.commit).not.toHaveBeenCalled();
     });

     it('should throw an error and rollback transaction if questions are missing', async () => {
        const wordleDataMissingQuestions = {
            name: 'Wordle No Questions',
            words: { word: 'NOWORLD', hint: 'No Qs' },
            groupAccessIds: [1],
            difficulty: 'low'
        };

        await expect(wordleService.createWordle(teacherId, wordleDataMissingQuestions)).rejects.toThrow('At least one question is required for the wordle');

        expect(sequelize.transaction).toHaveBeenCalledTimes(1);
        expect(userService.getUserById).toHaveBeenCalledTimes(1);
        expect(Wordle.create).toHaveBeenCalledTimes(1);
        expect(Word.create).toHaveBeenCalledTimes(1); // Word is created before questions check
        expect(Question.bulkCreate).not.toHaveBeenCalled();
        expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
        expect(mockTransaction.commit).not.toHaveBeenCalled();
     });

     it('should throw an error and rollback transaction if Question.bulkCreate fails', async () => {
         const questionsBulkCreateError = new Error('DB bulk create questions error');
         Question.bulkCreate.mockRejectedValue(questionsBulkCreateError);

         await expect(wordleService.createWordle(teacherId, wordleData)).rejects.toThrow('DB bulk create questions error');

         expect(sequelize.transaction).toHaveBeenCalledTimes(1);
         expect(userService.getUserById).toHaveBeenCalledTimes(1);
         expect(Wordle.create).toHaveBeenCalledTimes(1);
         expect(Word.create).toHaveBeenCalledTimes(1);
         expect(Question.bulkCreate).toHaveBeenCalledTimes(1);
         expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
         expect(mockTransaction.commit).not.toHaveBeenCalled();
     });

     it('should throw an error and rollback transaction if teacher does not own a requested group', async () => {
        Group.findAll.mockResolvedValue([mockGroup1, mockOtherTeacherGroup]); // Teacher owns group 1, but not group 3

        await expect(wordleService.createWordle(teacherId, wordleData)).rejects.toThrow(`Cannot grant access to groups not owned by the teacher: ${mockOtherTeacherGroup.id}`);

        expect(sequelize.transaction).toHaveBeenCalledTimes(1);
        expect(userService.getUserById).toHaveBeenCalledTimes(1);
        expect(Wordle.create).toHaveBeenCalledTimes(1);
        expect(Word.create).toHaveBeenCalledTimes(1);
        expect(Question.bulkCreate).toHaveBeenCalledTimes(1);
        expect(Group.findAll).toHaveBeenCalledTimes(1);
        expect(WordleGroup.bulkCreate).not.toHaveBeenCalled(); // Bulk create should not happen
        expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
        expect(mockTransaction.commit).not.toHaveBeenCalled();
     });

     it('should throw an error and rollback transaction if WordleGroup.bulkCreate fails', async () => {
         const wordleGroupBulkCreateError = new Error('DB bulk create wordle group error');
         WordleGroup.bulkCreate.mockRejectedValue(wordleGroupBulkCreateError);

         await expect(wordleService.createWordle(teacherId, wordleData)).rejects.toThrow('DB bulk create wordle group error');

         expect(sequelize.transaction).toHaveBeenCalledTimes(1);
         expect(userService.getUserById).toHaveBeenCalledTimes(1);
         expect(Wordle.create).toHaveBeenCalledTimes(1);
         expect(Word.create).toHaveBeenCalledTimes(1);
         expect(Question.bulkCreate).toHaveBeenCalledTimes(1);
         expect(Group.findAll).toHaveBeenCalledTimes(1);
         expect(WordleGroup.bulkCreate).toHaveBeenCalledTimes(1);
         expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
         expect(mockTransaction.commit).not.toHaveBeenCalled();
     });


     //NEW: difficulty
     it('should create a wordle with default difficulty if not specified', async () => {
        const wordleDataDefaultDifficulty = {
            name: 'Wordle Default Diff',
            words: { title: 'DEFAULT', hint: 'Default difficulty' },
            questions: [{ type: 'single', statement: 'Q?', answer: 'Yes', options: ['Yes', 'No'] }],
            groupAccessIds: [1],
            // No se especifica 'difficulty' aquí
        };

        // Asegúrate de que mockNewWordle refleje la dificultad por defecto para este test
        const mockNewWordleDefault = {
            id: 101,
            name: wordleDataDefaultDifficulty.name,
            userId: teacherId,
            difficulty: 'medium', // Valor por defecto esperado
            toJSON: jest.fn(() => ({
                id: 101,
                name: wordleDataDefaultDifficulty.name,
                userId: teacherId,
                difficulty: 'medium',
            })),
        };

        // Sobrescribe los mocks para este test específico
        jest.clearAllMocks();
        sequelize.transaction.mockResolvedValue(mockTransaction);
        userService.getUserById.mockResolvedValue(mockTeacher);
        Wordle.create.mockResolvedValue(mockNewWordleDefault); // Usa el nuevo mock aquí
        Word.create.mockResolvedValue({});
        Question.bulkCreate.mockResolvedValue([]);
        Group.findAll.mockResolvedValue([mockGroup1]);
        WordleGroup.bulkCreate.mockResolvedValue([]);
        Wordle.findByPk.mockResolvedValue({
            ...mockNewWordleDefault,
            toJSON: jest.fn(() => ({
                ...mockNewWordleDefault.toJSON(),
                creator: { id: teacherId, name: 'Teacher' },
                words: { word: 'DEFAULT', hint: 'Default difficulty' },
                questions: wordleDataDefaultDifficulty.questions.map(q => ({ ...q, options: JSON.stringify(q.options), correctAnswer: JSON.stringify(q.answer) })),
                groupsWithAccess: wordleDataDefaultDifficulty.groupAccessIds.map(id => ({ id, name: `Group ${id}` })),
            })),
        });


        const result = await wordleService.createWordle(teacherId, wordleDataDefaultDifficulty);

        expect(Wordle.create).toHaveBeenCalledTimes(1);
        expect(Wordle.create).toHaveBeenCalledWith({
            name: wordleDataDefaultDifficulty.name,
            userId: teacherId,
            difficulty: 'medium', // Esperamos el valor por defecto
        }, { transaction: mockTransaction });

        expect(result).toHaveProperty('difficulty', 'medium'); // Afirmar el valor por defecto
        expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
        expect(mockTransaction.rollback).not.toHaveBeenCalled();
    });

  });


  // --- Test Suite for getWordlesByTeacher ---

  describe('getWordlesByTeacher', () => {
      const teacherId = 4;
      const mockTeacher = { id: teacherId, role: 'teacher' };

      const mockWordle1 = { id: 10, name: 'Wordle 1', userId: teacherId, words: { word: 'TEST' }, toJSON: jest.fn(() => ({ id: 10, name: 'Wordle 1', words: { word: 'TEST' } })) };
      const mockWordle2 = { id: 11, name: 'Wordle 2', userId: teacherId, words: { word: 'MOCK' }, toJSON: jest.fn(() => ({ id: 11, name: 'Wordle 2', words: { word: 'MOCK' } })) };
      const mockOtherWordle = { id: 12, name: 'Other Wordle', userId: 99, words: { word: 'OTHER' }, toJSON: jest.fn(() => ({ id: 12, name: 'Other Wordle', words: { word: 'OTHER' } })) };


      beforeEach(() => {
          userService.getUserById.mockResolvedValue(mockTeacher);
          // Default: return all wordles, including one not by this teacher (findAll with where clause will filter)
          Wordle.findAll.mockResolvedValue([mockWordle1, mockWordle2, mockOtherWordle]);
      });

      it('should return all wordles created by the teacher', async () => {
          const result = await wordleService.getWordlesByTeacher(teacherId);

          expect(userService.getUserById).toHaveBeenCalledTimes(1);
          expect(userService.getUserById).toHaveBeenCalledWith(teacherId);

          expect(Wordle.findAll).toHaveBeenCalledTimes(1);
          expect(Wordle.findAll).toHaveBeenCalledWith({
              where: { userId: teacherId }, // Check the where clause filters by teacherId
              attributes: ['id', 'name'],
              include: {
                  model: Word,
                  as: 'words',
                  attributes: ['word', 'hint']
              }
          });

          // Expect only wordles created by this teacher
          expect(result).toHaveLength(2);
          expect(result.some(w => w.id === mockWordle1.id)).toBe(true);
          expect(result.some(w => w.id === mockWordle2.id)).toBe(true);
          expect(result.every(w => w.userId === undefined)).toBe(true); // userId should not be in the returned attributes
          expect(mockWordle1.toJSON).toHaveBeenCalledTimes(1);
          expect(mockWordle2.toJSON).toHaveBeenCalledTimes(1);
      });

      it('should return an empty array if the teacher has created no wordles', async () => {
          Wordle.findAll.mockResolvedValue([]); // No wordles found for this teacher

          const result = await wordleService.getWordlesByTeacher(teacherId);

          expect(userService.getUserById).toHaveBeenCalledTimes(1);
          expect(Wordle.findAll).toHaveBeenCalledTimes(1);
          expect(result).toHaveLength(0);
      });

      it('should throw an error if teacher is not found', async () => {
          userService.getUserById.mockResolvedValue(null);

          await expect(wordleService.getWordlesByTeacher(teacherId)).rejects.toThrow('User not found or not authorized to view wordles');
          expect(userService.getUserById).toHaveBeenCalledTimes(1);
          expect(Wordle.findAll).not.toHaveBeenCalled();
      });

      it('should throw an error if teacher is not a teacher role', async () => {
          const mockNonTeacher = { id: teacherId, role: 'student' };
          userService.getUserById.mockResolvedValue(mockNonTeacher);

          await expect(wordleService.getWordlesByTeacher(teacherId)).rejects.toThrow('User not found or not authorized to view wordles');
          expect(userService.getUserById).toHaveBeenCalledTimes(1);
          expect(Wordle.findAll).not.toHaveBeenCalled();
      });

      it('should throw an error if Wordle.findAll fails', async () => {
          const dbError = new Error('DB error');
          Wordle.findAll.mockRejectedValue(dbError);

          await expect(wordleService.getWordlesByTeacher(teacherId)).rejects.toThrow('DB error');
          expect(userService.getUserById).toHaveBeenCalledTimes(1);
          expect(Wordle.findAll).toHaveBeenCalledTimes(1);
      });
  });

  // --- Test Suite for getWordleDetails ---

  describe('getWordleDetails', () => {
      const wordleId = 10;
      const teacherId = 4;

      const mockWordle = {
          id: wordleId,
          name: 'Detailed Wordle',
          userId: teacherId,
          difficulty: 'high',
          toJSON: jest.fn(() => ({ // Mock toJSON
              id: wordleId,
              name: 'Detailed Wordle',
              userId: teacherId,
              creator: { id: teacherId, name: 'Teacher' },
              words: { id: 1, word: 'DETAIL', hint: 'Info' },
              questions: [{ id: 1, question: 'Q1', type: 'single' }],
              groupsWithAccess: [{ id: 1, name: 'Group A' }],
              difficulty: 'high', // Mock difficulty
          })),
      };
      const mockOtherWordle = { id: wordleId, name: 'Other Teacher Wordle', userId: 99 };


      beforeEach(() => {
          Wordle.findOne.mockResolvedValue(mockWordle); // Default: Wordle found and owned by teacher
      });

      it('should return wordle details with related word, questions, groups and difficulty', async () => {
          const result = await wordleService.getWordleDetails(wordleId, teacherId);

          expect(Wordle.findOne).toHaveBeenCalledTimes(1);
          expect(Wordle.findOne).toHaveBeenCalledWith({
              where: { id: wordleId, userId: teacherId }, // Check the where clause filters by ID and teacherId
              include: [
                  { model: Word, as: 'words', attributes: ['id', 'word', 'hint'] },
                  { model: Question, as: 'questions', attributes: ['id', 'question', 'options', 'correctAnswer', 'type'] },
                  { model: Group, as: 'groupsWithAccess', through: { attributes: [] }, attributes: ['id', 'name'] }
              ],
              attributes: expect.arrayContaining(['id', 'name', 'userId', 'difficulty'])
          });
          expect(mockWordle.toJSON).toHaveBeenCalledTimes(1);
          expect(result).toEqual(mockWordle.toJSON());
      });

      it('should return null if the wordle is not found', async () => {
          Wordle.findOne.mockResolvedValue(null); // Wordle not found

          const result = await wordleService.getWordleDetails(wordleId, teacherId);

          expect(Wordle.findOne).toHaveBeenCalledTimes(1);
          expect(result).toBeNull();
      });

       it('should return null if the wordle is found but not created by the teacher', async () => {
           // Simulate findOne returning null because the where clause filtered it out
           Wordle.findOne.mockResolvedValue(null);

           const result = await wordleService.getWordleDetails(wordleId, teacherId);

           expect(Wordle.findOne).toHaveBeenCalledTimes(1);
           expect(Wordle.findOne).toHaveBeenCalledWith({
              where: { id: wordleId, userId: teacherId }, // Check the where clause is correct
              include: expect.any(Array),
              attributes: expect.arrayContaining(['id', 'name', 'userId', 'difficulty'])
           });
           expect(result).toBeNull();
       });


      it('should throw an error if a database query fails', async () => {
          const dbError = new Error('DB error');
          Wordle.findOne.mockRejectedValue(dbError);

          await expect(wordleService.getWordleDetails(wordleId, teacherId)).rejects.toThrow('DB error');
          expect(Wordle.findOne).toHaveBeenCalledTimes(1);
      });
  });

  // --- Test Suite for updateWordle ---

  describe('updateWordle', () => {
      const wordleId = 10;
      const teacherId = 4;
      const updateData = {
          name: 'Updated Wordle Name',
          words: { title: 'UPDATED', hint: 'New Hint' },
          questions: [
              { id: 1, type: 'single', statement: 'Q1 Updated', answer: 'Yes', options: ['Yes', 'No'] }, // Update existing
              { type: 'multychoice', statement: 'New Q', answer: ['X', 'Y'], options: ['X', 'Y', 'Z'] }, // Create new
          ],
          groupAccessIds: [1, 3], // Update group access
          difficulty: 'low' 
      };

      const mockWordle = {
          id: wordleId,
          name: 'Original Name',
          userId: teacherId,
          difficulty: 'high',
          save: jest.fn(function () { // Mock save method
            // Simula la actualización de la propiedad 'difficulty'
            this.difficulty = updateData.difficulty !== undefined ? updateData.difficulty : this.difficulty;
            this.name = updateData.name !== undefined ? updateData.name : this.name;
            return Promise.resolve(this);
        }),
        toJSON: jest.fn(), // Mock toJSON
      };
      const mockOriginalWord = { id: 50, wordleId: wordleId, word: 'ORIGINAL', hint: 'Old Hint', save: jest.fn(() => Promise.resolve()) };
      const mockOriginalQuestion1 = { id: 1, wordleId: wordleId, type: 'single', statement: 'Original Q1', answer: JSON.stringify('A'), options: JSON.stringify(['A', 'B']), save: jest.fn(() => Promise.resolve()), destroy: jest.fn(() => Promise.resolve()) };
      const mockOriginalQuestion2 = { id: 2, wordleId: wordleId, type: 'multychoice', statement: 'Original Q2', answer: JSON.stringify(['C']), options: JSON.stringify(['C', 'D']), save: jest.fn(() => Promise.resolve()), destroy: jest.fn(() => Promise.resolve()) };

      const mockGroup1 = { id: updateData.groupAccessIds[0], userId: teacherId };
      const mockGroup3 = { id: updateData.groupAccessIds[1], userId: teacherId };
      const mockOtherTeacherGroup = { id: 99, userId: 99 };


      // Mock sequelize transaction methods
      const mockTransaction = {
          commit: jest.fn(() => Promise.resolve()),
          rollback: jest.fn(() => Promise.resolve()),
      };
      sequelize.transaction.mockResolvedValue(mockTransaction);


      beforeEach(() => {
          Wordle.findOne.mockResolvedValue(mockWordle); // Default: Wordle found and owned
          Word.findOne.mockResolvedValue(mockOriginalWord); // Default: Original word found
          Question.findAll.mockResolvedValue([mockOriginalQuestion1, mockOriginalQuestion2]); // Default: Original questions found
          Question.destroy.mockResolvedValue(1); // Default: Destroy succeeds
          Question.create.mockResolvedValue({}); // Default: Create question succeeds
          Group.findAll.mockResolvedValue([mockGroup1, mockGroup3]); // Default: Teacher owns requested groups
          WordleGroup.destroy.mockResolvedValue(1); // Default: Destroy old group links succeeds
          WordleGroup.bulkCreate.mockResolvedValue([]); // Default: Create new group links succeeds

          // Mock the final fetch after commit (reuse getWordleDetails mock)
          wordleService.getWordleDetails = jest.fn(() => Promise.resolve({
              id: wordleId,
              name: updateData.name,
              words: updateData.words,
              questions: updateData.questions,
              groupsWithAccess: updateData.groupAccessIds.map(id => ({ id, name: `Group ${id}` })),
              difficulty: updateData.difficulty, // Mock difficulty
            }));
      });

      it('should update wordle details, word, questions, and group access', async () => {
          const result = await wordleService.updateWordle(wordleId, teacherId, updateData);

          // Assertions:
          expect(sequelize.transaction).toHaveBeenCalledTimes(1);
          expect(Wordle.findOne).toHaveBeenCalledTimes(1);
          expect(Wordle.findOne).toHaveBeenCalledWith({
              where: { id: wordleId, userId: teacherId },
              transaction: mockTransaction
          });

          // Check wordle basic details update
          expect(mockWordle.name).toBe(updateData.name);
          expect(mockWordle.difficulty).toBe(updateData.difficulty); 
          expect(mockWordle.save).toHaveBeenCalledTimes(1);
          expect(mockWordle.save).toHaveBeenCalledWith({ transaction: mockTransaction });

          // Check word update
          expect(Word.findOne).toHaveBeenCalledTimes(1);
          expect(Word.findOne).toHaveBeenCalledWith({ where: { wordleId: wordleId }, transaction: mockTransaction });
          expect(mockOriginalWord.word).toBe(updateData.words.word.title);
          expect(mockOriginalWord.hint).toBe(updateData.words.word.hint);
          expect(mockOriginalWord.save).toHaveBeenCalledTimes(1);
          expect(mockOriginalWord.save).toHaveBeenCalledWith({ transaction: mockTransaction });

          // Check questions management
          expect(Question.findAll).toHaveBeenCalledTimes(1);
          expect(Question.findAll).toHaveBeenCalledWith({ where: { wordleId: wordleId }, transaction: mockTransaction });
          // Question 2 should be deleted (it exists originally but not in updateData)
          expect(mockOriginalQuestion2.destroy).toHaveBeenCalledTimes(1);
          expect(mockOriginalQuestion2.destroy).toHaveBeenCalledWith({ transaction: mockTransaction });
          // Question 1 should be updated
          expect(mockOriginalQuestion1.type).toBe(updateData.questions[0].type);
          expect(mockOriginalQuestion1.statement).toBe(updateData.questions[0].statement);
          expect(mockOriginalQuestion1.correctAnswer).toBe(JSON.stringify(updateData.questions[0].answer));
          expect(mockOriginalQuestion1.options).toBe(JSON.stringify(updateData.questions[0].options));
          expect(mockOriginalQuestion1.save).toHaveBeenCalledTimes(1);
          expect(mockOriginalQuestion1.save).toHaveBeenCalledWith({ transaction: mockTransaction });
          // A new question should be created
          expect(Question.create).toHaveBeenCalledTimes(1);
          expect(Question.create).toHaveBeenCalledWith({
              question: updateData.questions[1].statement,
              options: JSON.stringify(updateData.questions[1].options),
              correctAnswer: JSON.stringify(updateData.questions[1].answer),
              type: updateData.questions[1].type,
              wordleId: mockWordle.id,
          }, { transaction: mockTransaction });

          // Check group access management
          expect(Group.findAll).toHaveBeenCalledTimes(1);
          expect(Group.findAll).toHaveBeenCalledWith({
              where: {
                  id: { [Op.in]: updateData.groupAccessIds },
                  userId: teacherId
              },
              attributes: ['id'],
              transaction: mockTransaction
          });
          expect(WordleGroup.destroy).toHaveBeenCalledTimes(1);
          expect(WordleGroup.destroy).toHaveBeenCalledWith({ where: { wordleId: wordleId }, transaction: mockTransaction });
          expect(WordleGroup.bulkCreate).toHaveBeenCalledTimes(1);
          expect(WordleGroup.bulkCreate).toHaveBeenCalledWith(updateData.groupAccessIds.map(groupId => ({
              wordleId: mockWordle.id,
              groupId: groupId,
          })), { transaction: mockTransaction, ignore: true });


          expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
          expect(mockTransaction.rollback).not.toHaveBeenCalled();

          // Check the final fetch call and result
          expect(wordleService.getWordleDetails).toHaveBeenCalledTimes(1);
          expect(wordleService.getWordleDetails).toHaveBeenCalledWith(wordleId, teacherId);
          expect(result).toEqual({
              id: wordleId,
              name: updateData.name,
              words: updateData.words,
              questions: updateData.questions,
              groupsWithAccess: updateData.groupAccessIds.map(id => ({ id, name: `Group ${id}` })),
              difficulty: updateData.difficulty, // Mock difficulty
            });
      });

      it('should update only the name and difficulty if only those are provided', async () => {
          const partialUpdateData = { name: 'Only Name Change' , difficulty: 'high' }; // Only name and difficulty provided
          mockWordle.name = 'Original Name';
          mockWordle.difficulty = 'low';
          // Mock findOne to return the wordle, but don't mock word/question/group methods
          // as they shouldn't be called.

          const result = await wordleService.updateWordle(wordleId, teacherId, partialUpdateData);

          // Assertions:
          expect(sequelize.transaction).toHaveBeenCalledTimes(1);
          expect(Wordle.findOne).toHaveBeenCalledTimes(1);

          // Check wordle basic details update
          expect(mockWordle.name).toBe(partialUpdateData.name);
          expect(mockWordle.difficulty).toBe(partialUpdateData.difficulty);
          expect(mockWordle.save).toHaveBeenCalledTimes(1);
          expect(mockWordle.save).toHaveBeenCalledWith({ transaction: mockTransaction });

          // Check that other methods were NOT called
          expect(Word.findOne).not.toHaveBeenCalled();
          expect(mockOriginalWord.save).not.toHaveBeenCalled();
          expect(Question.findAll).not.toHaveBeenCalled();
          expect(mockOriginalQuestion1.save).not.toHaveBeenCalled();
          expect(mockOriginalQuestion2.destroy).not.toHaveBeenCalled();
          expect(Question.create).not.toHaveBeenCalled();
          expect(Group.findAll).not.toHaveBeenCalled();
          expect(WordleGroup.destroy).not.toHaveBeenCalled();
          expect(WordleGroup.bulkCreate).not.toHaveBeenCalled();

          expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
          expect(mockTransaction.rollback).not.toHaveBeenCalled();

          wordleService.getWordleDetails.mockResolvedValue({
            id: wordleId,
            name: partialUpdateData.name,
            words: [{ id: 50, word: 'ORIGINAL', hint: 'Old Hint' }], // Valores originales si no se actualizan
            questions: [{ id: 1, question: 'Original Q1' }, { id: 2, question: 'Original Q2' }],
            groupsWithAccess: [],
            difficulty: partialUpdateData.difficulty, 

        });

          expect(wordleService.getWordleDetails).toHaveBeenCalledTimes(1);
          expect(result).toHaveProperty('name', partialUpdateData.name);
          expect(result).toHaveProperty('difficulty', partialUpdateData.difficulty);
      });

      it('should return null if the wordle is not found', async () => {
          Wordle.findOne.mockResolvedValue(null);

          const result = await wordleService.updateWordle(wordleId, teacherId, updateData);

          expect(sequelize.transaction).toHaveBeenCalledTimes(1);
          expect(Wordle.findOne).toHaveBeenCalledTimes(1);
          expect(mockWordle.save).not.toHaveBeenCalled();
          expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
          expect(mockTransaction.commit).not.toHaveBeenCalled();
          expect(wordleService.getWordleDetails).not.toHaveBeenCalled(); // Final fetch should not happen
          expect(result).toBeNull();
      });

       it('should return null if the wordle is found but not created by the teacher', async () => {
           // Simulate findOne returning null because the where clause filtered it out
           Wordle.findOne.mockResolvedValue(null);

           const result = await wordleService.updateWordle(wordleId, teacherId, updateData);

           expect(sequelize.transaction).toHaveBeenCalledTimes(1);
           expect(Wordle.findOne).toHaveBeenCalledTimes(1);
           expect(mockWordle.save).not.toHaveBeenCalled();
           expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
           expect(mockTransaction.commit).not.toHaveBeenCalled();
           expect(wordleService.getWordleDetails).not.toHaveBeenCalled();
           expect(result).toBeNull();
       });


      it('should throw an error and rollback transaction if Wordle.findOne fails', async () => {
          const findError = new Error('DB find error');
          Wordle.findOne.mockRejectedValue(findError);

          await expect(wordleService.updateWordle(wordleId, teacherId, updateData)).rejects.toThrow('DB find error');

          expect(sequelize.transaction).toHaveBeenCalledTimes(1);
          expect(Wordle.findOne).toHaveBeenCalledTimes(1);
          expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
          expect(mockTransaction.commit).not.toHaveBeenCalled();
          expect(wordleService.getWordleDetails).not.toHaveBeenCalled();
      });

       it('should throw an error and rollback transaction if wordle.save fails', async () => {
          const saveError = new Error('DB save error');
          mockWordle.save.mockRejectedValue(saveError);

          await expect(wordleService.updateWordle(wordleId, teacherId, updateData)).rejects.toThrow('DB save error');

          expect(sequelize.transaction).toHaveBeenCalledTimes(1);
          expect(Wordle.findOne).toHaveBeenCalledTimes(1);
          expect(mockWordle.save).toHaveBeenCalledTimes(1);
          expect(mockWordle.name).toBe(updateData.name); // Still check that name was set before save failed
          expect(mockWordle.difficulty).toBe(updateData.difficulty);
          expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
          expect(mockTransaction.commit).not.toHaveBeenCalled();
          expect(wordleService.getWordleDetails).not.toHaveBeenCalled();
       });

       it('should throw an error and rollback transaction if updating word fails', async () => {
           const wordSaveError = new Error('Word save failed');
           mockOriginalWord.save.mockRejectedValue(wordSaveError); // Simulate word save failure

           const updateDataWithError = { words: { word: 'FAIL' }, difficulty: 'high' }; 

           await expect(wordleService.updateWordle(wordleId, teacherId, updateDataWithError)).rejects.toThrow('Word save failed');

           expect(sequelize.transaction).toHaveBeenCalledTimes(1);
           expect(Wordle.findOne).toHaveBeenCalledTimes(1);
           expect(mockWordle.save).toHaveBeenCalledTimes(1);
           expect(mockWordle.difficulty).toBe(updateDataWithError.difficulty);
           expect(Word.findOne).toHaveBeenCalledTimes(1);
           expect(mockOriginalWord.save).toHaveBeenCalledTimes(1);
           expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
           expect(mockTransaction.commit).not.toHaveBeenCalled();
           expect(wordleService.getWordleDetails).not.toHaveBeenCalled();
       });

       it('should throw an error and rollback transaction if deleting questions fails', async () => {
           const deleteError = new Error('Question delete failed');
           mockOriginalQuestion2.destroy.mockRejectedValue(deleteError); // Simulate delete failure

           const updateDataWithError = { questions: [updateData.questions[0]]}; // Update to remove Q2

           await expect(wordleService.updateWordle(wordleId, teacherId, updateDataWithError)).rejects.toThrow('Question delete failed');

           expect(sequelize.transaction).toHaveBeenCalledTimes(1);
           expect(Wordle.findOne).toHaveBeenCalledTimes(1);
           expect(mockWordle.save).toHaveBeenCalledTimes(1);
           expect(Question.findAll).toHaveBeenCalledTimes(1);
           expect(mockOriginalQuestion2.destroy).toHaveBeenCalledTimes(1);
           expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
           expect(mockTransaction.commit).not.toHaveBeenCalled();
           expect(wordleService.getWordleDetails).not.toHaveBeenCalled();
       });

       it('should throw an error and rollback transaction if updating a question fails', async () => {
           const questionSaveError = new Error('Question save failed');
           mockOriginalQuestion1.save.mockRejectedValue(questionSaveError); // Simulate save failure

           const updateDataWithError = { questions: [updateData.questions[0], mockOriginalQuestion2] }; // Update Q1, keep Q2

           await expect(wordleService.updateWordle(wordleId, teacherId, updateDataWithError)).rejects.toThrow('Question save failed');

           expect(sequelize.transaction).toHaveBeenCalledTimes(1);
           expect(Wordle.findOne).toHaveBeenCalledTimes(1);
           expect(mockWordle.save).toHaveBeenCalledTimes(1);
           expect(Question.findAll).toHaveBeenCalledTimes(1);
           expect(mockOriginalQuestion1.save).toHaveBeenCalledTimes(1);
           expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
           expect(mockTransaction.commit).not.toHaveBeenCalled();
           expect(wordleService.getWordleDetails).not.toHaveBeenCalled();
       });

       it('should throw an error and rollback transaction if creating a new question fails', async () => {
            const createQuestionError = new Error('Create question failed');
            Question.create.mockRejectedValue(createQuestionError); // Simulate create failure

            const updateDataWithError = { questions: [mockOriginalQuestion1, updateData.questions[1]] }; // Keep Q1, add new Q

            await expect(wordleService.updateWordle(wordleId, teacherId, updateDataWithError)).rejects.toThrow('Create question failed');

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(Wordle.findOne).toHaveBeenCalledTimes(1);
            expect(mockWordle.save).toHaveBeenCalledTimes(1);
            expect(Question.findAll).toHaveBeenCalledTimes(1);
            expect(Question.create).toHaveBeenCalledTimes(1);
            expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
            expect(mockTransaction.commit).not.toHaveBeenCalled();
            expect(wordleService.getWordleDetails).not.toHaveBeenCalled();
       });

       it('should throw an error and rollback transaction if teacher does not own a requested group for access', async () => {
           Group.findAll.mockResolvedValue([mockGroup1, mockOtherTeacherGroup]); // Teacher owns group 1, but not group 99

           const updateDataWithError = { groupAccessIds: [mockGroup1.id, mockOtherTeacherGroup.id] };

           await expect(wordleService.updateWordle(wordleId, teacherId, updateDataWithError)).rejects.toThrow(`Cannot grant access to groups not owned by the teacher: ${mockOtherTeacherGroup.id}`);

           expect(sequelize.transaction).toHaveBeenCalledTimes(1);
           expect(Wordle.findOne).toHaveBeenCalledTimes(1);
           expect(mockWordle.save).toHaveBeenCalledTimes(1);
           expect(Group.findAll).toHaveBeenCalledTimes(1);
           expect(WordleGroup.destroy).not.toHaveBeenCalled();
           expect(WordleGroup.bulkCreate).not.toHaveBeenCalled();
           expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
           expect(mockTransaction.commit).not.toHaveBeenCalled();
           expect(wordleService.getWordleDetails).not.toHaveBeenCalled();
       });

        it('should throw an error and rollback transaction if removing group links fails', async () => {
           const destroyError = new Error('Destroy group links failed');
           WordleGroup.destroy.mockRejectedValue(destroyError);

           const updateDataWithError = { groupAccessIds: [mockGroup1.id] }; // Update group access

           await expect(wordleService.updateWordle(wordleId, teacherId, updateDataWithError)).rejects.toThrow('Destroy group links failed');

           expect(sequelize.transaction).toHaveBeenCalledTimes(1);
           expect(Wordle.findOne).toHaveBeenCalledTimes(1);
           expect(mockWordle.save).toHaveBeenCalledTimes(1);
           expect(Group.findAll).toHaveBeenCalledTimes(1);
           expect(WordleGroup.destroy).toHaveBeenCalledTimes(1);
           expect(WordleGroup.bulkCreate).not.toHaveBeenCalled();
           expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
           expect(mockTransaction.commit).not.toHaveBeenCalled();
           expect(wordleService.getWordleDetails).not.toHaveBeenCalled();
       });

       it('should throw an error and rollback transaction if creating new group links fails', async () => {
           const bulkCreateError = new Error('Bulk create group links failed');
           WordleGroup.bulkCreate.mockRejectedValue(bulkCreateError);

           const updateDataWithError = { groupAccessIds: [mockGroup1.id] }; // Update group access

           await expect(wordleService.updateWordle(wordleId, teacherId, updateDataWithError)).rejects.toThrow('Bulk create group links failed');

           expect(sequelize.transaction).toHaveBeenCalledTimes(1);
           expect(Wordle.findOne).toHaveBeenCalledTimes(1);
           expect(mockWordle.save).toHaveBeenCalledTimes(1);
           expect(Group.findAll).toHaveBeenCalledTimes(1);
           expect(WordleGroup.destroy).toHaveBeenCalledTimes(1);
           expect(WordleGroup.bulkCreate).toHaveBeenCalledTimes(1);
           expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
           expect(mockTransaction.commit).not.toHaveBeenCalled();
           expect(wordleService.getWordleDetails).not.toHaveBeenCalled();
       });

       // NEW: difficulty
       it('should not update difficulty if not provided in update data', async () => {
        const partialUpdateData = { name: 'Only Name Changed Again' };
        const originalDifficulty = mockWordle.difficulty; // Captura la dificultad original

        // Reset mocks for this specific test
        jest.clearAllMocks();
        sequelize.transaction.mockResolvedValue(mockTransaction);
        Wordle.findOne.mockResolvedValue(mockWordle); // Usar el mockWordle original
        mockWordle.name = 'Original Name'; // Resetear el nombre para el test
        mockWordle.difficulty = originalDifficulty; // Asegurar que la dificultad inicial es la original

        // Mockear la llamada final a getWordleDetails para este caso
        wordleService.getWordleDetails.mockResolvedValue({
            id: wordleId,
            name: partialUpdateData.name,
            words: [{ id: 50, word: 'ORIGINAL', hint: 'Old Hint' }], // Valores originales si no se actualizan
            questions: [{ id: 1, question: 'Original Q1' }, { id: 2, question: 'Original Q2' }],
            groupsWithAccess: [],
            difficulty: originalDifficulty,

        });

        const result = await wordleService.updateWordle(wordleId, teacherId, partialUpdateData);

        expect(mockWordle.name).toBe(partialUpdateData.name);
        expect(mockWordle.difficulty).toBe(originalDifficulty); // <--- ¡NUEVO! La dificultad no debería haber cambiado
        expect(mockWordle.save).toHaveBeenCalledTimes(1);
        expect(mockWordle.save).toHaveBeenCalledWith({ transaction: mockTransaction });

        expect(result).toHaveProperty('name', partialUpdateData.name);
        expect(result).toHaveProperty('difficulty', originalDifficulty); // Afirma que la dificultad no cambió
        expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
        expect(mockTransaction.rollback).not.toHaveBeenCalled();
    });
  });

  // --- Test Suite for deleteWordle ---

  describe('deleteWordle', () => {
      const wordleId = 10;
      const teacherId = 4;

      const mockWordle = {
          id: wordleId,
          userId: teacherId,
          destroy: jest.fn(() => Promise.resolve()), // Mock destroy method
      };
      const mockOtherWordle = { id: wordleId, userId: 99 };


      // Mock sequelize transaction methods
      const mockTransaction = {
          commit: jest.fn(() => Promise.resolve()),
          rollback: jest.fn(() => Promise.resolve()),
      };
      sequelize.transaction.mockResolvedValue(mockTransaction);


      beforeEach(() => {
          Wordle.findOne.mockResolvedValue(mockWordle); // Default: Wordle found and owned
      });

      it('should delete the wordle', async () => {
          const isDeleted = await wordleService.deleteWordle(wordleId, teacherId);

          // Assertions:
          expect(sequelize.transaction).toHaveBeenCalledTimes(1);
          expect(Wordle.findOne).toHaveBeenCalledTimes(1);
          expect(Wordle.findOne).toHaveBeenCalledWith({
              where: { id: wordleId, userId: teacherId },
              transaction: mockTransaction
          });

          expect(mockWordle.destroy).toHaveBeenCalledTimes(1);
          expect(mockWordle.destroy).toHaveBeenCalledWith({ transaction: mockTransaction });

          expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
          expect(mockTransaction.rollback).not.toHaveBeenCalled();
          expect(isDeleted).toBe(true);
      });

      it('should return false if the wordle is not found', async () => {
          Wordle.findOne.mockResolvedValue(null);

          const isDeleted = await wordleService.deleteWordle(wordleId, teacherId);

          expect(sequelize.transaction).toHaveBeenCalledTimes(1);
          expect(Wordle.findOne).toHaveBeenCalledTimes(1);
          expect(mockWordle.destroy).not.toHaveBeenCalled();
          expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
          expect(mockTransaction.commit).not.toHaveBeenCalled();
          expect(isDeleted).toBe(false);
      });

       it('should return false if the wordle is found but not created by the teacher', async () => {
           // Simulate findOne returning null because the where clause filtered it out
           Wordle.findOne.mockResolvedValue(null);

           const isDeleted = await wordleService.deleteWordle(wordleId, teacherId);

           expect(sequelize.transaction).toHaveBeenCalledTimes(1);
           expect(Wordle.findOne).toHaveBeenCalledTimes(1);
           expect(Wordle.findOne).toHaveBeenCalledWith({
              where: { id: wordleId, userId: teacherId }, // Check the where clause is correct
              transaction: mockTransaction
           });
           expect(mockWordle.destroy).not.toHaveBeenCalled();
           expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
           expect(mockTransaction.commit).not.toHaveBeenCalled();
           expect(isDeleted).toBe(false);
       });


      it('should throw an error and rollback transaction if Wordle.findOne fails', async () => {
          const findError = new Error('DB find error');
          Wordle.findOne.mockRejectedValue(findError);

          await expect(wordleService.deleteWordle(wordleId, teacherId)).rejects.toThrow('DB find error');

          expect(sequelize.transaction).toHaveBeenCalledTimes(1);
          expect(Wordle.findOne).toHaveBeenCalledTimes(1);
          expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
          expect(mockTransaction.commit).not.toHaveBeenCalled();
          expect(mockWordle.destroy).not.toHaveBeenCalled();
      });

       it('should throw an error and rollback transaction if wordle.destroy fails', async () => {
          const destroyError = new Error('DB destroy error');
          mockWordle.destroy.mockRejectedValue(destroyError);

          await expect(wordleService.deleteWordle(wordleId, teacherId)).rejects.toThrow('DB destroy error');

          expect(sequelize.transaction).toHaveBeenCalledTimes(1);
          expect(Wordle.findOne).toHaveBeenCalledTimes(1);
          expect(mockWordle.destroy).toHaveBeenCalledTimes(1);
          expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
          expect(mockTransaction.commit).not.toHaveBeenCalled();
      });
  });


  // --- Test Suite for saveGameResult ---

  describe('saveGameResult', () => {
      const userId = 1;
      const wordleId = 10;
      const score = 100;

      const mockExistingResultHigherScore = {
          userId, wordleId, score: 150, creationDate: new Date(),
          toJSON: jest.fn(), save: jest.fn(),
      };
      const mockExistingResultLowerScore = {
          userId, wordleId, score: 50, creationDate: new Date(),
          toJSON: jest.fn(), save: jest.fn(),
      };
       const mockExistingResultEqualScore = {
          userId, wordleId, score: 100, creationDate: new Date(),
          toJSON: jest.fn(), save: jest.fn(),
      };

      const mockNewResult = {
          userId, wordleId, score, creationDate: new Date(),
          toJSON: jest.fn(), save: jest.fn(),
      };


      // Mock sequelize transaction methods
      const mockTransaction = {
          commit: jest.fn(() => Promise.resolve()),
          rollback: jest.fn(() => Promise.resolve()),
      };
      sequelize.transaction.mockResolvedValue(mockTransaction);


      beforeEach(() => {
          GameResult.findOne.mockResolvedValue(null); // Default: No existing result
          GameResult.create.mockResolvedValue(mockNewResult); // Default: Create succeeds
      });

      it('should create a new game result if none exists', async () => {
          const result = await wordleService.saveGameResult(userId, wordleId, score);

          expect(sequelize.transaction).toHaveBeenCalledTimes(1);
          expect(GameResult.findOne).toHaveBeenCalledTimes(1);
          expect(GameResult.findOne).toHaveBeenCalledWith({
              where: { userId, wordleId },
              transaction: mockTransaction
          });
          expect(GameResult.create).toHaveBeenCalledTimes(1);
          expect(GameResult.create).toHaveBeenCalledWith({
              userId, wordleId, score
          }, { transaction: mockTransaction });
          expect(mockNewResult.toJSON).toHaveBeenCalledTimes(1);
          expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
          expect(mockTransaction.rollback).not.toHaveBeenCalled();
          expect(result).toEqual({ message: 'New game result created', gameResult: mockNewResult.toJSON() });
      });

      it('should update the existing game result if the new score is higher', async () => {
          GameResult.findOne.mockResolvedValue(mockExistingResultLowerScore); // Existing result with lower score

          const result = await wordleService.saveGameResult(userId, wordleId, score);

          expect(sequelize.transaction).toHaveBeenCalledTimes(1);
          expect(GameResult.findOne).toHaveBeenCalledTimes(1);
          expect(GameResult.create).not.toHaveBeenCalled(); // No new result created
          expect(mockExistingResultLowerScore.score).toBe(score); // Score should be updated
           // expect(mockExistingResultLowerScore.creationDate).toEqual(mockDate); // Optional: if you update date
          expect(mockExistingResultLowerScore.save).toHaveBeenCalledTimes(1);
          expect(mockExistingResultLowerScore.save).toHaveBeenCalledWith({ transaction: mockTransaction });
          expect(mockExistingResultLowerScore.toJSON).toHaveBeenCalledTimes(1);
          expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
          expect(mockTransaction.rollback).not.toHaveBeenCalled();
          expect(result).toEqual({ message: 'Game result updated with a higher score', gameResult: mockExistingResultLowerScore.toJSON() });
      });

      it('should NOT update the existing game result if the new score is lower', async () => {
          GameResult.findOne.mockResolvedValue(mockExistingResultHigherScore); // Existing result with higher score

          const result = await wordleService.saveGameResult(userId, wordleId, score);

          expect(sequelize.transaction).toHaveBeenCalledTimes(1);
          expect(GameResult.findOne).toHaveBeenCalledTimes(1);
          expect(GameResult.create).not.toHaveBeenCalled();
          expect(mockExistingResultHigherScore.score).toBe(150); // Score should NOT be updated
          expect(mockExistingResultHigherScore.save).not.toHaveBeenCalled(); // Save should NOT be called
          expect(mockExistingResultHigherScore.toJSON).toHaveBeenCalledTimes(1);
          expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
          expect(mockTransaction.rollback).not.toHaveBeenCalled();
          expect(result).toEqual({ message: 'Existing game result has a higher or equal score', gameResult: mockExistingResultHigherScore.toJSON() });
      });

       it('should NOT update the existing game result if the new score is equal', async () => {
          GameResult.findOne.mockResolvedValue(mockExistingResultEqualScore); // Existing result with equal score

          const result = await wordleService.saveGameResult(userId, wordleId, score);

          expect(sequelize.transaction).toHaveBeenCalledTimes(1);
          expect(GameResult.findOne).toHaveBeenCalledTimes(1);
          expect(GameResult.create).not.toHaveBeenCalled();
          expect(mockExistingResultEqualScore.score).toBe(100); // Score should NOT be updated
          expect(mockExistingResultEqualScore.save).not.toHaveBeenCalled(); // Save should NOT be called
          expect(mockExistingResultEqualScore.toJSON).toHaveBeenCalledTimes(1);
          expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
          expect(mockTransaction.rollback).not.toHaveBeenCalled();
          expect(result).toEqual({ message: 'Existing game result has a higher or equal score', gameResult: mockExistingResultEqualScore.toJSON() });
      });


      it('should throw an error and rollback transaction if GameResult.findOne fails', async () => {
          const findError = new Error('DB find error');
          GameResult.findOne.mockRejectedValue(findError);

          await expect(wordleService.saveGameResult(userId, wordleId, score)).rejects.toThrow('DB find error');

          expect(sequelize.transaction).toHaveBeenCalledTimes(1);
          expect(GameResult.findOne).toHaveBeenCalledTimes(1);
          expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
          expect(mockTransaction.commit).not.toHaveBeenCalled();
          expect(GameResult.create).not.toHaveBeenCalled();
      });

      it('should throw an error and rollback transaction if GameResult.create fails', async () => {
          const createError = new Error('DB create error');
          GameResult.create.mockRejectedValue(createError);

          await expect(wordleService.saveGameResult(userId, wordleId, score)).rejects.toThrow('DB create error');

          expect(sequelize.transaction).toHaveBeenCalledTimes(1);
          expect(GameResult.findOne).toHaveBeenCalledTimes(1);
          expect(GameResult.create).toHaveBeenCalledTimes(1);
          expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
          expect(mockTransaction.commit).not.toHaveBeenCalled();
      });

       it('should throw an error and rollback transaction if gameResult.save fails', async () => {
          GameResult.findOne.mockResolvedValue(mockExistingResultLowerScore); // Existing result with lower score
          const saveError = new Error('DB save error');
          mockExistingResultLowerScore.save.mockRejectedValue(saveError); // Simulate save failure

          await expect(wordleService.saveGameResult(userId, wordleId, score)).rejects.toThrow('DB save error');

          expect(sequelize.transaction).toHaveBeenCalledTimes(1);
          expect(GameResult.findOne).toHaveBeenCalledTimes(1);
          expect(mockExistingResultLowerScore.save).toHaveBeenCalledTimes(1);
          expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
          expect(mockTransaction.commit).not.toHaveBeenCalled();
          expect(GameResult.create).not.toHaveBeenCalled();
       });
  });


  // --- Test Suite for getGameResultsForStudent ---

  describe('getGameResultsForStudent', () => {
      const studentId = 1;
      const teacherId = 4;

      const mockGameResult1 = { id: 1, userId: studentId, wordleId: 10, score: 100, creationDate: new Date(), toJSON: jest.fn(() => ({ id: 1, userId: studentId, wordleId: 10, score: 100, creationDate: 'date', player: {}, wordle: {} })) };
      const mockGameResult2 = { id: 2, userId: studentId, wordleId: 11, score: 150, creationDate: new Date(), toJSON: jest.fn(() => ({ id: 2, userId: studentId, wordleId: 11, score: 150, creationDate: 'date', player: {}, wordle: {} })) };

      beforeEach(() => {
          GameResult.findAll.mockResolvedValue([mockGameResult2, mockGameResult1]); // Default: Return results, ordered by score desc
          // Mock the helper function used for teacher authorization
          wordleService.isStudentInTeacherGroup = jest.fn(() => Promise.resolve(true)); // Default: Teacher is authorized
      });

      it('should return game results for a student (without teacherId)', async () => {
          const result = await wordleService.getGameResultsForStudent(studentId);

          expect(wordleService.isStudentInTeacherGroup).not.toHaveBeenCalled(); // Helper not called without teacherId
          expect(GameResult.findAll).toHaveBeenCalledTimes(1);
          expect(GameResult.findAll).toHaveBeenCalledWith({
              where: { userId: studentId },
              include: [
                  { model: User, as: 'player', attributes: ['id', 'name', 'email', 'role'] },
                  { model: Wordle, as: 'wordle', attributes: ['id', 'name'] }
              ],
              order: [['creationDate', 'DESC']] // Check ordering
          });
          expect(mockGameResult1.toJSON).toHaveBeenCalledTimes(1);
          expect(mockGameResult2.toJSON).toHaveBeenCalledTimes(1);
          expect(result).toHaveLength(2);
          expect(result[0]).toHaveProperty('id', mockGameResult2.id); // Check order (most recent first based on mock data)
      });

      it('should return game results for a student (with authorized teacherId)', async () => {
          const result = await wordleService.getGameResultsForStudent(studentId, teacherId);

          expect(wordleService.isStudentInTeacherGroup).toHaveBeenCalledTimes(1);
          expect(wordleService.isStudentInTeacherGroup).toHaveBeenCalledWith(studentId, teacherId);
          expect(GameResult.findAll).toHaveBeenCalledTimes(1); // Should still fetch if authorized
          expect(result).toHaveLength(2);
      });

      it('should return an empty array if the student has no game results', async () => {
          GameResult.findAll.mockResolvedValue([]); // No results found

          const result = await wordleService.getGameResultsForStudent(studentId);

          expect(GameResult.findAll).toHaveBeenCalledTimes(1);
          expect(result).toHaveLength(0);
      });

      it('should throw an error if the teacher is not authorized to view student results', async () => {
          wordleService.isStudentInTeacherGroup = jest.fn(() => Promise.resolve(false)); // Teacher NOT authorized

          await expect(wordleService.getGameResultsForStudent(studentId, teacherId)).rejects.toThrow('Teacher not authorized to view this student\'s game results');

          expect(wordleService.isStudentInTeacherGroup).toHaveBeenCalledTimes(1);
          expect(GameResult.findAll).not.toHaveBeenCalled(); // Should not fetch results if not authorized
      });

      it('should throw an error if GameResult.findAll fails', async () => {
          const dbError = new Error('DB error');
          GameResult.findAll.mockRejectedValue(dbError);

          await expect(wordleService.getGameResultsForStudent(studentId)).rejects.toThrow('DB error');
          expect(GameResult.findAll).toHaveBeenCalledTimes(1);
      });

       it('should throw an error if the authorization helper fails', async () => {
           const authError = new Error('Auth check failed');
           wordleService.isStudentInTeacherGroup = jest.fn(() => Promise.reject(authError)); // Helper fails

           await expect(wordleService.getGameResultsForStudent(studentId, teacherId)).rejects.toThrow('Auth check failed');

           expect(wordleService.isStudentInTeacherGroup).toHaveBeenCalledTimes(1);
           expect(GameResult.findAll).not.toHaveBeenCalled();
       });
  });

  // --- Test Suite for getGameResultsForWordle ---

  describe('getGameResultsForWordle', () => {
      const wordleId = 10;
      const teacherId = 4;

      const mockGameResult1 = { id: 1, userId: 1, wordleId: wordleId, score: 100, creationDate: new Date('2025-05-10T10:00:00Z'), toJSON: jest.fn(() => ({ id: 1, userId: 1, wordleId: wordleId, score: 100, creationDate: 'date', player: {}, wordle: {} })) };
      const mockGameResult2 = { id: 2, userId: 2, wordleId: wordleId, score: 150, creationDate: new Date('2025-05-10T10:05:00Z'), toJSON: jest.fn(() => ({ id: 2, userId: 2, wordleId: wordleId, score: 150, creationDate: 'date', player: {}, wordle: {} })) };


      beforeEach(() => {
          GameResult.findAll.mockResolvedValue([mockGameResult2, mockGameResult1]); // Default: Return results, ordered by score desc
           // Mock the helper function used for teacher authorization
          wordleService.isWordleCreatedByTeacher = jest.fn(() => Promise.resolve(true)); // Default: Teacher is authorized
      });

      it('should return game results for a wordle (without teacherId)', async () => {
          const result = await wordleService.getGameResultsForWordle(wordleId);

          expect(wordleService.isWordleCreatedByTeacher).not.toHaveBeenCalled(); // Helper not called without teacherId
          expect(GameResult.findAll).toHaveBeenCalledTimes(1);
          expect(GameResult.findAll).toHaveBeenCalledWith({
              where: { wordleId: wordleId },
              include: [
                  { model: User, as: 'player', attributes: ['id', 'name', 'email', 'role'] },
                  { model: Wordle, as: 'wordle', attributes: ['id', 'name'] }
              ],
              order: [['score', 'DESC'], ['creationDate', 'ASC']] // Check ordering
          });
          expect(mockGameResult1.toJSON).toHaveBeenCalledTimes(1);
          expect(mockGameResult2.toJSON).toHaveBeenCalledTimes(1);
          expect(result).toHaveLength(2);
          expect(result[0]).toHaveProperty('id', mockGameResult2.id); // Check order (score desc)
      });

      it('should return game results for a wordle (with authorized teacherId)', async () => {
          const result = await wordleService.getGameResultsForWordle(wordleId, teacherId);

          expect(wordleService.isWordleCreatedByTeacher).toHaveBeenCalledTimes(1);
          expect(wordleService.isWordleCreatedByTeacher).toHaveBeenCalledWith(wordleId, teacherId);
          expect(GameResult.findAll).toHaveBeenCalledTimes(1); // Should still fetch if authorized
          expect(result).toHaveLength(2);
      });


      it('should return an empty array if the wordle has no game results', async () => {
          GameResult.findAll.mockResolvedValue([]); // No results found

          const result = await wordleService.getGameResultsForWordle(wordleId);

          expect(GameResult.findAll).toHaveBeenCalledTimes(1);
          expect(result).toHaveLength(0);
      });

       it('should throw an error if the teacher is not authorized to view wordle results', async () => {
          wordleService.isWordleCreatedByTeacher = jest.fn(() => Promise.resolve(false)); // Teacher NOT authorized

          await expect(wordleService.getGameResultsForWordle(wordleId, teacherId)).rejects.toThrow('Teacher not authorized to view results for this wordle');

          expect(wordleService.isWordleCreatedByTeacher).toHaveBeenCalledTimes(1);
          expect(GameResult.findAll).not.toHaveBeenCalled(); // Should not fetch results if not authorized
      });

      it('should throw an error if GameResult.findAll fails', async () => {
          const dbError = new Error('DB error');
          GameResult.findAll.mockRejectedValue(dbError);

          await expect(wordleService.getGameResultsForWordle(wordleId)).rejects.toThrow('DB error');
          expect(GameResult.findAll).toHaveBeenCalledTimes(1);
      });

      it('should throw an error if the authorization helper fails', async () => {
           const authError = new Error('Auth check failed');
           wordleService.isWordleCreatedByTeacher = jest.fn(() => Promise.reject(authError)); // Helper fails

           await expect(wordleService.getGameResultsForWordle(wordleId, teacherId)).rejects.toThrow('Auth check failed');

           expect(wordleService.isWordleCreatedByTeacher).toHaveBeenCalledTimes(1);
           expect(GameResult.findAll).not.toHaveBeenCalled();
       });
  });

   // --- Test Suite for getGameResultsForGroup ---

  describe('getGameResultsForGroup', () => {
      const groupId = 1;
      const teacherId = 4;

      // Mock game results with nested player and studentGroup includes
      const mockGameResult1 = {
          id: 1, userId: 1, wordleId: 10, score: 100, creationDate: new Date('2025-05-10T10:00:00Z'),
          player: { id: 1, name: 'Student 1', studentGroup: { userId: 1, groupId: groupId } }, // Student is in the group
          wordle: { id: 10, name: 'Wordle 1' },
          toJSON: jest.fn(() => ({ id: 1, userId: 1, wordleId: 10, score: 100, creationDate: 'date', player: { id: 1, name: 'Student 1' }, wordle: { id: 10, name: 'Wordle 1' } })),
      };
      const mockGameResult2 = {
          id: 2, userId: 2, wordleId: 10, score: 150, creationDate: new Date('2025-05-10T10:05:00Z'),
          player: { id: 2, name: 'Student 2', studentGroup: { userId: 2, groupId: groupId } }, // Student is in the group
          wordle: { id: 10, name: 'Wordle 1' },
          toJSON: jest.fn(() => ({ id: 2, userId: 2, wordleId: 10, score: 150, creationDate: 'date', player: { id: 2, name: 'Student 2' }, wordle: { id: 10, name: 'Wordle 1' } })),
      };
       const mockGameResultOtherGroup = {
          id: 3, userId: 3, wordleId: 11, score: 200, creationDate: new Date('2025-05-10T10:10:00Z'),
          player: { id: 3, name: 'Student 3', studentGroup: { userId: 3, groupId: 99 } }, // Student is in ANOTHER group
          wordle: { id: 11, name: 'Wordle 2' },
          toJSON: jest.fn(() => ({ id: 3, userId: 3, wordleId: 11, score: 200, creationDate: 'date', player: { id: 3, name: 'Student 3' }, wordle: { id: 11, name: 'Wordle 2' } })),
      };
       const mockGameResultNoStudentGroup = {
          id: 4, userId: 4, wordleId: 12, score: 50, creationDate: new Date('2025-05-10T10:15:00Z'),
          player: { id: 4, name: 'Student 4', studentGroup: null }, // Player is not in ANY group (or not linked correctly)
          wordle: { id: 12, name: 'Wordle 3' },
          toJSON: jest.fn(() => ({ id: 4, userId: 4, wordleId: 12, score: 50, creationDate: 'date', player: { id: 4, name: 'Student 4' }, wordle: { id: 12, name: 'Wordle 3' } })),
      };


      beforeEach(() => {
          // Default: Return a mix of results, including some that should be filtered out
          GameResult.findAll.mockResolvedValue([mockGameResult2, mockGameResult1, mockGameResultOtherGroup, mockGameResultNoStudentGroup]);
           // Mock the helper function used for teacher authorization
          wordleService.isGroupCreatedByTeacher = jest.fn(() => Promise.resolve(true)); // Default: Teacher is authorized
      });

      it('should return game results for students in the specified group (without teacherId)', async () => {
          const result = await wordleService.getGameResultsForGroup(groupId);

          expect(wordleService.isGroupCreatedByTeacher).not.toHaveBeenCalled(); // Helper not called without teacherId
          expect(GameResult.findAll).toHaveBeenCalledTimes(1);
          expect(GameResult.findAll).toHaveBeenCalledWith({
               include: [
                {
                    model: User,
                    as: 'player',
                    attributes: ['id', 'name', 'email', 'role'],
                    include: {
                        model: StudentGroup,
                        as: 'studentGroup',
                        where: { groupId: groupId }, // Check the where clause filters by group ID
                        attributes: []
                    }
                },
                { model: Wordle, as: 'wordle', attributes: ['id', 'name'] }
            ],
            order: [['creationDate', 'DESC']]
          });

          // Expect only results from students in the specified group
          expect(result).toHaveLength(2);
          expect(result.some(r => r.id === mockGameResult1.id)).toBe(true);
          expect(result.some(r => r.id === mockGameResult2.id)).toBe(true);
          expect(result.every(r => r.player && r.player.studentGroup === undefined)).toBe(true); // studentGroup should not be in final result
          expect(mockGameResult1.toJSON).toHaveBeenCalledTimes(1);
          expect(mockGameResult2.toJSON).toHaveBeenCalledTimes(1);
          // Check order (most recent first based on mock data)
          expect(result[0]).toHaveProperty('id', mockGameResult2.id);
          expect(result[1]).toHaveProperty('id', mockGameResult1.id);
      });

      it('should return game results for students in the specified group (with authorized teacherId)', async () => {
          const result = await wordleService.getGameResultsForGroup(groupId, teacherId);

          expect(wordleService.isGroupCreatedByTeacher).toHaveBeenCalledTimes(1);
          expect(wordleService.isGroupCreatedByTeacher).toHaveBeenCalledWith(groupId, teacherId);
          expect(GameResult.findAll).toHaveBeenCalledTimes(1); // Should still fetch if authorized
          expect(result).toHaveLength(2);
      });


      it('should return an empty array if no students in the group have game results', async () => {
          // Mock findAll to return results, but none for students in the target group
          GameResult.findAll.mockResolvedValue([mockGameResultOtherGroup, mockGameResultNoStudentGroup]);

          const result = await wordleService.getGameResultsForGroup(groupId);

          expect(GameResult.findAll).toHaveBeenCalledTimes(1);
          expect(result).toHaveLength(0); // Filtered result should be empty
      });

       it('should throw an error if the teacher is not authorized to view group results', async () => {
          wordleService.isGroupCreatedByTeacher = jest.fn(() => Promise.resolve(false)); // Teacher NOT authorized

          await expect(wordleService.getGameResultsForGroup(groupId, teacherId)).rejects.toThrow('Teacher not authorized to view results for this group');

          expect(wordleService.isGroupCreatedByTeacher).toHaveBeenCalledTimes(1);
          expect(GameResult.findAll).not.toHaveBeenCalled(); // Should not fetch results if not authorized
      });

      it('should throw an error if GameResult.findAll fails', async () => {
          const dbError = new Error('DB error');
          GameResult.findAll.mockRejectedValue(dbError);

          await expect(wordleService.getGameResultsForGroup(groupId)).rejects.toThrow('DB error');
          expect(GameResult.findAll).toHaveBeenCalledTimes(1);
      });

       it('should throw an error if the authorization helper fails', async () => {
           const authError = new Error('Auth check failed');
           wordleService.isGroupCreatedByTeacher = jest.fn(() => Promise.reject(authError)); // Helper fails

           await expect(wordleService.getGameResultsForGroup(groupId, teacherId)).rejects.toThrow('Auth check failed');

           expect(wordleService.isGroupCreatedByTeacher).toHaveBeenCalledTimes(1);
           expect(GameResult.findAll).not.toHaveBeenCalled();
       });
  });


  // --- Test Suite for getGameResultDetails ---

  describe('getGameResultDetails', () => {
      const gameResultId = 1;
      const teacherId = 4;
      const studentId = 1; // The student who got the result
      const wordleCreatorId = teacherId; // The teacher who created the wordle

      const mockGameResult = {
          id: gameResultId,
          userId: studentId, // The player's ID
          wordleId: 10,
          score: 100,
          creationDate: new Date(),
          player: { id: studentId, name: 'Student', email: 's@example.com', role: 'student' },
          wordle: { id: 10, name: 'Wordle', userId: wordleCreatorId }, // Include wordle creator
          toJSON: jest.fn(() => ({
              id: gameResultId,
              userId: studentId,
              wordleId: 10,
              score: 100,
              creationDate: 'date',
              player: { id: studentId, name: 'Student', email: 's@example.com', role: 'student' },
              wordle: { id: 10, name: 'Wordle' }, // Exclude wordle creator in final result
          })),
      };

      beforeEach(() => {
          GameResult.findByPk.mockResolvedValue(mockGameResult); // Default: Result found
          // Mock the helper function used for teacher authorization
          wordleService.isStudentInTeacherGroup = jest.fn(() => Promise.resolve(true)); // Default: Teacher is authorized by group
           wordleService.isWordleCreatedByTeacher = jest.fn(() => Promise.resolve(true)); // Default: Teacher is authorized by wordle (redundant if same teacher, but good to mock)
      });

      it('should return game result details (without teacherId)', async () => {
          const result = await wordleService.getGameResultDetails(gameResultId);

          expect(GameResult.findByPk).toHaveBeenCalledTimes(1);
          expect(GameResult.findByPk).toHaveBeenCalledWith(gameResultId, {
               include: [
                { model: User, as: 'player', attributes: ['id', 'name', 'email', 'role'] },
                { model: Wordle, as: 'wordle', attributes: ['id', 'name', 'userId'] } // Check includes
            ]
          });
          expect(mockGameResult.toJSON).toHaveBeenCalledTimes(1);
          expect(wordleService.isStudentInTeacherGroup).not.toHaveBeenCalled();
          expect(result).toEqual(mockGameResult.toJSON());
      });

      it('should return game result details (with authorized teacherId - by wordle creator)', async () => {
           // Teacher is the wordle creator
           const result = await wordleService.getGameResultDetails(gameResultId, teacherId);

           expect(GameResult.findByPk).toHaveBeenCalledTimes(1);
           expect(wordleService.isStudentInTeacherGroup).toHaveBeenCalledTimes(1); // Helper called
           expect(wordleService.isStudentInTeacherGroup).toHaveBeenCalledWith(studentId, teacherId);
           // isWordleCreatedByTeacher is not explicitly called, but the logic checks gameResult.wordle.userId
           expect(result).toEqual(mockGameResult.toJSON());
       });

       it('should return game result details (with authorized teacherId - by student group)', async () => {
           // Simulate a scenario where the teacher did NOT create the wordle, but the student is in their group
           const teacherIdByGroup = 99;
           const mockGameResultOtherWordleCreator = {
                ...mockGameResult,
                wordle: { id: 10, name: 'Wordle', userId: 50 }, // Wordle created by another teacher
                toJSON: jest.fn(() => ({ // Mock toJSON
                    id: gameResultId, userId: studentId, wordleId: 10, score: 100, creationDate: 'date',
                    player: { id: studentId, name: 'Student', email: 's@example.com', role: 'student' },
                    wordle: { id: 10, name: 'Wordle' },
                })),
           };
           GameResult.findByPk.mockResolvedValue(mockGameResultOtherWordleCreator);
           wordleService.isStudentInTeacherGroup = jest.fn(() => Promise.resolve(true)); // Teacher IS authorized by group

           const result = await wordleService.getGameResultDetails(gameResultId, teacherIdByGroup);

           expect(GameResult.findByPk).toHaveBeenCalledTimes(1);
           expect(wordleService.isStudentInTeacherGroup).toHaveBeenCalledTimes(1);
           expect(wordleService.isStudentInTeacherGroup).toHaveBeenCalledWith(studentId, teacherIdByGroup);
           expect(result).toEqual(mockGameResultOtherWordleCreator.toJSON());
       });


      it('should return null if the game result is not found', async () => {
          GameResult.findByPk.mockResolvedValue(null);

          const result = await wordleService.getGameResultDetails(gameResultId);

          expect(GameResult.findByPk).toHaveBeenCalledTimes(1);
          expect(result).toBeNull();
          expect(wordleService.isStudentInTeacherGroup).not.toHaveBeenCalled();
      });

       it('should throw an error if the teacher is not authorized to view game result (not creator, student not in group)', async () => {
           // Simulate a scenario where the teacher did NOT create the wordle, and the student is NOT in their group
           const teacherIdNotAuthorized = 99;
           const mockGameResultOtherWordleCreator = {
                ...mockGameResult,
                wordle: { id: 10, name: 'Wordle', userId: 50 }, // Wordle created by another teacher
                toJSON: jest.fn(),
           };
           GameResult.findByPk.mockResolvedValue(mockGameResultOtherWordleCreator);
           wordleService.isStudentInTeacherGroup = jest.fn(() => Promise.resolve(false)); // Teacher NOT authorized by group

           await expect(wordleService.getGameResultDetails(gameResultId, teacherIdNotAuthorized)).rejects.toThrow('Teacher not authorized to view this game result');

           expect(GameResult.findByPk).toHaveBeenCalledTimes(1);
           expect(wordleService.isStudentInTeacherGroup).toHaveBeenCalledTimes(1);
           expect(wordleService.isStudentInTeacherGroup).toHaveBeenCalledWith(studentId, teacherIdNotAuthorized);
       });


      it('should throw an error if GameResult.findByPk fails', async () => {
          const dbError = new Error('DB error');
          GameResult.findByPk.mockRejectedValue(dbError);

          await expect(wordleService.getGameResultDetails(gameResultId)).rejects.toThrow('DB error');
          expect(GameResult.findByPk).toHaveBeenCalledTimes(1);
          expect(wordleService.isStudentInTeacherGroup).not.toHaveBeenCalled();
      });

       it('should throw an error if the authorization helper fails', async () => {
           const authError = new Error('Auth check failed');
           wordleService.isStudentInTeacherGroup = jest.fn(() => Promise.reject(authError)); // Helper fails

           await expect(wordleService.getGameResultDetails(gameResultId, teacherId)).rejects.toThrow('Auth check failed');

           expect(GameResult.findByPk).toHaveBeenCalledTimes(1);
           expect(wordleService.isStudentInTeacherGroup).toHaveBeenCalledTimes(1);
       });
  });

});
