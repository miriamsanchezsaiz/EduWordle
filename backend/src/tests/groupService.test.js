// backend/src/tests/groupService.test.js
let mockGroups = [];

let mockFindAllGroups;


mockFindAllGroups = jest.fn((query) => {
    console.log('MOCKEDD - mockFindAllGroups ejecutado**************************************');
    const { where } = query;
    const result = mockGroups.filter(group => {
        let matches = true;

        const checkCondition = (condition, groupValue) => {
            const util = require('util');
            console.log(">>> Query completa recibida por el mock:");
            console.log(util.inspect(query, { depth: null, colors: true }));
        
            if (typeof condition !== 'object' || condition === null || Array.isArray(condition)) {
                return groupValue === condition;
            }
        
            const symbols = Object.getOwnPropertySymbols(condition);
            for (const op of symbols) {
                const value = condition[op];
                if (op === Op.eq && groupValue !== value) return false;
                if (op === Op.gt && !(groupValue > value)) return false;
                if (op === Op.gte && !(groupValue >= value)) return false;
                if (op === Op.lt && !(groupValue < value)) return false;
                if (op === Op.lte && !(groupValue <= value)) return false;
                if (op === Op.is && groupValue !== value) return false;
                if (op === Op.not && groupValue === value) return false;
            }
        
            return true;
        };
        


        for (const key in where) {
            if (key === Op.and) {
                for (const condition of where[Op.and]) {
                    let subMatch = true;
                    for (const subKey in condition) {
                        const groupValue = group[subKey];
                        const conditionValue = condition[subKey];
                        if (conditionValue !== undefined && !checkCondition(conditionValue, groupValue)) {
                            subMatch = false;
                            break;
                        }
                    }
                    if (!subMatch) {
                        matches = false;
                        break;
                    }
                }
            } else if (key === Op.or) {
                let orMatch = false;
                for (const condition of where[Op.or]) {
                    const [subKey] = Object.keys(condition);
                    const conditionValue = condition[subKey];
                    const groupValue = group[subKey];
            
                    if (conditionValue !== undefined && checkCondition(conditionValue, groupValue)) {
                        orMatch = true;
                        break;
                    }
                }
                if (!orMatch) {
                    matches = false;
                }
            }
             else {
                const groupValue = group[key];
                const conditionValue = where[key];
                if (conditionValue !== undefined && !checkCondition(conditionValue, groupValue)) {
                    matches = false;
                }
            }
        }
        return matches;
    });
    //   console.log('MOCKEDD - mockFindAllGroups result:', result);
    return result;
});

// Mock the entire models module
jest.mock('../api/models', () => {
    const { Op } = require('sequelize');

    return {
        User: {
            findByPk: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn(),
            getStudentGroups: jest.fn(),
        },
        Group: {
            findByPk: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            destroy: jest.fn(),
            addStudent: jest.fn(),
            removeStudents: jest.fn(),
            hasStudent: jest.fn(),
            getStudents: jest.fn(),
            getAccessibleWordles: jest.fn(),
        },
        StudentGroup: {
            bulkCreate: jest.fn(),
            destroy: jest.fn(),
            findOne: jest.fn(),
        },
        Wordle: {
            findByPk: jest.fn(),
            findAll: jest.fn(),
        },
        WordleGroup: {
            bulkCreate: jest.fn(),
            destroy: jest.fn(),
        },
    };
});


// Import dependencies that groupService uses, which we will mock
const { User, Group, StudentGroup, Wordle, WordleGroup } = require('../api/models');
const sequelize = require('../config/database');
const userService = require('../api/services/userService');
const emailService = require('../api/services/emailService');
const { Op } = require('sequelize'); // Import Op as it's used in the service

// Import the groupService that we want to test
const groupService = require('../api/services/groupService');



// Mock the userService module
jest.mock('../api/services/userService', () => ({
    findUserByEmail: jest.fn(), // Used in createGroup/updateGroup
    createUser: jest.fn(), // Used in createGroup/updateGroup
    getUserById: jest.fn(), // Used in createGroup/getGroupsByTeacher/getGroupDetails/updateGroup/deleteGroup
    deleteStudentIfNoGroups: jest.fn(), // Used in updateGroup/deleteGroup
}));

// Mock the emailService module
jest.mock('../api/services/emailService', () => ({
    sendInitialPasswordEmail: jest.fn(() => Promise.resolve(true)), // Simulate successful email sending
}));

// Mock sequelize for transaction handling
const mockTransaction = {
    commit: jest.fn(() => Promise.resolve()),
    rollback: jest.fn(() => Promise.resolve()),
};
sequelize.transaction = jest.fn(() => Promise.resolve(mockTransaction));




