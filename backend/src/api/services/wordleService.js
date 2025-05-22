// src/api/services/wordleService.js
const { GameResult, User, Group, Wordle, Word, Question, StudentGroup, WordleGroup } = require('../models');
const { Op } = require('sequelize');
const userService = require('./userService'); // Import userService
const sequelize = require('../../config/database'); // Import sequelize for transactions


// Define custom errors for authorization failures
class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
        this.statusCode = 404;
    }
}

class ForbiddenError extends Error {
     constructor(message) {
        super(message);
        this.name = 'ForbiddenError';
        this.statusCode = 403; 
    }
}




// --- Helper Functions for Teacher Authorization ---
// These functions check relationships for authorization purposes
const isStudentInTeacherGroup = async (studentId, teacherId) => {
    try {
        // Find the student user
        const studentUser = await User.findByPk(studentId, {
            attributes: ['id', 'role'], 
        });

        if (!studentUser || studentUser.role !== 'student') { // Ensure it's a student
            return false;
        }

        // Find groups created by the teacher that this student is in
        const groups = await studentUser.getStudentGroups({
            where: {
                userId: teacherId // Filter groups by the teacher's ID (creator)
            },
            through: { attributes: [] }, // Don't fetch join table attributes
            attributes: ['id'] // Only need group IDs
        });

        // If any group is found, the student is in a group created by this teacher
        return groups && groups.length > 0;

    } catch (error) {
        console.debug('Error in isStudentInTeacherGroup:', error);
        throw error;
    }
};

const isWordleCreatedByTeacher = async (wordleId, teacherId) => {
    try {
        // Find the wordle and check if its creator matches the teacherId
        const wordle = await Wordle.findOne({
            where: {
                id: wordleId,
                userId: teacherId // Check if the wordle's creator is this teacher
            },
            attributes: ['id'] // Only need ID
        });

        // If a wordle is found, it was created by this teacher
        return wordle !== null;

    } catch (error) {
        console.debug('Error in isWordleCreatedByTeacher:', error);
        throw error;
    }
};

const isGroupCreatedByTeacher = async (groupId, teacherId) => {
     try {
        // Find the group and check if its creator matches the teacherId
        const group = await Group.findOne({
            where: {
                id: groupId,
                userId: teacherId // Check if the group's creator is this teacher
            },
            attributes: ['id'] // Only need ID
        });

        // If a group is found, it was created by this teacher
        return group !== null;

    } catch (error) {
        console.debug('Error in isGroupCreatedByTeacher:', error);
        throw error;
    }
};


// --- Student Functions ---

// Function to get wordles accessible to a specific student user (already implemented)
const getAccessibleWordlesForStudent = async (userId) => {
    try {
        const studentUser = await User.findByPk(userId, {
            attributes: ['id', 'role'],
            include: {
                model: Group,
                as: 'studentGroups',
                through: { attributes: [] },
                where: {
                    initDate: { [Op.lte]: new Date() },
                    [Op.or]: [
                        { endDate: null },
                        { endDate: { [Op.gte]: new Date() } }
                    ]
                },
                attributes: ['id'],
                include: {
                    model: Wordle,
                    as: 'accessibleWordles',
                    through: { attributes: [] },
                    attributes: ['id', 'name'],
                    include: {
                        model: Word,
                        as: 'word',
                        attributes: ['word', 'hint']
                    }
                }
            }
        });

        if (!studentUser|| studentUser.role !== 'student') {
            return [];
        }

        const accessibleWordles = studentUser.studentGroups.reduce((wordles, group) => {
            group.accessibleWordles.forEach(wordle => {
                if (!wordles.some(w => w.id === wordle.id)) {
                    wordles.push(wordle.toJSON());
                }
            });
            return wordles;
        }, []);

        return accessibleWordles;

    } catch (error) {
        console.debug('Error in getAccessibleWordlesForStudent:', error);
        throw error;
    }
};

