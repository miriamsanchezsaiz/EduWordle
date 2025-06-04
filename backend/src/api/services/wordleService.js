// src/api/services/wordleService.js
const { User, Group, Wordle, Word, Question, StudentGroup, WordleGroup } = require('../models');
const { Op } = require('sequelize');
const userService = require('./userService'); 
const sequelize = require('../../config/database'); 
const ApiError = require('../../utils/ApiError');


// --- Helper Functions for Teacher Authorization ---
// These functions check relationships for authorization purposes
const isStudentInTeacherGroup = async (studentId, teacherId) => {
    try {
        // Find the student user
        const studentUser = await User.findByPk(studentId, {
            attributes: ['id', 'role'],
        });

        if (!studentUser || studentUser.role !== 'student') { 
            return false;
        }

        // Find groups created by the teacher that this student is in
        const groups = await studentUser.getGroups({
            where: {
                userId: teacherId 
            },
            through: { attributes: [] }, 
            attributes: ['id'] 
        });

        return groups && groups.length > 0;

    } catch (error) {
        console.debug('Error in isStudentInTeacherGroup:', error);
        if (error instanceof ApiError) {
            throw error;
        } else {
            throw ApiError.internal('An unexpected error occurred while checking student group membership.');
        }
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

// CHECKED: Function to get wordles accessible to a specific student user (already implemented)
const getAccessibleWordlesForStudent = async (userId) => {
    try {
        const studentUser = await User.findByPk(userId, {
            attributes: ['id', 'role'],
            include: [{
                model: Group,
                as: 'groups',
                through: { attributes: [] },
                where: {
                    initDate: { [Op.lte]: new Date() },
                    [Op.or]: [
                        { endDate: null },
                        { endDate: { [Op.gte]: new Date() } }
                    ]
                },
                attributes: ['id', 'name'],
                include: [{
                    model: Wordle,
                    as: 'accessibleWordles',
                    through: { attributes: [] },
                    attributes: ['id', 'name', 'difficulty'],
                    include: [{
                        model: Word,
                        as: 'words',
                        attributes: ['word', 'hint']
                    }]
                }]
            }]
        });

        if (!studentUser) {
            throw ApiError.notFound('User not found');
            return [];
        }
         if ( studentUser.role !== 'student') {
            throw ApiError.unauthorized('User not authorized to access wordles.');
            return [];
        }

        const accessibleWordles = studentUser.groups.reduce((wordles, group) => {
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
        if (error instanceof ApiError) {
            throw error;
        } else {
            throw ApiError.internal('An unexpected error occurred while getting accessible wordles for student.');
        }
    }
};

// CHECKED: Function to get game data (word and questions) for a specific wordle (already implemented)
const getWordleDataForGame = async (wordleId, studentId) => {
    try {

        const hasAccess = await checkStudentAccess(studentId, wordleId);
        if (!hasAccess) {
            throw ApiError.unauthorized('Student does not have access to this wordle');
        }

        const wordle = await Wordle.findByPk(wordleId, {
            attributes: ['id', 'name', 'difficulty'],
            include: [
                {
                    model: Word,
                    as: 'words',
                    attributes: ['word', 'hint']
                },
                {
                    model: Question,
                    as: 'questions',
                    attributes: ['id', 'question', 'options', 'correctAnswer', 'type']
                }
            ]
        });

        if (!wordle) {
            throw ApiError.notFound('Wordle not found');
        }

        const wordleJson = wordle.toJSON();

        if (wordleJson.questions) {
            wordleJson.questions = wordleJson.questions.map(q => {
                let parsedOptions = q.options;
                let parsedCorrectAnswer = q.correctAnswer;

                // Solo parseamos si es una cadena JSON
                try {
                    if (typeof q.options === 'string') {

                        if (q.options.startsWith('[') || q.options.startsWith('{') || (q.options.startsWith('"') && q.options.endsWith('"'))) {
                            parsedOptions = JSON.parse(q.options);
                        }

                    }
                } catch (e) {
                    console.warn(`[getWordleDataForGame] Error parsing options for question ${q.id}:`, q.options, e);
                    throw ApiError.internal(`Error parsing options for question ${q.id}. Please check the data format.`);
                }

                try {
                    if (typeof q.correctAnswer === 'string') {

                        if (q.correctAnswer.startsWith('[') || q.correctAnswer.startsWith('{') || (q.correctAnswer.startsWith('"') && q.correctAnswer.endsWith('"'))) {
                            parsedCorrectAnswer = JSON.parse(q.correctAnswer);
                        }
                    }
                } catch (e) {
                    console.warn(`[getWordleDataForGame] Error parsing correctAnswer for question ${q.id}:`, q.correctAnswer, e);
                    throw ApiError.internal(`Error parsing correctAnswer for question ${q.id}. Please check the data format.`);
                }


                return {
                    ...q,
                    options: parsedOptions,
                    correctAnswer: parsedCorrectAnswer,
                };
            });
        }
        return wordleJson;

    } catch (error) {
        console.debug('Error in getWordleDataForGame:', error);
        if (error instanceof ApiError) {
            throw error;
        } else {
            throw ApiError.internal('An unexpected error occurred while getting wordle data for game.');
        }
    }
};

// CHECKED: Function to check if a specific student user has access to a specific wordle (already implemented)
const checkStudentAccess = async (userId, wordleId) => {
    try {

        const student = await User.findByPk(userId, {
            attributes: ['id'],
            include: [{
                model: Group,
                as: 'groups',
                through: { attributes: [] },
                where: {
                    initDate: { [Op.lte]: new Date() },
                    [Op.or]: [
                        { endDate: null },
                        { endDate: { [Op.gte]: new Date() } }
                    ]
                },
                attributes: ['id'],
                required: true,
                include: [{
                    model: Wordle,
                    as: 'accessibleWordles',
                    through: { attributes: [] },
                    where: {
                        id: wordleId
                    },
                    attributes: ['id'],
                    required: true
                }]
            }]
        });

        const hasAccess = student && student.groups && student.groups.length > 0;

        return hasAccess;

    } catch (error) {
        console.error('Error in checkStudentAccess:', error);
        if (error instanceof ApiError) {
            throw error;
        } else {
            throw ApiError.internal('An unexpected error occurred while checking Student Access to a Wordle.');
        }
    }
};


// --- Teacher Functions ---

// CHECKED: Function to create a new wordle (Teacher functionality)
const createWordle = async (teacherId, wordleData) => {
    const transaction = await sequelize.transaction();

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

        if (!teacher ) {
            await transaction.rollback();
            throw ApiError.notFound('User not found.');
        }
        if (teacher.role !== 'teacher') {
            await transaction.rollback();
            throw ApiError.unauthorized('User not authorized to create wordles');
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
        if (!wordleData.words || wordleData.words.length === 0) {
            await transaction.rollback();
            throw ApiError.badRequest('At least one word is required');
        }
        const wordEntries = wordleData.words.map(w => ({
            word: w.word || w.title,
            hint: w.hint || null,
            wordleId: newWordle.id
        }));
        await Word.bulkCreate(wordEntries, { transaction });


        // 4. Create Questions for the Wordle
        if (!wordleData.questions || wordleData.questions.length === 0) {
            await transaction.rollback();
            throw ApiError.badRequest('At least one question is required for the wordle.');
        }
        const questionEntries = wordleData.questions.map(q => ({
            question: q.statement,
            options: q.options ? JSON.stringify(q.options) : null,
            correctAnswer: JSON.stringify(q.answer),
            type: q.type,
            wordleId: newWordle.id
        }));
        await Question.bulkCreate(questionEntries, { transaction });

        // 5. Link Group Access
        if (wordleData.groupAccessIds && wordleData.groupAccessIds.length > 0) {
            const teacherGroups = await Group.findAll({
                where: {
                    id: { [Op.in]: wordleData.groupAccessIds },
                    userId: teacherId
                },
                attributes: ['id'],
                transaction
            });

            const ownedGroupIds = teacherGroups.map(group => group.id);
            const requestedGroupIds = new Set(wordleData.groupAccessIds);

            const unauthorizedGroupIds = Array.from(requestedGroupIds).filter(id => !ownedGroupIds.includes(id));

            if (unauthorizedGroupIds.length > 0) {
                await transaction.rollback();
                throw ApiError.unauthorized(`Cannot grant access to groups not owned by the teacher: ${unauthorizedGroupIds.join(', ')}`);
            }


            const wordleGroupEntries = ownedGroupIds.map(groupId => ({
                wordleId: newWordle.id,
                groupId: groupId
            }));
            await WordleGroup.bulkCreate(wordleGroupEntries, { transaction, ignore: true });
        }

        await transaction.commit();

        const createdWordleDetails = await Wordle.findByPk(newWordle.id, {
            include: [
                { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
                { model: Word, as: 'words', attributes: ['word', 'hint'] },
                { model: Question, as: 'questions', attributes: ['id', 'question', 'options', 'correctAnswer', 'type'] },
                { model: Group, as: 'groupsWithAccess', attributes: ['id', 'name'], through: { attributes: [] } }
            ],
        });

        const formattedWordle = createdWordleDetails.toJSON();
        if (formattedWordle.questions) {
            formattedWordle.questions = formattedWordle.questions.map(q => ({
                ...q,
                options: q.options ? JSON.parse(q.options) : null,
                correctAnswer: q.correctAnswer ? JSON.parse(q.correctAnswer) : null,
            }));
        }

        return formattedWordle;
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating wordle in wordleService:', error);
        if (error instanceof ApiError) {
            throw error;
        } else {
            throw ApiError.internal('An unexpected error occurred while creating the wordle.');
        }
    }
};

// CHECKED: Function to get wordles created by a teacher
const getWordlesByTeacher = async (teacherId) => {
    try {
        const teacher = await userService.getUserById(teacherId);
        if (!teacher ) {
            throw ApiError.notFound('User not found ');
        }
        if (teacher.role !== 'teacher') {
            throw ApiError.unauthorized('User not authorized to view wordles.');
        }

        const wordles = await Wordle.findAll({
            where: {
                userId: teacherId
            },
            attributes: ['id', 'name', 'difficulty', 'createdAt', 'updatedAt'],
            include: {
                model: Word,
                as: 'words',
                attributes: ['word', 'hint']
            }
        });

        return wordles.map(wordle => wordle.toJSON());

    } catch (error) {
        console.debug('Error getting wordles by teacher in wordleService:', error); 
        if (error instanceof ApiError) {
            throw error;
        } else {
            throw ApiError.internal('An unexpected error occurred while fetching wordles.');
        }
    }
};

// CHECKED: Function to get details of a specific wordle (Teacher functionality)
const getWordleDetails = async (wordleId, teacherId) => {
    try {
        const wordle = await Wordle.findOne({
            where: {
                id: wordleId,
                userId: teacherId
            },
            include: [
                {
                    model: Word,
                    as: 'words',
                    attributes: ['id', 'word', 'hint']
                },
                {
                    model: Question,
                    as: 'questions',
                    attributes: ['id', 'question', 'options', 'correctAnswer', 'type']
                },
                {
                    model: Group,
                    as: 'groupsWithAccess',
                    through: { attributes: [] },
                    attributes: ['id', 'name']
                }
            ]
        });
        if (!wordle) {
        throw ApiError.notFound('Wordle not found or access denied.');
            }

        return wordle ? wordle.toJSON() : null;

    } catch (error) {
        console.debug('Error getting wordle details:', error);
        if (error instanceof ApiError) {
            throw error;
        } else {
            throw ApiError.internal(`An unexpected error occurred while fetching details for Wordle with id ${wordleId}.`);
        }
    }
};

//  CHECKED: Function to update a specific wordle (Teacher functionality)
const updateWordle = async (wordleId, teacherId, updateData) => {
    const transaction = await sequelize.transaction();

    try {
        // 1. Find the wordle and verify it belongs to the teacher
        const wordle = await Wordle.findOne({
            where: {
                id: wordleId,
                userId: teacherId
            },
            transaction
        });

        if (!wordle) {
            await transaction.rollback();
            throw ApiError.notFound('Wordle not found');
        }

        // 2. Update wordle basic details
        if (updateData.name !== undefined) wordle.name = updateData.name;
        await wordle.save({ transaction });

        // 3. Update the Words asociated to this Wordle
        if (updateData.words !== undefined) {
            await Word.destroy({ where: { wordleId: wordleId }, transaction });
            if (Array.isArray(updateData.words) && updateData.words.length > 0) {
                const wordEntries = updateData.words.map(w => {
                    if (!w.word) {
                        throw ApiError.badRequest('Word object must contain a "word" field.');
                    }
                    return {
                        word: w.word, 
                        hint: w.hint || null, 
                        wordleId: wordleId
                    };
                });
                await Word.bulkCreate(wordEntries, { transaction });
            } else {
                
                throw ApiError.badRequest('At least one word is required for the Wordle.');
            }

        }

        // 4. Manage Questions (update, create, delete)
        if (updateData.questions !== undefined) {
            const currentQuestions = await Question.findAll({ where: { wordleId: wordleId }, transaction });
            const currentQuestionIds = new Set(currentQuestions.map(q => q.id));
            const updatedQuestionIds = new Set(updateData.questions.map(q => q.id).filter(id => id !== undefined));

            // Preguntas a borrar
            const questionsToDelete = currentQuestions.filter(q => !updatedQuestionIds.has(q.id));
            if (questionsToDelete.length > 0) {
                const deleteIds = questionsToDelete.map(q => q.id);
                await Question.destroy({ where: { id: { [Op.in]: deleteIds } }, transaction });
            }

            // Preguntas a crear
            for (const q of updateData.questions) {
                if (q.id === undefined || !currentQuestionIds.has(q.id)) {
                    if (!q.question || !q.options || !q.correctAnswer || !q.type) {
                        throw ApiError.badRequest('New question object must contain "question", "options", "correctAnswer", and "type" fields.');
                    }
                    await Question.create({
                        question: q.question,
                        options: JSON.stringify(q.options),
                        correctAnswer: JSON.stringify(q.correctAnswer),
                        type: q.type,
                        wordleId: wordleId
                    }, { transaction });
                
                }
            }
            if (updateData.questions.length === 0 && currentQuestions.length > 0) {
                 throw ApiError.badRequest('At least one question is required for the Wordle.');
            }
        }

        // 5. Manage Group Access Links
        if (updateData.groupAccessIds !== undefined) {
            const teacherGroups = await Group.findAll({
                where: {
                    id: { [Op.in]: updateData.groupAccessIds },
                    userId: teacherId
                },
                attributes: ['id'],
                transaction
            });

            const ownedGroupIds = teacherGroups.map(group => group.id);
            const requestedGroupIds = new Set(updateData.groupAccessIds);

            const unauthorizedGroupIds = Array.from(requestedGroupIds).filter(id => !ownedGroupIds.includes(id));

            if (unauthorizedGroupIds.length > 0) {
                await transaction.rollback();
                throw ApiError.unauthorized(`Cannot grant access to groups not owned by the teacher: ${unauthorizedGroupIds.join(', ')}`);
            }

            await WordleGroup.destroy({ where: { wordleId: wordleId }, transaction });

            if (ownedGroupIds.length > 0) {
                const wordleGroupEntries = ownedGroupIds.map(groupId => ({
                    wordleId: wordleId,
                    groupId: groupId
                }));
                await WordleGroup.bulkCreate(wordleGroupEntries, { transaction, ignore: true });
            }
        }

        if (updateData.difficulty !== undefined) {
            wordle.difficulty = updateData.difficulty;
            await wordle.save({ transaction });
        }

        await transaction.commit(); 

        const updatedWordleWithDetails = await getWordleDetails(wordleId, teacherId);

        return updatedWordleWithDetails;


    } catch (error) {
        await transaction.rollback(); 
        console.debug('Error updating wordle:', error);
        if (error instanceof ApiError) {
            throw error;
        } else {
            throw ApiError.internal(`An unexpected error occurred while updating Wordle with id ${wordleId}.`);
        }
    }
};

// CHECKED: Function to delete a specific wordle (Teacher functionality)
const deleteWordle = async (wordleId, teacherId) => {
    const transaction = await sequelize.transaction();

    try {
        // 1. Find the wordle and verify it belongs to the teacher
        const wordle = await Wordle.findOne({
            where: {
                id: wordleId,
                userId: teacherId
            },
            transaction
        });

        if (!wordle) {
            await transaction.rollback();
            throw ApiError.notFound('Wordle not found or access denied.');
        }

        // 2. Delete the wordle
        await wordle.destroy({ transaction });

        await transaction.commit();
        return true;

    } catch (error) {
        await transaction.rollback();
        console.debug('Error deleting wordle:', error);
        if (error instanceof ApiError) {
            throw error;
        } else {
            throw ApiError.internal('An unexpected error occurred while deleting the wordle.');
        }
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