// Describe block to group tests for the groupService
describe('groupService', () => {

    // Clean up mocks before each test to ensure isolation
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-05-10T10:00:00Z')); // Establece la hora UTC directamente
        jest.clearAllMocks();

        mockGroups = [
            { id: 1, name: 'Active Group', initDate: new Date('2025-01-01'), endDate: null, userId: 4, toJSON: jest.fn(() => ({ id: 1, name: 'Active Group', initDate: '2025-01-01', endDate: null, userId: 4 })), isActive: true },
            { id: 2, name: 'Inactive Future Group', initDate: new Date('2026-01-01'), endDate: null, userId: 4, toJSON: jest.fn(() => ({ id: 2, name: 'Inactive Future Group', initDate: '2026-01-01', endDate: null, userId: 4 })), isActive: false },
            { id: 3, name: 'Inactive Past Group', initDate: new Date('2024-01-01'), endDate: new Date('2024-12-31'), userId: 4, toJSON: jest.fn(() => ({ id: 3, name: 'Inactive Past Group', initDate: '2024-01-01', endDate: '2024-12-31', userId: 4 })), isActive: false },
            { id: 4, name: 'Active Group 2', initDate: new Date('2025-04-01'), endDate: new Date('2025-12-31'), userId: 4, toJSON: jest.fn(() => ({ id: 4, name: 'Active Group 2', initDate: '2025-04-01', endDate: '2025-12-31', userId: 4 })), isActive: true },
            { id: 5, name: 'TRAP', initDate: new Date('2025-04-01'), endDate: new Date('2025-12-31'), userId: '2', toJSON: jest.fn(() => ({ id: 5, name: 'TRAP', initDate: '2025-04-01', endDate: '2025-12-31', userId: '2' })), isActive: true },
            { id: 6, name: 'Inactive TRAP', initDate: new Date('2026-01-01'), endDate: null, userId: '2', toJSON: jest.fn(() => ({ id: 6, name: 'Inactive TRAP', initDate: '2026-01-01', endDate: null, userId: '2' })), isActive: false },
        ];


    });

    // Restore the original Date object after all tests
    afterAll(() => {
        jest.useRealTimers();
    });

    // --- Test Suite for getGroupsByTeacher ---

    describe('getGroupsByTeacher', () => {
        const teacherId = 4;
        const mockTeacher = { id: teacherId, role: 'teacher' };
        const mockedDate = new Date('2025-05-10T10:00:00Z');


        beforeEach(() => {
            userService.getUserById.mockResolvedValue(mockTeacher);
            Group.findAll = mockFindAllGroups;
        });

        it('should return all groups created by the teacher with isActive status', async () => {

            const result = await groupService.getGroupsByTeacher(teacherId, {}); // No filters

            expect(userService.getUserById).toHaveBeenCalledTimes(1);
            expect(userService.getUserById).toHaveBeenCalledWith(teacherId);


            expect(Group.findAll).toHaveBeenCalledWith({
                where: { userId: teacherId },
                attributes: ['id', 'name', 'initDate', 'endDate', 'userId'],
            });

            const today = new Date();

            result.forEach(group => {
                const initDate = new Date(group.initDate);
                const endDate = group.endDate ? new Date(group.endDate) : null;
                const shouldBeActive = initDate <= today && (!endDate || endDate >= today);
                const groupTeacher = group.userId;
                expect(groupTeacher).toBe(teacherId);
                expect(group).toHaveProperty('isActive', shouldBeActive);
            });




        });

        it('should return only active groups when status filter is "active"', async () => {


            const result = await groupService.getGroupsByTeacher(teacherId, { status: 'active' });

            // console.log("FINAL-DEBUG:", result.map(g => ({ name: g.name, isActive: g.isActive, initDate: g.initDate, endDate: g.endDate })));


            expect(Group.findAll).toHaveBeenCalledWith({
                where: {
                    userId: teacherId,
                    initDate: { [Op.lte]: mockedDate },
                    [Op.or]: [
                        { endDate: null },
                        { endDate: { [Op.gte]: mockedDate } }
                    ]
                },
                attributes: ['id', 'name', 'initDate', 'endDate', 'userId'],
            });

            const activeMockGroups = mockGroups.filter(group => {
                const groupTeacher = group.userId;
                const initDate = new Date(group.initDate);
                const endDate = group.endDate ? new Date(group.endDate) : null;
                return (groupTeacher == teacherId) && (initDate <= mockedDate) && (!endDate || endDate >= mockedDate);
            });

            expect(result).toHaveLength(activeMockGroups.length);
            activeMockGroups.forEach(activeGroup => {
                expect(result.some(g => g.id === activeGroup.id)).toBe(true);
                expect(result.find(g => g.id === activeGroup.id)).toHaveProperty('isActive', true);
            });



        });

        it('should return only inactive groups when status filter is "inactive"', async () => {


            const result = await groupService.getGroupsByTeacher(teacherId, { status: 'inactive' });

            expect(Group.findAll).toHaveBeenCalledWith({
                where: {
                    userId: teacherId,
                    [Op.or]: [
                        { initDate: { [Op.gt]: mockedDate } },
                        { endDate: { [Op.lt]: mockedDate } }
                    ]
                },
                attributes: ['id', 'name', 'initDate', 'endDate', 'userId'],
            });

            const inactiveMockGroups = mockGroups.filter(group => {
                return (new Date(group.initDate) > mockedDate || (group.endDate && new Date(group.endDate) < mockedDate)) && (group.userId == teacherId);
            });

            expect(result).toHaveLength(inactiveMockGroups.length);
            inactiveMockGroups.forEach(inactiveGroup => {
                expect(result.some(g => g.id === inactiveGroup.id)).toBe(true);
                expect(result.find(g => g.id === inactiveGroup.id)).toHaveProperty('isActive', false);
            });


        });

        it('should apply startDateFrom filter', async () => {
            const filterDate = '2025-05-01';

            const result = await groupService.getGroupsByTeacher(teacherId, { startDateFrom: filterDate });

            expect(Group.findAll).toHaveBeenCalledWith({
                where: {
                    userId: teacherId,
                    initDate: { [Op.gte]: new Date(filterDate) }
                },
                attributes: ['id', 'name', 'initDate', 'endDate', 'userId'],
            });

            const filteredMockGroups = mockGroups.filter(group => new Date(group.initDate) >= new Date(filterDate));
            expect(result).toHaveLength(filteredMockGroups.length);
        });

        it('should apply endDateTo filter', async () => {
            const filterDate = '2025-12-31';

            const result = await groupService.getGroupsByTeacher(teacherId, { endDateTo: filterDate });

            expect(Group.findAll).toHaveBeenCalledWith({
                where: {
                    userId: teacherId,
                    endDate: { [Op.lte]: new Date(filterDate) }
                },
                attributes: ['id', 'name', 'initDate', 'endDate', 'userId'],
            });

            const filteredMockGroups = mockGroups.filter(group => group.endDate != null && new Date(group.endDate) <= new Date(filterDate));
            expect(result).toHaveLength(filteredMockGroups.length);
        });


        it.skip('should throw an error if teacher is not found', async () => {
            userService.getUserById.mockResolvedValue(null);

            await expect(groupService.getGroupsByTeacher(teacherId, {})).rejects.toThrow('User not found or not authorized to view groups');
            expect(userService.getUserById).toHaveBeenCalledTimes(1);
            expect(Group.findAll).not.toHaveBeenCalled();
        });

        it.skip('should throw an error if teacher is not a teacher role', async () => {
            const mockNonTeacher = { id: teacherId, role: 'student' };
            userService.getUserById.mockResolvedValue(mockNonTeacher);

            await expect(groupService.getGroupsByTeacher(teacherId, {})).rejects.toThrow('User not found or not authorized to view groups');
            expect(userService.getUserById).toHaveBeenCalledTimes(1);
            expect(Group.findAll).not.toHaveBeenCalled();
        });

        it.skip('should throw an error if Group.findAll fails', async () => {
            const dbError = new Error('DB error');
            Group.findAll.mockRejectedValue(dbError);

            await expect(groupService.getGroupsByTeacher(teacherId, {})).rejects.toThrow('DB error');
            expect(userService.getUserById).toHaveBeenCalledTimes(1);
            expect(Group.findAll).toHaveBeenCalledTimes(1);
        });
    });

    // --- Test Suites for Helper Functions ---

    describe.skip('isStudentInTeacherGroup', () => {
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

            const result = await groupService.isStudentInTeacherGroup(studentId, teacherId);

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

            const result = await groupService.isStudentInTeacherGroup(studentId, teacherId);

            expect(User.findByPk).toHaveBeenCalledWith(studentId);
            expect(mockStudentUser.getStudentGroups).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });

        it('should return false if the user found is not a student', async () => {
            User.findByPk.mockResolvedValue(mockNonStudentUser); // Found a teacher instead

            const result = await groupService.isStudentInTeacherGroup(mockNonStudentUser.id, teacherId);

            expect(User.findByPk).toHaveBeenCalledWith(mockNonStudentUser.id);
            expect(mockNonStudentUser.getStudentGroups).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });

        it('should return false if the student is found but not in any group by the teacher', async () => {
            User.findByPk.mockResolvedValue(mockStudentUser);
            const mockGroups = [{ id: 2, userId: 99 }]; // Group not created by this teacher
            mockStudentUser.getStudentGroups.mockResolvedValue(mockGroups);

            const result = await groupService.isStudentInTeacherGroup(studentId, teacherId);

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

            await expect(groupService.isStudentInTeacherGroup(studentId, teacherId)).rejects.toThrow('DB error');
            expect(User.findByPk).toHaveBeenCalledWith(studentId);
        });
    });


    // --- Test Suite for createGroup ---

    describe.skip('createGroup', () => {
        const teacherId = 4;
        const groupData = { name: 'New Group', startDate: '2025-06-01', endDate: '2026-06-01' };
        const studentEmails = ['student1@example.com', 'student2@example.com'];

        const mockTeacher = { id: teacherId, role: 'teacher' };
        const mockNewGroup = {
            id: 1,
            name: groupData.name,
            initDate: new Date(groupData.startDate),
            endDate: new Date(groupData.endDate),
            userId: teacherId,
            toJSON: jest.fn(() => ({ // Mock toJSON
                id: 1,
                name: groupData.name,
                initDate: groupData.startDate,
                endDate: groupData.endDate,
                userId: teacherId,
            })),
            addStudent: jest.fn(), // Mock addStudent
            hasStudent: jest.fn(), // Mock hasStudent
        };

        const mockExistingStudent = {
            id: 10,
            email: studentEmails[0],
            role: 'student',
            toJSON: jest.fn(),
            getStudentGroups: jest.fn(),
            save: jest.fn(),
            destroy: jest.fn(),
        };
        const mockNewStudent = {
            id: 11,
            email: studentEmails[1],
            role: 'student',
            name: studentEmails[1].split('@')[0],
            toJSON: jest.fn(),
            getStudentGroups: jest.fn(),
            save: jest.fn(),
            destroy: jest.fn(),
        };

        let mockTransaction;

        beforeEach(() => {
            // Initialize mockTransaction in beforeEach
            mockTransaction = {
                commit: jest.fn(() => Promise.resolve()),
                rollback: jest.fn(() => Promise.resolve()),
            };

            // Mock sequelize.transaction to always return our mockTransaction
            sequelize.transaction = jest.fn(() => Promise.resolve(mockTransaction));


            // Default mocks for a successful scenario
            userService.getUserById.mockResolvedValue(mockTeacher);
            Group.create.mockResolvedValue(mockNewGroup);
            userService.findUserByEmail.mockResolvedValue(null); // Default: student does not exist
            userService.createUser.mockResolvedValue(mockNewStudent); // Default: createUser returns new student
            StudentGroup.bulkCreate.mockResolvedValue([]); // Default bulkCreate succeeds
            emailService.sendInitialPasswordEmail.mockResolvedValue(true); // Default email send succeeds

            // Mock the final fetch after commit
            Group.findByPk.mockResolvedValue({ // Simulate fetched group with relations
                ...mockNewGroup, // Include basic group data
                toJSON: jest.fn(() => ({ // Mock toJSON for the final returned object
                    ...mockNewGroup.toJSON(),
                    students: [], // Initially no students fetched
                    accessibleWordles: [], // Initially no wordles fetched
                })),
            });
        });

        it('should create a group and new students, then link them', async () => {
            userService.findUserByEmail.mockResolvedValue(null);
            //No sé por que envía dos veces el mismo estudiante así que voy a configurar dos mocks de estudiantes específicos para este test
            const mockNewStudent1 = { id: 5, name: 'student1', email: 'student1@example.com' };
            const mockNewStudent2 = { id: 6, name: 'student2', email: 'student2@example.com' };

            userService.createUser.mockImplementation((email) => {
                if (email === 'student1@example.com') {
                    return mockNewStudent1;
                }
                if (email === 'student2@example.com') {
                    return mockNewStudent2;
                }
                return mockNewStudent; // Default fallback if needed
            });


            const result = await groupService.createGroup(teacherId, groupData, studentEmails);

            // Assertions:
            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(userService.getUserById).toHaveBeenCalledWith(teacherId);
            expect(Group.create).toHaveBeenCalledWith({
                name: groupData.name,
                initDate: new Date(groupData.startDate), // Dates should be Date objects
                endDate: new Date(groupData.endDate),
                userId: teacherId,
            }, { transaction: mockTransaction });

            // Check student processing loop
            expect(userService.findUserByEmail).toHaveBeenCalledTimes(studentEmails.length);
            expect(userService.findUserByEmail).toHaveBeenCalledWith(studentEmails[0]);
            expect(userService.findUserByEmail).toHaveBeenCalledWith(studentEmails[1]);

            expect(userService.createUser).toHaveBeenCalledTimes(studentEmails.length);
            // Check createUser calls (simplified check)
            expect(userService.createUser).toHaveBeenCalledWith(studentEmails[0], studentEmails[0].split('@')[0], expect.any(String), 'student', mockTransaction);
            expect(userService.createUser).toHaveBeenCalledWith(studentEmails[1], studentEmails[1].split('@')[0], expect.any(String), 'student', mockTransaction);

            expect(emailService.sendInitialPasswordEmail).toHaveBeenCalledTimes(studentEmails.length);
            expect(emailService.sendInitialPasswordEmail).toHaveBeenCalledWith('student1@example.com', 'student1', expect.any(String));
            expect(emailService.sendInitialPasswordEmail).toHaveBeenCalledWith('student2@example.com', 'student2', expect.any(String));

            // Check bulkCreate call
            expect(StudentGroup.bulkCreate).toHaveBeenCalledTimes(1);
            expect(StudentGroup.bulkCreate).toHaveBeenCalledWith([
                { userId: mockNewStudent1.id, groupId: mockNewGroup.id },
                { userId: mockNewStudent2.id, groupId: mockNewGroup.id }, // This will be called twice with the same mock student ID, but bulkCreate handles it
            ], { transaction: mockTransaction, ignore: true });


            expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
            expect(mockTransaction.rollback).not.toHaveBeenCalled();

            // Check final fetch and return value structure
            expect(Group.findByPk).toHaveBeenCalledTimes(1);
            expect(result).toHaveProperty('id', mockNewGroup.id);
            expect(result).toHaveProperty('createdStudents', studentEmails);
            expect(result).toHaveProperty('linkedStudents', []);
        });

        it('should create a group and link existing students', async () => {
            // Configure findUserByEmail to return existing student for both emails
            userService.findUserByEmail.mockResolvedValue(mockExistingStudent);
            // Configure hasStudent to return false (student not already in group)
            mockNewGroup.hasStudent.mockResolvedValue(false);
            // Configure addStudent to resolve successfully
            mockNewGroup.addStudent.mockResolvedValue(true);


            const result = await groupService.createGroup(teacherId, groupData, studentEmails);

            // Assertions:
            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(userService.getUserById).toHaveBeenCalledTimes(1);
            expect(Group.create).toHaveBeenCalledTimes(1);

            expect(userService.findUserByEmail).toHaveBeenCalledTimes(studentEmails.length);
            expect(userService.findUserByEmail).toHaveBeenCalledWith(studentEmails[0]);
            expect(userService.findUserByEmail).toHaveBeenCalledWith(studentEmails[1]);

            expect(userService.createUser).not.toHaveBeenCalled(); // No new students created
            expect(emailService.sendInitialPasswordEmail).not.toHaveBeenCalled(); // No emails sent

            expect(mockNewGroup.hasStudent).toHaveBeenCalledTimes(studentEmails.length);
            expect(mockNewGroup.hasStudent).toHaveBeenCalledWith(mockExistingStudent, { transaction: mockTransaction });

            expect(StudentGroup.bulkCreate).toHaveBeenCalledTimes(1);
            expect(StudentGroup.bulkCreate).toHaveBeenCalledWith([
                { userId: mockExistingStudent.id, groupId: mockNewGroup.id },
                { userId: mockExistingStudent.id, groupId: mockNewGroup.id },
            ], { transaction: mockTransaction, ignore: true });


            expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
            expect(mockTransaction.rollback).not.toHaveBeenCalled();

            expect(Group.findByPk).toHaveBeenCalledTimes(1);
            expect(result).toHaveProperty('id', mockNewGroup.id);
            expect(result).toHaveProperty('createdStudents', []);
            expect(result).toHaveProperty('linkedStudents', studentEmails);
        });

        it('should create a group and handle a mix of new and existing students', async () => {
            // Configure findUserByEmail to return existing for student1, null for student2
            userService.findUserByEmail.mockResolvedValueOnce(mockExistingStudent).mockResolvedValueOnce(null);
            // Configure hasStudent to return false for the existing student
            mockNewGroup.hasStudent.mockResolvedValue(false);
            // Configure addStudent to resolve successfully
            mockNewGroup.addStudent.mockResolvedValue(true);
            // Configure createUser to return mockNewStudent for the new student
            userService.createUser.mockResolvedValue(mockNewStudent);


            const result = await groupService.createGroup(teacherId, groupData, studentEmails);

            // Assertions:
            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(userService.getUserById).toHaveBeenCalledTimes(1);
            expect(Group.create).toHaveBeenCalledTimes(1);

            expect(userService.findUserByEmail).toHaveBeenCalledTimes(studentEmails.length);
            expect(userService.findUserByEmail).toHaveBeenCalledWith(studentEmails[0]);
            expect(userService.findUserByEmail).toHaveBeenCalledWith(studentEmails[1]);


            expect(userService.createUser).toHaveBeenCalledTimes(1); // Only called for student2
            expect(userService.createUser).toHaveBeenCalledWith(studentEmails[1], studentEmails[1].split('@')[0], expect.any(String), 'student', mockTransaction);

            expect(emailService.sendInitialPasswordEmail).toHaveBeenCalledTimes(1); // Only called for student2
            expect(emailService.sendInitialPasswordEmail).toHaveBeenCalledWith(mockNewStudent.email, mockNewStudent.name, expect.any(String));

            expect(mockNewGroup.hasStudent).toHaveBeenCalledTimes(1); // Only called for student1
            expect(mockNewGroup.hasStudent).toHaveBeenCalledWith(mockExistingStudent, { transaction: mockTransaction });



            expect(StudentGroup.bulkCreate).toHaveBeenCalledTimes(1);
            expect(StudentGroup.bulkCreate).toHaveBeenCalledWith([
                { userId: mockExistingStudent.id, groupId: mockNewGroup.id },
                { userId: mockNewStudent.id, groupId: mockNewGroup.id },
            ], { transaction: mockTransaction, ignore: true });

            expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
            expect(mockTransaction.rollback).not.toHaveBeenCalled();

            expect(Group.findByPk).toHaveBeenCalledTimes(1);
            expect(result).toHaveProperty('id', mockNewGroup.id);
            expect(result).toHaveProperty('createdStudents', [studentEmails[1]]);
            expect(result).toHaveProperty('linkedStudents', [studentEmails[0]]);
        });


        it('should create a group without students if studentEmails array is empty or null', async () => {
            // Test with empty array
            let result = await groupService.createGroup(teacherId, groupData, []);

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(userService.getUserById).toHaveBeenCalledTimes(1);
            expect(Group.create).toHaveBeenCalledTimes(1);
            expect(userService.findUserByEmail).not.toHaveBeenCalled();
            expect(userService.createUser).not.toHaveBeenCalled();
            expect(emailService.sendInitialPasswordEmail).not.toHaveBeenCalled();
            expect(mockNewGroup.hasStudent).not.toHaveBeenCalled();
            expect(mockNewGroup.addStudent).not.toHaveBeenCalled();
            expect(StudentGroup.bulkCreate).not.toHaveBeenCalled();
            expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
            expect(mockTransaction.rollback).not.toHaveBeenCalled();
            expect(Group.findByPk).toHaveBeenCalledTimes(1);
            expect(result).toHaveProperty('id', mockNewGroup.id);
            expect(result).toHaveProperty('createdStudents', []);
            expect(result).toHaveProperty('linkedStudents', []);

            jest.clearAllMocks(); // Clear mocks for the next test in this scenario

            // Test with null
            sequelize.transaction = jest.fn(() =>
                Promise.resolve(mockTransaction)
            )  // Re-mock transaction
            userService.getUserById.mockResolvedValue(mockTeacher);
            Group.create.mockResolvedValue(mockNewGroup);
            Group.findByPk.mockResolvedValue({ // Simulate fetched group with relations
                ...mockNewGroup,
                toJSON: jest.fn(() => ({
                    ...mockNewGroup.toJSON(),
                    students: [],
                    accessibleWordles: [],
                })),
            });

            result = await groupService.createGroup(teacherId, groupData, null);

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(userService.getUserById).toHaveBeenCalledTimes(1);
            expect(Group.create).toHaveBeenCalledTimes(1);
            expect(userService.findUserByEmail).not.toHaveBeenCalled();
            expect(userService.createUser).not.toHaveBeenCalled();
            expect(emailService.sendInitialPasswordEmail).not.toHaveBeenCalled();
            expect(mockNewGroup.hasStudent).not.toHaveBeenCalled();
            expect(mockNewGroup.addStudent).not.toHaveBeenCalled();
            expect(StudentGroup.bulkCreate).not.toHaveBeenCalled();
            expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
            expect(mockTransaction.rollback).not.toHaveBeenCalled();
            expect(Group.findByPk).toHaveBeenCalledTimes(1);
            expect(result).toHaveProperty('id', mockNewGroup.id);
            expect(result).toHaveProperty('createdStudents', []);
            expect(result).toHaveProperty('linkedStudents', []);
        });


        it('should throw an error and rollback transaction if teacher is not found', async () => {
            userService.getUserById.mockResolvedValue(null); // Teacher not found

            await expect(groupService.createGroup(teacherId, groupData, studentEmails)).rejects.toThrow('User not found or not authorized to create groups');

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(userService.getUserById).toHaveBeenCalledTimes(1);
            expect(Group.create).not.toHaveBeenCalled(); // Group should not be created
            expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
            expect(mockTransaction.commit).not.toHaveBeenCalled();
            expect(Group.findByPk).not.toHaveBeenCalled();
        });

        it('should throw an error and rollback transaction if teacher is not a teacher role', async () => {
            const mockNonTeacher = { id: teacherId, role: 'student' };
            userService.getUserById.mockResolvedValue(mockNonTeacher); // User found, but not a teacher

            await expect(groupService.createGroup(teacherId, groupData, studentEmails)).rejects.toThrow('User not found or not authorized to create groups');

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(userService.getUserById).toHaveBeenCalledTimes(1);
            expect(Group.create).not.toHaveBeenCalled();
            expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
            expect(mockTransaction.commit).not.toHaveBeenCalled();
            expect(Group.findByPk).not.toHaveBeenCalled();
        });


        it('should throw an error and rollback transaction if Group.create fails', async () => {
            const createError = new Error('DB create error');
            Group.create.mockRejectedValue(createError); // Simulate DB error

            await expect(groupService.createGroup(teacherId, groupData, studentEmails)).rejects.toThrow('DB create error');

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(userService.getUserById).toHaveBeenCalledTimes(1);
            expect(Group.create).toHaveBeenCalledTimes(1);
            expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
            expect(mockTransaction.commit).not.toHaveBeenCalled();
            expect(Group.findByPk).not.toHaveBeenCalled();
        });

        it('should throw an error and rollback transaction if userService.findUserByEmail fails', async () => {
            const findError = new Error('DB find user error');
            userService.findUserByEmail.mockRejectedValue(findError); // Simulate error finding student email

            await expect(groupService.createGroup(teacherId, groupData, studentEmails)).rejects.toThrow('DB find user error');

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(userService.getUserById).toHaveBeenCalledTimes(1);
            expect(Group.create).toHaveBeenCalledTimes(1); // Group is created before student processing
            expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
            expect(mockTransaction.commit).not.toHaveBeenCalled();
            expect(Group.findByPk).not.toHaveBeenCalled();
        });

        it('should throw an error and rollback transaction if userService.createUser fails', async () => {
            userService.findUserByEmail.mockResolvedValue(null); // Student not found
            const createUserError = new Error('DB create user error');
            userService.createUser.mockRejectedValue(createUserError); // Simulate error creating student

            await expect(groupService.createGroup(teacherId, groupData, studentEmails)).rejects.toThrow('DB create user error');

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(userService.getUserById).toHaveBeenCalledTimes(1);
            expect(Group.create).toHaveBeenCalledTimes(1);
            expect(userService.findUserByEmail).toHaveBeenCalledTimes(1); // Called for the first email
            expect(userService.createUser).toHaveBeenCalledTimes(1); // Called for the first email
            expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
            expect(mockTransaction.commit).not.toHaveBeenCalled();
            expect(Group.findByPk).not.toHaveBeenCalled();
        });

        it('should throw an error and rollback transaction if addStudent fails for existing student', async () => {
            userService.findUserByEmail.mockResolvedValue(mockExistingStudent); // Student found
            mockNewGroup.hasStudent.mockResolvedValue(false); // Not already in group

            const bulkCreateError = new Error('DB add student error');
            StudentGroup.bulkCreate.mockRejectedValue(bulkCreateError); // Simulate error adding student

            await expect(groupService.createGroup(teacherId, groupData, studentEmails)).rejects.toThrow('DB add student error');

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(userService.getUserById).toHaveBeenCalledTimes(1);
            expect(Group.create).toHaveBeenCalledTimes(1);
            expect(userService.findUserByEmail).toHaveBeenCalledTimes(studentEmails.length);
            expect(mockNewGroup.hasStudent).toHaveBeenCalledTimes(studentEmails.length);
            expect(StudentGroup.bulkCreate).toHaveBeenCalledTimes(1);
            expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
            expect(mockTransaction.commit).not.toHaveBeenCalled();
            expect(Group.findByPk).not.toHaveBeenCalled();
        });

        it('should throw an error and rollback transaction if addStudent fails for new student', async () => {
            userService.findUserByEmail.mockResolvedValue(null);
            userService.createUser.mockResolvedValue(mockNewStudent);

            const bulkCreateError = new Error('DB add student error');
            StudentGroup.bulkCreate.mockRejectedValue(bulkCreateError); // Simulo error en bulkCreate

            await expect(groupService.createGroup(teacherId, groupData, studentEmails)).rejects.toThrow('DB add student error');

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(userService.getUserById).toHaveBeenCalledTimes(1);
            expect(Group.create).toHaveBeenCalledTimes(1);
            expect(userService.findUserByEmail).toHaveBeenCalledTimes(studentEmails.length);
            expect(userService.createUser).toHaveBeenCalledTimes(studentEmails.length);
            expect(StudentGroup.bulkCreate).toHaveBeenCalledTimes(1);
            expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
            expect(mockTransaction.commit).not.toHaveBeenCalled();
            expect(Group.findByPk).not.toHaveBeenCalled();
        });


        it('should throw an error and rollback transaction if StudentGroup.bulkCreate fails', async () => {
            // Configure findUserByEmail to return null for both emails
            userService.findUserByEmail.mockResolvedValue(null);
            // Configure createUser to return mockNewStudent for both emails (simplified)
            userService.createUser.mockResolvedValue(mockNewStudent);

            const bulkCreateError = new Error('DB bulk create error');
            StudentGroup.bulkCreate.mockRejectedValue(bulkCreateError); // Simulate bulk create error


            await expect(groupService.createGroup(teacherId, groupData, studentEmails)).rejects.toThrow('DB bulk create error');

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(userService.getUserById).toHaveBeenCalledTimes(1);
            expect(Group.create).toHaveBeenCalledTimes(1);
            expect(userService.findUserByEmail).toHaveBeenCalledTimes(studentEmails.length);
            expect(userService.createUser).toHaveBeenCalledTimes(studentEmails.length);
            expect(StudentGroup.bulkCreate).toHaveBeenCalledTimes(1);
            expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
            expect(mockTransaction.commit).not.toHaveBeenCalled();
            expect(Group.findByPk).not.toHaveBeenCalled();
        });

        it('should not throw an error if emailService.sendInitialPasswordEmail fails (non-blocking)', async () => {
            // Configure findUserByEmail to return null for both emails
            userService.findUserByEmail.mockResolvedValue(null);
            // Configure createUser to return mockNewStudent for both emails (simplified)
            userService.createUser.mockResolvedValue(mockNewStudent);
            // Simulate email sending failure
            emailService.sendInitialPasswordEmail.mockRejectedValue(new Error('Email send failed'));

            // The service should still complete successfully because email sending is fire-and-forget
            const result = await groupService.createGroup(teacherId, groupData, studentEmails);

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(userService.getUserById).toHaveBeenCalledTimes(1);
            expect(Group.create).toHaveBeenCalledTimes(1);
            expect(userService.findUserByEmail).toHaveBeenCalledTimes(studentEmails.length);
            expect(userService.createUser).toHaveBeenCalledTimes(studentEmails.length);
            expect(emailService.sendInitialPasswordEmail).toHaveBeenCalledTimes(studentEmails.length);
            expect(StudentGroup.bulkCreate).toHaveBeenCalledTimes(1);
            expect(mockTransaction.commit).toHaveBeenCalledTimes(1); // Transaction should be committed
            expect(mockTransaction.rollback).not.toHaveBeenCalled();
            expect(Group.findByPk).toHaveBeenCalledTimes(1);
            expect(result).toHaveProperty('id', mockNewGroup.id);
            expect(result).toHaveProperty('createdStudents', studentEmails);
            expect(result).toHaveProperty('linkedStudents', []);
        });


    });





    // --- Test Suite for getGroupDetails ---

    describe.skip('getGroupDetails', () => {
        const groupId = 1;
        const teacherId = 4;
        const mockGroup = {
            id: groupId,
            name: 'Test Group',
            initDate: new Date(),
            endDate: null,
            userId: teacherId,
            toJSON: jest.fn(() => ({ // Mock toJSON
                id: groupId,
                name: 'Test Group',
                initDate: 'date',
                endDate: null,
                userId: teacherId,
                students: [], // Include relations in toJSON result structure
                accessibleWordles: [],
            })),
        };

        beforeEach(() => {
            Group.findOne.mockResolvedValue(mockGroup); // Default: Group is found
        });

        it('should return group details with students and accessible wordles', async () => {
            const result = await groupService.getGroupDetails(groupId, teacherId);

            expect(Group.findOne).toHaveBeenCalledTimes(1);
            expect(Group.findOne).toHaveBeenCalledWith({
                where: { id: groupId, userId: teacherId },
                include: [
                    { model: User, as: 'students', through: { attributes: [] }, attributes: ['id', 'name', 'email', 'role'] },
                    { model: Wordle, as: 'accessibleWordles', through: { attributes: [] }, attributes: ['id', 'name'] }
                ]
            });
            expect(mockGroup.toJSON).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockGroup.toJSON());
        });

        it('should return null if the group is not found', async () => {
            Group.findOne.mockResolvedValue(null);

            const result = await groupService.getGroupDetails(groupId, teacherId);

            expect(Group.findOne).toHaveBeenCalledTimes(1);
            expect(result).toBeNull();
        });

        it('should return null if the group is found but not created by the teacher', async () => {
            const mockOtherGroup = { id: groupId, userId: 99 };
            Group.findOne.mockResolvedValue(mockOtherGroup); // Mock finding a group with the ID but wrong user

            // In a real scenario, the `where` clause would prevent finding this.
            // We test the service logic assuming findOne might return something unexpected (though less likely with Sequelize).
            // A more precise unit test would verify the `where` clause itself is correct.
            // Let's test the case where findOne returns null because the where clause filtered it out.
            Group.findOne.mockResolvedValue(null); // Simulate findOne returning null due to where clause

            const result = await groupService.getGroupDetails(groupId, teacherId);

            expect(Group.findOne).toHaveBeenCalledTimes(1);
            expect(Group.findOne).toHaveBeenCalledWith({
                where: { id: groupId, userId: teacherId }, // Check the where clause is correct
                include: expect.any(Array) // Don't need to check includes in detail here
            });
            expect(result).toBeNull(); // Service should return null if findOne returns null
        });


        it('should throw an error if a database query fails', async () => {
            const dbError = new Error('DB error');
            Group.findOne.mockRejectedValue(dbError);

            await expect(groupService.getGroupDetails(groupId, teacherId)).rejects.toThrow('DB error');
            expect(Group.findOne).toHaveBeenCalledTimes(1);
        });
    });

    // --- Test Suite for updateGroup ---

    describe.skip('updateGroup', () => {
        const groupId = 1;
        const teacherId = 4;
        const updateData = {
            name: 'Updated Group Name',
            endDate: '2027-01-01',
            addStudentEmails: ['newstudent@example.com', 'existingstudent@example.com'],
            removeStudentIds: [10, 11],
        };

        const mockGroup = {
            id: groupId,
            name: 'Original Name',
            initDate: new Date('2025-01-01'),
            endDate: null,
            userId: teacherId,
            save: jest.fn(() => Promise.resolve()), // Mock save method
            addStudent: jest.fn(() => Promise.resolve()), // Mock addStudent
            removeStudents: jest.fn(() => Promise.resolve()), // Mock removeStudents
            hasStudent: jest.fn(), // Mock hasStudent
            getStudents: jest.fn(), // Mock getStudents
            toJSON: jest.fn(() => ({ // Mock toJSON for final fetch
                id: groupId,
                name: updateData.name,
                initDate: new Date('2025-01-01'), // Assuming initDate wasn't updated
                endDate: updateData.endDate,
                userId: teacherId,
                students: [],
                createdStudents: [],
                linkedStudents: [],
            })),
        };

        const mockNewStudent = {
            id: 20,
            email: updateData.addStudentEmails[0],
            role: 'student',
            name: 'New Student',
            toJSON: jest.fn(),
            getStudentGroups: jest.fn(),
            save: jest.fn(),
            destroy: jest.fn(),
        };
        const mockExistingStudent = {
            id: 21,
            email: updateData.addStudentEmails[1],
            role: 'student',
            name: 'Existing Student',
            toJSON: jest.fn(),
            getStudentGroups: jest.fn(),
            save: jest.fn(),
            destroy: jest.fn(),
        };

        // Mock sequelize transaction methods
        const mockTransaction = {
            commit: jest.fn(() => Promise.resolve()),
            rollback: jest.fn(() => Promise.resolve()),
        };
        sequelize.transaction.mockResolvedValue(mockTransaction);


        beforeEach(() => {
            Group.findOne.mockResolvedValue(mockGroup); // Default: Group found
            userService.findUserByEmail.mockResolvedValue(null); // Default: student email not found
            userService.createUser.mockResolvedValue(mockNewStudent); // Default: createUser returns new student
            mockGroup.hasStudent.mockResolvedValue(false); // Default: student not already in group
            userService.deleteStudentIfNoGroups.mockResolvedValue(false); // Default: student not deleted

            // Mock the final fetch after commit
            Group.findByPk.mockResolvedValue({
                ...mockGroup,
                toJSON: jest.fn(() => ({ // Mock toJSON for the final returned object
                    ...mockGroup.toJSON(),
                    students: [], // Simulate fetched students
                    accessibleWordles: [], // Simulate fetched wordles
                })),
            });
        });

        it('should update group details and manage students', async () => {
            // Configure mocks for student processing
            userService.findUserByEmail.mockResolvedValueOnce(null).mockResolvedValueOnce(mockExistingStudent); // newstudent not found, existingstudent found
            userService.createUser.mockResolvedValue(mockNewStudent); // newstudent is created
            mockGroup.hasStudent.mockResolvedValue(false); // neither student is already in group

            const result = await groupService.updateGroup(groupId, teacherId, updateData);

            // Assertions:
            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(Group.findOne).toHaveBeenCalledTimes(1);
            expect(Group.findOne).toHaveBeenCalledWith({
                where: { id: groupId, userId: teacherId },
                transaction: mockTransaction
            });

            // Check group details update
            expect(mockGroup.name).toBe(updateData.name);
            expect(mockGroup.endDate).toEqual(new Date(updateData.endDate)); // Dates should be Date objects
            expect(mockGroup.save).toHaveBeenCalledTimes(1);
            expect(mockGroup.save).toHaveBeenCalledWith({ transaction: mockTransaction });

            // Check addStudentEmails processing
            expect(userService.findUserByEmail).toHaveBeenCalledTimes(updateData.addStudentEmails.length);
            expect(userService.findUserByEmail).toHaveBeenCalledWith(updateData.addStudentEmails[0]);
            expect(userService.findUserByEmail).toHaveBeenCalledWith(updateData.addStudentEmails[1]);

            expect(userService.createUser).toHaveBeenCalledTimes(1); // Only called for newstudent
            expect(userService.createUser).toHaveBeenCalledWith(updateData.addStudentEmails[0], updateData.addStudentEmails[0].split('@')[0], expect.any(String), 'student', mockTransaction);
            expect(emailService.sendInitialPasswordEmail).toHaveBeenCalledTimes(1);
            expect(emailService.sendInitialPasswordEmail).toHaveBeenCalledWith(mockNewStudent.email, mockNewStudent.name, expect.any(String));


            expect(mockGroup.hasStudent).toHaveBeenCalledTimes(1); // Called for existingstudent
            expect(mockGroup.hasStudent).toHaveBeenCalledWith(mockExistingStudent, { transaction: mockTransaction });

            expect(mockGroup.addStudent).toHaveBeenCalledTimes(2); // Called for both students
            expect(mockGroup.addStudent).toHaveBeenCalledWith(mockNewStudent, { transaction: mockTransaction });
            expect(mockGroup.addStudent).toHaveBeenCalledWith(mockExistingStudent, { transaction: mockTransaction });

            // Check removeStudentIds processing
            expect(mockGroup.removeStudents).toHaveBeenCalledTimes(1);
            expect(mockGroup.removeStudents).toHaveBeenCalledWith(updateData.removeStudentIds, { transaction: mockTransaction });

            expect(userService.deleteStudentIfNoGroups).toHaveBeenCalledTimes(updateData.removeStudentIds.length);
            expect(userService.deleteStudentIfNoGroups).toHaveBeenCalledWith(updateData.removeStudentIds[0], mockTransaction);
            expect(userService.deleteStudentIfNoGroups).toHaveBeenCalledWith(updateData.removeStudentIds[1], mockTransaction);


            expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
            expect(mockTransaction.rollback).not.toHaveBeenCalled();

            expect(Group.findByPk).toHaveBeenCalledTimes(1); // Final fetch
            expect(result).toHaveProperty('id', mockGroup.id);
            expect(result).toHaveProperty('name', updateData.name);
            expect(result).toHaveProperty('endDate', updateData.endDate);
            // Check student processing summary in response (based on service implementation)
            expect(result).toHaveProperty('createdStudents', [updateData.addStudentEmails[0]]);
            expect(result).toHaveProperty('linkedStudents', [updateData.addStudentEmails[1]]);
        });

        it('should update only the name if only name is provided', async () => {
            const partialUpdateData = { name: 'Only Name Change' };

            const result = await groupService.updateGroup(groupId, teacherId, partialUpdateData);

            // Assertions:
            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(Group.findOne).toHaveBeenCalledTimes(1);

            // Check group details update
            expect(mockGroup.name).toBe(partialUpdateData.name);
            expect(mockGroup.initDate).toEqual(new Date('2025-01-01')); // Should not change
            expect(mockGroup.endDate).toBeNull(); // Should not change
            expect(mockGroup.save).toHaveBeenCalledTimes(1);
            expect(mockGroup.save).toHaveBeenCalledWith({ transaction: mockTransaction });

            // Check that student/group access methods were NOT called
            expect(userService.findUserByEmail).not.toHaveBeenCalled();
            expect(userService.createUser).not.toHaveBeenCalled();
            expect(emailService.sendInitialPasswordEmail).not.toHaveBeenCalled();
            expect(mockGroup.hasStudent).not.toHaveBeenCalled();
            expect(mockGroup.addStudent).not.toHaveBeenCalled();
            expect(mockGroup.removeStudents).not.toHaveBeenCalled();
            expect(userService.deleteStudentIfNoGroups).not.toHaveBeenCalled();

            expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
            expect(mockTransaction.rollback).not.toHaveBeenCalled();

            expect(Group.findByPk).toHaveBeenCalledTimes(1);
            expect(result).toHaveProperty('id', mockGroup.id);
            expect(result).toHaveProperty('name', partialUpdateData.name);
            // Check student processing summary in response (should be empty arrays)
            expect(result).toHaveProperty('createdStudents', []);
            expect(result).toHaveProperty('linkedStudents', []);
        });

        it('should return null if the group is not found', async () => {
            Group.findOne.mockResolvedValue(null);

            const result = await groupService.updateGroup(groupId, teacherId, updateData);

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(Group.findOne).toHaveBeenCalledTimes(1);
            expect(mockGroup.save).not.toHaveBeenCalled();
            expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
            expect(mockTransaction.commit).not.toHaveBeenCalled();
            expect(Group.findByPk).not.toHaveBeenCalled(); // Final fetch should not happen
            expect(result).toBeNull();
        });

        it('should return null if the group is found but not created by the teacher', async () => {
            const mockOtherGroup = { id: groupId, userId: 99 };
            Group.findOne.mockResolvedValue(null); // Simulate findOne returning null due to where clause

            const result = await groupService.updateGroup(groupId, teacherId, updateData);

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(Group.findOne).toHaveBeenCalledTimes(1);
            expect(mockGroup.save).not.toHaveBeenCalled();
            expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
            expect(mockTransaction.commit).not.toHaveBeenCalled();
            expect(Group.findByPk).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });


        it('should throw an error and rollback transaction if Group.findOne fails', async () => {
            const findError = new Error('DB find error');
            Group.findOne.mockRejectedValue(findError);

            await expect(groupService.updateGroup(groupId, teacherId, updateData)).rejects.toThrow('DB find error');

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(Group.findOne).toHaveBeenCalledTimes(1);
            expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
            expect(mockTransaction.commit).not.toHaveBeenCalled();
            expect(Group.findByPk).not.toHaveBeenCalled();
        });

        it('should throw an error and rollback transaction if group.save fails', async () => {
            const saveError = new Error('DB save error');
            mockGroup.save.mockRejectedValue(saveError);

            await expect(groupService.updateGroup(groupId, teacherId, updateData)).rejects.toThrow('DB save error');

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(Group.findOne).toHaveBeenCalledTimes(1);
            expect(mockGroup.save).toHaveBeenCalledTimes(1);
            expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
            expect(mockTransaction.commit).not.toHaveBeenCalled();
            expect(Group.findByPk).not.toHaveBeenCalled();
        });

        // Add more tests for errors during student processing (findUserByEmail, createUser, addStudent, removeStudents, deleteStudentIfNoGroups)
        // These tests would follow a similar pattern: mock the specific dependency to fail,
        // call the service function, and assert that the expected error is thrown and rollback happens.
        // Example:
        it('should throw an error and rollback transaction if adding a student fails', async () => {
            userService.findUserByEmail.mockResolvedValue(mockExistingStudent); // Student found
            mockGroup.hasStudent.mockResolvedValue(false); // Not already in group
            const addError = new Error('Add student failed');
            mockGroup.addStudent.mockRejectedValue(addError); // Simulate addStudent failure

            const updateDataWithError = { addStudentEmails: ['student@example.com'] };

            await expect(groupService.updateGroup(groupId, teacherId, updateDataWithError)).rejects.toThrow('Add student failed');

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(Group.findOne).toHaveBeenCalledTimes(1);
            expect(mockGroup.save).toHaveBeenCalledTimes(1); // Save might happen before this error
            expect(mockGroup.addStudent).toHaveBeenCalledTimes(1);
            expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
            expect(mockTransaction.commit).not.toHaveBeenCalled();
            expect(Group.findByPk).not.toHaveBeenCalled();
        });

        it('should throw an error and rollback transaction if removing students fails', async () => {
            const removeError = new Error('Remove students failed');
            mockGroup.removeStudents.mockRejectedValue(removeError); // Simulate removeStudents failure

            const updateDataWithError = { removeStudentIds: [10, 11] };

            await expect(groupService.updateGroup(groupId, teacherId, updateDataWithError)).rejects.toThrow('Remove students failed');

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(Group.findOne).toHaveBeenCalledTimes(1);
            expect(mockGroup.save).toHaveBeenCalledTimes(1); // Save might happen before this error
            expect(mockGroup.removeStudents).toHaveBeenCalledTimes(1);
            expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
            expect(mockTransaction.commit).not.toHaveBeenCalled();
            expect(Group.findByPk).not.toHaveBeenCalled();
            expect(userService.deleteStudentIfNoGroups).not.toHaveBeenCalled(); // deleteStudentIfNoGroups should not be called
        });

        it('should not throw an error if emailService.sendInitialPasswordEmail fails (non-blocking)', async () => {
            userService.findUserByEmail.mockResolvedValue(null); // Student not found
            userService.createUser.mockResolvedValue(mockNewStudent); // Create student succeeds
            mockGroup.addStudent.mockResolvedValue(true); // Add student succeeds
            emailService.sendInitialPasswordEmail.mockRejectedValue(new Error('Email send failed')); // Simulate email failure

            const updateDataWithError = { addStudentEmails: ['newstudent@example.com'] };

            const result = await groupService.updateGroup(groupId, teacherId, updateDataWithError);

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(Group.findOne).toHaveBeenCalledTimes(1);
            expect(mockGroup.save).toHaveBeenCalledTimes(1);
            expect(userService.findUserByEmail).toHaveBeenCalledTimes(1);
            expect(userService.createUser).toHaveBeenCalledTimes(1);
            expect(mockGroup.addStudent).toHaveBeenCalledTimes(1);
            expect(emailService.sendInitialPasswordEmail).toHaveBeenCalledTimes(1);
            expect(mockTransaction.commit).toHaveBeenCalledTimes(1); // Transaction should commit
            expect(mockTransaction.rollback).not.toHaveBeenCalled();
            expect(Group.findByPk).toHaveBeenCalledTimes(1);
            expect(result).toHaveProperty('createdStudents', [updateDataWithError.addStudentEmails[0]]);
            expect(result).toHaveProperty('linkedStudents', []);
        });
    });

    // --- Test Suite for deleteGroup ---

    describe.skip('deleteGroup', () => {
        const groupId = 1;
        const teacherId = 4;

        const mockGroup = {
            id: groupId,
            userId: teacherId,
            destroy: jest.fn(() => Promise.resolve()), // Mock destroy method
            getStudents: jest.fn(() => Promise.resolve([])), // Mock getStudents, default empty array
        };

        const mockStudent1 = { id: 10, name: 'Student 1', email: 's1@example.com' };
        const mockStudent2 = { id: 11, name: 'Student 2', email: 's2@example.com' };

        // Mock sequelize transaction methods
        const mockTransaction = {
            commit: jest.fn(() => Promise.resolve()),
            rollback: jest.fn(() => Promise.resolve()),
        };
        sequelize.transaction.mockResolvedValue(mockTransaction);


        beforeEach(() => {
            Group.findOne.mockResolvedValue(mockGroup); // Default: Group found
            userService.deleteStudentIfNoGroups.mockResolvedValue(false); // Default: student not deleted
        });

        it('should delete the group and check students for deletion if no groups remain', async () => {
            // Configure getStudents to return a list of students
            mockGroup.getStudents.mockResolvedValue([mockStudent1, mockStudent2]);
            // Configure deleteStudentIfNoGroups to return true for student1 (deleted) and false for student2 (not deleted)
            userService.deleteStudentIfNoGroups.mockResolvedValueOnce(true).mockResolvedValueOnce(false);


            const isDeleted = await groupService.deleteGroup(groupId, teacherId);

            // Assertions:
            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(Group.findOne).toHaveBeenCalledTimes(1);
            expect(Group.findOne).toHaveBeenCalledWith({
                where: { id: groupId, userId: teacherId },
                transaction: mockTransaction
            });

            expect(mockGroup.getStudents).toHaveBeenCalledTimes(1);
            expect(mockGroup.getStudents).toHaveBeenCalledWith({
                attributes: ['id'],
                through: { attributes: [] },
                transaction: mockTransaction
            });

            expect(mockGroup.destroy).toHaveBeenCalledTimes(1);
            expect(mockGroup.destroy).toHaveBeenCalledWith({ transaction: mockTransaction });

            expect(userService.deleteStudentIfNoGroups).toHaveBeenCalledTimes(2);
            expect(userService.deleteStudentIfNoGroups).toHaveBeenCalledWith(mockStudent1.id, mockTransaction);
            expect(userService.deleteStudentIfNoGroups).toHaveBeenCalledWith(mockStudent2.id, mockTransaction);

            expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
            expect(mockTransaction.rollback).not.toHaveBeenCalled();
            expect(isDeleted).toBe(true);
        });

        it('should delete the group even if there are no students in it', async () => {
            // Configure getStudents to return an empty array
            mockGroup.getStudents.mockResolvedValue([]);

            const isDeleted = await groupService.deleteGroup(groupId, teacherId);

            // Assertions:
            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(Group.findOne).toHaveBeenCalledTimes(1);
            expect(mockGroup.getStudents).toHaveBeenCalledTimes(1); // Still called to get the list (which is empty)
            expect(mockGroup.destroy).toHaveBeenCalledTimes(1);
            expect(userService.deleteStudentIfNoGroups).not.toHaveBeenCalled(); // Should not be called if no students
            expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
            expect(mockTransaction.rollback).not.toHaveBeenCalled();
            expect(isDeleted).toBe(true);
        });


        it('should return false if the group is not found', async () => {
            Group.findOne.mockResolvedValue(null);

            const isDeleted = await groupService.deleteGroup(groupId, teacherId);

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(Group.findOne).toHaveBeenCalledTimes(1);
            expect(mockGroup.getStudents).not.toHaveBeenCalled();
            expect(mockGroup.destroy).not.toHaveBeenCalled();
            expect(userService.deleteStudentIfNoGroups).not.toHaveBeenCalled();
            expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
            expect(mockTransaction.commit).not.toHaveBeenCalled();
            expect(isDeleted).toBe(false);
        });

        it('should return false if the group is found but not created by the teacher', async () => {
            const mockOtherGroup = { id: groupId, userId: 99 };
            Group.findOne.mockResolvedValue(null); // Simulate findOne returning null due to where clause

            const isDeleted = await groupService.deleteGroup(groupId, teacherId);

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(Group.findOne).toHaveBeenCalledTimes(1);
            expect(mockGroup.getStudents).not.toHaveBeenCalled();
            expect(mockGroup.destroy).not.toHaveBeenCalled();
            expect(userService.deleteStudentIfNoGroups).not.toHaveBeenCalled();
            expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
            expect(mockTransaction.commit).not.toHaveBeenCalled();
            expect(isDeleted).toBe(false);
        });


        it('should throw an error and rollback transaction if Group.findOne fails', async () => {
            const findError = new Error('DB find error');
            Group.findOne.mockRejectedValue(findError);

            await expect(groupService.deleteGroup(groupId, teacherId)).rejects.toThrow('DB find error');

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(Group.findOne).toHaveBeenCalledTimes(1);
            expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
            expect(mockTransaction.commit).not.toHaveBeenCalled();
            expect(mockGroup.getStudents).not.toHaveBeenCalled();
            expect(mockGroup.destroy).not.toHaveBeenCalled();
            expect(userService.deleteStudentIfNoGroups).not.toHaveBeenCalled();
        });

        it('should throw an error and rollback transaction if getStudents fails', async () => {
            const getStudentsError = new Error('Get students error');
            mockGroup.getStudents.mockRejectedValue(getStudentsError);

            await expect(groupService.deleteGroup(groupId, teacherId)).rejects.toThrow('Get students error');

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(Group.findOne).toHaveBeenCalledTimes(1);
            expect(mockGroup.getStudents).toHaveBeenCalledTimes(1);
            expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
            expect(mockTransaction.commit).not.toHaveBeenCalled();
            expect(mockGroup.destroy).not.toHaveBeenCalled();
            expect(userService.deleteStudentIfNoGroups).not.toHaveBeenCalled();
        });


        it('should throw an error and rollback transaction if group.destroy fails', async () => {
            const destroyError = new Error('DB destroy error');
            mockGroup.destroy.mockRejectedValue(destroyError);

            await expect(groupService.deleteGroup(groupId, teacherId)).rejects.toThrow('DB destroy error');

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(Group.findOne).toHaveBeenCalledTimes(1);
            expect(mockGroup.getStudents).toHaveBeenCalledTimes(1);
            expect(mockGroup.destroy).toHaveBeenCalledTimes(1);
            expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
            expect(mockTransaction.commit).not.toHaveBeenCalled();
            expect(userService.deleteStudentIfNoGroups).not.toHaveBeenCalled(); // Should not be called after destroy fails
        });

        it('should throw an error and rollback transaction if deleteStudentIfNoGroups fails for any student', async () => {
            mockGroup.getStudents.mockResolvedValue([mockStudent1, mockStudent2]);
            const deleteStudentError = new Error('Delete student failed');
            userService.deleteStudentIfNoGroups.mockRejectedValue(deleteStudentError); // Simulate failure for all students

            await expect(groupService.deleteGroup(groupId, teacherId)).rejects.toThrow('Delete student failed');

            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
            expect(Group.findOne).toHaveBeenCalledTimes(1);
            expect(mockGroup.getStudents).toHaveBeenCalledTimes(1);
            expect(mockGroup.destroy).toHaveBeenCalledTimes(1); // Group is deleted before checking students
            expect(userService.deleteStudentIfNoGroups).toHaveBeenCalledTimes(1); // Called at least once before error
            expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
            expect(mockTransaction.commit).not.toHaveBeenCalled();
        });
    });

});