// Function to get game data (word and questions) for a specific wordle (already implemented)
const getWordleDataForGame = async (wordleId, studentId) => {
    try {

        const hasAccess = await checkStudentAccess(studentId, wordleId);
        if(!hasAccess) {
            throw new ForbiddenError('Student does not have access to this wordle');
        }
        
        const wordle = await Wordle.findByPk(wordleId, {
            attributes: ['id', 'name'],
            include: [
                {
                    model: Word,
                    as: 'word',
                    attributes: ['word', 'hint']
                },
                {
                    model: Question,
                    as: 'questions',
                    attributes: ['id', 'question', 'options', 'correctAnswer', 'type']
                }
            ]
        });

        if(!wordle) {
            throw new NotFoundError('Wordle not found');
        }

        constwordleJson = wordle.toJSON();
        if(wordleJson.questions){
            wordleJson.questions = wordleJson.questions.map(q => ({
                ...q,
                options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
                correctAnswer: typeof q.correctAnswer === 'string' ? JSON.parse(q.correctAnswer) : q.correctAnswer,
           }));
        }
        // Convert options and correctAnswer to JSON objects if they are strings
        return wordleJson;

    } catch (error) {
        console.debug('Error in getWordleDataForGame:', error);
        throw error;
    }
};

// Function to check if a specific student user has access to a specific wordle (already implemented)
const checkStudentAccess = async (userId, wordleId) => {
    try {
        const accessEntry = await WordleGroup.findOne({
            where: { wordleId: wordleId },
            include: {
                model: Group,
                as: 'group', // Alias defined in models/index.js for WordleGroup -> Group
                where: { // Filter groups by active date range
                    initDate: { [Op.lte]: new Date() },
                    [Op.or]: [
                        { endDate: null },
                        { endDate: { [Op.gte]: new Date() } }
                    ]
                },
                include: {
                    model: StudentGroup,
                    as: 'studentGroup', // Alias defined in models/index.js for Group -> StudentGroup
                    where: { userId: userId } // Check if this student is in the group
                }
            }
        });

        return accessEntry && accessEntry.group && accessEntry.group.studentGroup !== null;

    } catch (error) {
        console.debug('Error in checkStudentAccess:', error);
        throw error;
    }
};


// --- Teacher Functions ---

// Function to create a new wordle (Teacher functionality)
const createWordle = async (teacherId, wordleData) => {
    const transaction = await sequelize.transaction(); // Start a transaction

    try {

        // --- DEBUGGING LOGS ---
        console.log('DEBUG wordleService.createWordle: Start.');
        console.log('DEBUG wordleService.createWordle: Received teacherId parameter:', teacherId);
        console.log('DEBUG wordleService.createWordle: Type of teacherId parameter:', typeof teacherId);
        console.log('DEBUG wordleService.createWordle: Received wordleData:', JSON.stringify(wordleData)); 
        // --- END DEBUGGING LOGS ---


        // 1. Verify the teacher exists and has the 'teacher' role 
        const teacher = await userService.getUserById(teacherId);

        // --- DEBUGGING LOG ---
        console.log('DEBUG wordleService.createWordle: Found teacher:', teacher ? teacher.id : null);
        // --- END DEBUGGING LOG ---

        if (!teacher || teacher.role !== 'teacher') {
            await transaction.rollback();
            throw new Error('User not found or not authorized to create wordles');
        }

        // 2. Create the Wordle
        const newWordle = await Wordle.create({
            name: wordleData.name, 
            userId: teacherId,
            difficulty: wordleData.difficulty 
        }, { transaction });

        // --- DEBUGGING LOG ---
        console.log('DEBUG wordleService.createWordle: Wordle created with ID:', newWordle.id);
        // --- END DEBUGGING LOG ---


        // 3. Create the main Word for the Wordle
        if (!wordleData.word || !wordleData.word.title) {
            await transaction.rollback();
            throw new Error('Word details (title) are required');
        }
        await Word.create({
            word: wordleData.word.title, 
            hint: wordleData.word.hint || null, 
            wordleId: newWordle.id // Link the word to the wordle 
        }, { transaction });

        // 4. Create Questions for the Wordle
        if (!wordleData.questions || wordleData.questions.length === 0) {
            await transaction.rollback();
            throw new Error('At least one question is required for the wordle');
        }
        const questionEntries = wordleData.questions.map(q => ({
            question: q.statement, // Map to DB column name
            options: q.options ? JSON.stringify(q.options) : null, // Store options as JSON string
            correctAnswer: JSON.stringify(q.answer), // Store answer as JSON string
            type: q.type, // Map to DB column name
            wordleId: newWordle.id // Link the question to the wordle (using DB column name)
        }));
        await Question.bulkCreate(questionEntries, { transaction });

        // 5. Link Group Access
        if (wordleData.groupAccessIds && wordleData.groupAccessIds.length > 0) {
            // Verify that the teacher owns these groups (Important security check)
            const teacherGroups = await Group.findAll({
                where: {
                    id: { [Op.in]: wordleData.groupAccessIds },
                    userId: teacherId // Ensure the groups belong to this teacher
                },
                attributes: ['id'], // Only need IDs for verification
                transaction
            });

            const ownedGroupIds = teacherGroups.map(group => group.id);
            const requestedGroupIds = new Set(wordleData.groupAccessIds);

            // Check if the teacher requested access to any group they don't own
            const unauthorizedGroupIds = Array.from(requestedGroupIds).filter(id => !ownedGroupIds.includes(id));

            if (unauthorizedGroupIds.length > 0) {
                await transaction.rollback();
                throw new Error(`Cannot grant access to groups not owned by the teacher: ${unauthorizedGroupIds.join(', ')}`);
            }


            const wordleGroupEntries = ownedGroupIds.map(groupId => ({
                wordleId: newWordle.id, 
                groupId: groupId 
            }));
            await WordleGroup.bulkCreate(wordleGroupEntries, { transaction, ignore: true });
        }

        await transaction.commit(); // Commit the transaction

        // Return the created wordle details (fetch again to include relations if needed)
        const createdWordleDetails = await Wordle.findByPk(newWordle.id, {
            include: [
               { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
               { model: Word, as: 'word', attributes: ['word', 'hint'] },
               { model: Question, as: 'questions', attributes: ['id', 'question', 'options', 'correctAnswer', 'type'] },
               { model: Group, as: 'groupsWithAccess', attributes: ['id', 'name'], through: { attributes: [] } }
            ],
            // No transaction needed for this final fetch after commit
       });

        return createdWordleDetails.toJSON();

    } catch (error) {
        await transaction.rollback(); // Rollback transaction on error
        console.debug('Error creating wordle:', error);
        throw error;
    }
};

// Function to get wordles created by a teacher
const getWordlesByTeacher = async (teacherId) => {
    try {
        // Verify the teacher exists and has the 'teacher' role (Optional but good practice)
        const teacher = await userService.getUserById(teacherId);
        if (!teacher || teacher.role !== 'teacher') {
            throw new Error('User not found or not authorized to view wordles');
        }

        const wordles = await Wordle.findAll({
            where: {
                userId: teacherId // Filter by the teacher who created the wordle
            },
            attributes: ['id', 'name'], // Select necessary attributes
            include: { // Include the main word for the list view
                model: Word,
                as: 'word', // Alias for Wordle -> Word 1:1 relationship
                attributes: ['word'] // Only need the word title for the list
            }
        });

        return wordles.map(wordle => wordle.toJSON());

    } catch (error) {
        console.debug('Error getting wordles by teacher:', error);
        throw error;
    }
};

// Function to get details of a specific wordle (Teacher functionality)
const getWordleDetails = async (wordleId, teacherId) => {
    try {
        // Find the wordle and verify it belongs to the teacher
        const wordle = await Wordle.findOne({
            where: {
                id: wordleId,
                userId: teacherId // Ensure the wordle is created by this teacher
            },
            include: [
                {
                    model: Word,
                    as: 'word', // Alias for the 1:1 relationship
                    attributes: ['id', 'word', 'hint'] // Include word details
                },
                {
                    model: Question,
                    as: 'questions', // Alias for the 1:N relationship
                    attributes: ['id', 'question', 'options', 'correctAnswer', 'type'] // Include question details
                },
                {
                    model: Group,
                    as: 'groupsWithAccess', // Alias for Wordle -> Group N:M relationship
                    through: { attributes: [] },
                    attributes: ['id', 'name'] // Include group details
                }
            ]
        });

        // Return wordle details or null if not found or access denied
        return wordle ? wordle.toJSON() : null;

    } catch (error) {
        console.debug('Error getting wordle details:', error);
        throw error;
    }
};

// Function to update a specific wordle (Teacher functionality)
const updateWordle = async (wordleId, teacherId, updateData) => {
    const transaction = await sequelize.transaction(); // Start a transaction

    try {
        // 1. Find the wordle and verify it belongs to the teacher
        const wordle = await Wordle.findOne({
            where: {
                id: wordleId,
                userId: teacherId // Ensure the wordle is created by this teacher
            },
            transaction
        });

        if (!wordle) {
            await transaction.rollback();
            return null; // Wordle not found or access denied
        }

        // 2. Update wordle basic details
        if (updateData.name !== undefined) wordle.name = updateData.name;
        await wordle.save({ transaction });

        // 3. Update or create the main Word
        if (updateData.word !== undefined) {
            // Assuming a word always exists for a wordle, find and update it
            const word = await Word.findOne({ where: { wordleId: wordleId }, transaction });
            if (word) {
                if (updateData.word.title !== undefined) word.word = updateData.word.title;
                if (updateData.word.hint !== undefined) word.hint = updateData.word.hint;
                await word.save({ transaction });
            } else {
                // Should not happen if wordle creation works correctly, but handle defensively
                console.warn(`Word not found for wordle ${wordleId}. Creating a new one.`);
                await Word.create({
                    word: updateData.word.title || 'default', // Provide a default if title is missing
                    hint: updateData.word.hint || null,
                    wordleId: wordleId
                }, { transaction });
            }
        }

        // 4. Manage Questions (update, create, delete)
        if (updateData.questions !== undefined) {
            // Get current questions for this wordle
            const currentQuestions = await Question.findAll({ where: { wordleId: wordleId }, transaction });
            const currentQuestionIds = new Set(currentQuestions.map(q => q.id));
            const updatedQuestionIds = new Set(updateData.questions.map(q => q.id).filter(id => id !== undefined));

            // Determine questions to delete (exist currently but not in update data)
            const questionsToDelete = currentQuestions.filter(q => !updatedQuestionIds.has(q.id));
            if (questionsToDelete.length > 0) {
                const deleteIds = questionsToDelete.map(q => q.id);
                await Question.destroy({ where: { id: { [Op.in]: deleteIds } }, transaction });
            }

            // Process questions to update or create
            for (const q of updateData.questions) {
                if (q.id !== undefined && currentQuestionIds.has(q.id)) {
                    // Update existing question
                    const questionToUpdate = currentQuestions.find(cq => cq.id === q.id);
                    if (questionToUpdate) {
                        if (q.type !== undefined) questionToUpdate.type = q.type;
                        if (q.statement !== undefined) questionToUpdate.statement = q.statement;
                        if (q.answer !== undefined) questionToUpdate.correctAnswer = JSON.stringify(q.answer); // Ensure JSON string
                        if (q.options !== undefined) questionToUpdate.options = JSON.stringify(q.options); // Ensure JSON string
                        await questionToUpdate.save({ transaction });
                    }
                } else {
                    // Create new question
                    await Question.create({
                        question: q.statement,
                        options: q.options ? JSON.stringify(q.options) : null,
                        correctAnswer: JSON.stringify(q.answer),
                        type: q.type,
                        wordleId: wordleId
                    }, { transaction });
                }
            }
        }

        // 5. Manage Group Access Links
        if (updateData.groupAccessIds !== undefined) {
            // Verify that the teacher owns these groups (Important security check)
            const teacherGroups = await Group.findAll({
                where: {
                    id: { [Op.in]: updateData.groupAccessIds },
                    userId: teacherId // Ensure the groups belong to this teacher
                },
                attributes: ['id'], // Only need IDs for verification
                transaction
            });

            const ownedGroupIds = teacherGroups.map(group => group.id);
            const requestedGroupIds = new Set(updateData.groupAccessIds);

            // Check if the teacher requested access to any group they don't own
            const unauthorizedGroupIds = Array.from(requestedGroupIds).filter(id => !ownedGroupIds.includes(id));

            if (unauthorizedGroupIds.length > 0) {
                await transaction.rollback();
                throw new Error(`Cannot grant access to groups not owned by the teacher: ${unauthorizedGroupIds.join(', ')}`);
            }

            // Remove existing links for this wordle
            await WordleGroup.destroy({ where: { wordleId: wordleId }, transaction });

            // Create new links for the owned groups
            if (ownedGroupIds.length > 0) {
                const wordleGroupEntries = ownedGroupIds.map(groupId => ({
                    wordleId: wordleId,
                    groupId: groupId
                }));
                await WordleGroup.bulkCreate(wordleGroupEntries, { transaction, ignore: true }); // ignore: true might not be needed after deleting all
            }
        }

        if (updateData.difficulty !== undefined) {
            wordle.difficulty = updateData.difficulty;
            await wordle.save({ transaction });
        }

        await transaction.commit(); // Commit the transaction

        // Fetch the updated wordle again to include related data for the response
        const updatedWordleWithDetails = await getWordleDetails(wordleId, teacherId); // Reuse getWordleDetails

        return updatedWordleWithDetails;


    } catch (error) {
        await transaction.rollback(); // Rollback transaction on error
        console.debug('Error updating wordle:', error);
        throw error;
    }
};

// Function to delete a specific wordle (Teacher functionality)
const deleteWordle = async (wordleId, teacherId) => {
    const transaction = await sequelize.transaction(); // Start a transaction

    try {
        // 1. Find the wordle and verify it belongs to the teacher
        const wordle = await Wordle.findOne({
            where: {
                id: wordleId,
                userId: teacherId // Ensure the wordle is created by this teacher
            },
            transaction
        });

        if (!wordle) {
            await transaction.rollback();
            return false; // Wordle not found or access denied
        }

        // 2. Delete the wordle
        // Sequelize should handle cascading deletes for associations defined with ON DELETE CASCADE
        // If not using ON DELETE CASCADE in DB for Word, Question, WordleGroup, GameResult,
        // you might need to manually delete related entries first.
        // Your SQL scripts had ON DELETE CASCADE for questions, words, wordle_groups.
        // GameResult (partidas) might also need ON DELETE CASCADE from wordles.
        // Assuming ON DELETE CASCADE is set up correctly in the DB:
        await wordle.destroy({ transaction }); // Delete the wordle

        await transaction.commit(); // Commit the transaction
        return true; // Indicate successful deletion

    } catch (error) {
        await transaction.rollback(); // Rollback transaction on error
        console.debug('Error deleting wordle:', error);
        throw error;
    }
};


module.exports = {
    getAccessibleWordlesForStudent,
    getWordleDataForGame,
    checkStudentAccess,
    createWordle,
    getWordlesByTeacher,
    getWordleDetails,
    updateWordle,
    deleteWordle,
};
