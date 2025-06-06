// src/api/services/wordleService.js
const { User, Group, Wordle, Word, Question, WordleGroup } = require('../models');
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
const createWordle = async (teacherId, wordleData, transaction) => {
  try {
    const teacher = await userService.getUserById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      throw ApiError.unauthorized('User not authorized to create wordles');
    }
    if (!wordleData.name || !wordleData.difficulty) {
      throw ApiError.badRequest('Wordle name and difficulty are required.');
    }

    // Verifica si ya existe un wordle con ese nombre para ese profesor
    const existing = await Wordle.findOne({
      where: {
        name: wordleData.name.trim(),
        userId: teacherId,
      },
    });
    if (existing) {
      throw ApiError.badRequest('Ya existe un Wordle con ese nombre para este profesor.');
    }

    const newWordle = await Wordle.create({
      name: wordleData.name.trim(),
      userId: teacherId,
      difficulty: wordleData.difficulty,
    }, { transaction });

    // Validación de palabras duplicadas
    if (!Array.isArray(wordleData.words) || wordleData.words.length === 0) {
      throw ApiError.badRequest('At least one word is required');
    }

    const seenWords = new Set();
    const wordEntries = wordleData.words.map(w => {
      const wordUpper = w.word.trim().toUpperCase();
      if (seenWords.has(wordUpper)) {
        throw ApiError.badRequest(`La palabra "${wordUpper}" está duplicada en el Wordle.`);
      }
      seenWords.add(wordUpper);
      return {
        word: wordUpper,
        hint: w.hint || null,
        wordleId: newWordle.id,
      };
    });
    await Word.bulkCreate(wordEntries, { transaction });

    // Validación de preguntas duplicadas
    if (!Array.isArray(wordleData.questions) || wordleData.questions.length === 0) {
      throw ApiError.badRequest('At least one question is required for the wordle.');
    }

    const seenQuestions = new Set();
    const questionEntries = wordleData.questions.map(q => {
      const text = q.question.trim().toLowerCase();
      if (seenQuestions.has(text)) {
        throw ApiError.badRequest(`La pregunta "${q.question}" está duplicada en el Wordle.`);
      }
      seenQuestions.add(text);

      if (
        typeof q.question !== 'string' || !q.question.trim() ||
        !Array.isArray(q.options) || q.options.length < 2 ||
        !Array.isArray(q.correctAnswer) || q.correctAnswer.length === 0 ||
        !['single', 'multiple'].includes(q.type)
      ) {
        throw ApiError.badRequest('Each question must have valid "question", "options", "correctAnswer", and "type".');
      }

      return {
        question: q.question.trim(),
        options: JSON.stringify(q.options),
        correctAnswer: JSON.stringify(q.correctAnswer),
        type: q.type,
        wordleId: newWordle.id,
      };
    });
    await Question.bulkCreate(questionEntries, { transaction });

    // Grupos
    if (Array.isArray(wordleData.groupAccessIds) && wordleData.groupAccessIds.length > 0) {
      const teacherGroups = await Group.findAll({
        where: {
          id: { [Op.in]: wordleData.groupAccessIds },
          userId: teacherId,
        },
        attributes: ['id'],
        transaction,
      });

      const groupLinks = teacherGroups.map(g => ({
        wordleId: newWordle.id,
        groupId: g.id,
      }));

      await WordleGroup.bulkCreate(groupLinks, { transaction, ignore: true });
    }

    await transaction.commit();
    return await getWordleDetails(newWordle.id, teacherId);

  } catch (error) {
    console.error('Error creating wordle:', error);
    throw error instanceof ApiError ? error : ApiError.internal('Unexpected error creating wordle');
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
const updateWordle = async (wordleId, teacherId, updateData, transaction) => {
    const wordle = await Wordle.findOne({
    where: {
        id: wordleId,
        userId: teacherId
    },
    include: [
        { model: Word, as: 'words' },
        { model: Question, as: 'questions' },
        { model: Group, as: 'groupsWithAccess' }
    ],
    transaction
    });

  if (!wordle) {
    throw ApiError.notFound('Wordle not found or unauthorized.');
  }

  // Validar nombre único para el mismo profesor
  if (updateData.name) {
    const duplicate = await Wordle.findOne({
      where: {
        name: updateData.name.trim(),
        userId: teacherId,
        id: { [Op.ne]: wordleId }
      },
      transaction
    });
    if (duplicate) {
      throw ApiError.badRequest('Ya existe otro Wordle con ese nombre para este profesor.');
    }
    wordle.name = updateData.name.trim();
  }

  if (updateData.difficulty) {
    wordle.difficulty = updateData.difficulty;
  }

  await wordle.save({ transaction });

  // Palabras
  if (updateData.words) {
    await Word.destroy({ where: { wordleId }, transaction });

    const seenWords = new Set();
    const newWords = updateData.words.map(w => {
      const wordUpper = w.word.trim().toUpperCase();
      if (seenWords.has(wordUpper)) {
        throw ApiError.badRequest(`La palabra "${wordUpper}" está duplicada.`);
      }
      seenWords.add(wordUpper);

      return {
        word: wordUpper,
        hint: w.hint || null,
        wordleId
      };
    });

    await Word.bulkCreate(newWords, { transaction });
  }

  // Preguntas
  if (updateData.questions) {
    const currentQuestions = await Question.findAll({ where: { wordleId }, transaction });
    const currentQuestionIds = new Set(currentQuestions.map(q => q.id));
    const updatedQuestionIds = new Set(updateData.questions.map(q => q.id).filter(id => Number.isInteger(id)));

    const seenTexts = new Set();

    for (const q of updateData.questions) {
      const textKey = q.question.trim().toLowerCase();
      if (seenTexts.has(textKey)) {
        throw ApiError.badRequest(`La pregunta "${q.question}" está duplicada.`);
      }
      seenTexts.add(textKey);

      if (
        typeof q.question !== 'string' || !q.question.trim() ||
        !Array.isArray(q.options) || q.options.length < 2 ||
        !Array.isArray(q.correctAnswer) || q.correctAnswer.length === 0 ||
        !['single', 'multiple'].includes(q.type)
      ) {
        throw ApiError.badRequest('Each question must have valid "question", "options", "correctAnswer", and "type".');
      }

      if (!Number.isInteger(q.id) || !currentQuestionIds.has(q.id)) {
        // Nueva pregunta
        await Question.create({
          wordleId,
          question: q.question.trim(),
          options: JSON.stringify(q.options),
          correctAnswer: JSON.stringify(q.correctAnswer),
          type: q.type,
        }, { transaction });
      } else {
        // Actualizar existente
        await Question.update({
          question: q.question.trim(),
          options: JSON.stringify(q.options),
          correctAnswer: JSON.stringify(q.correctAnswer),
          type: q.type,
        }, { where: { id: q.id }, transaction });
      }
    }

    // Eliminar preguntas que ya no están
    const questionsToDelete = [...currentQuestionIds].filter(id => !updatedQuestionIds.has(id));
    if (questionsToDelete.length > 0) {
      await Question.destroy({ where: { id: questionsToDelete }, transaction });
    }
  }

  // Grupos
  if (updateData.groupAccessIds) {
    await WordleGroup.destroy({ where: { wordleId }, transaction });

    if (updateData.groupAccessIds.length > 0) {
      const teacherGroups = await Group.findAll({
        where: {
          id: { [Op.in]: updateData.groupAccessIds },
          userId: teacherId,
        },
        attributes: ['id'],
        transaction,
      });

      const groupLinks = teacherGroups.map(g => ({
        wordleId,
        groupId: g.id,
      }));

      await WordleGroup.bulkCreate(groupLinks, { transaction, ignoreDuplicates: true });
    }
  }

  return await getWordleDetails(wordleId, teacherId);
};


// CHECKED: Function to delete a specific wordle (Teacher functionality)
const deleteWordle = async (wordleId, teacherId, transaction) => {

    try {
        // 1. Find the wordle and verify it belongs to the teacher
        const wordle = await Wordle.findOne({
            where: {
                id: wordleId,
            },
            transaction
        });

        if (!wordle) {
            
            throw ApiError.notFound('Wordle not found ');

        }
        if (wordle.userId !== teacherId) {
           
            throw ApiError.forbidden('You are not authorized to delete this Wordle. Only the Wordle creator can delete it.');
        }

        // 2. Delete the wordle
        await wordle.destroy({ transaction });

        
        return true;

    } catch (error) {
       
        console.debug('Error deleting wordle:', error);
        if (error instanceof ApiError) {
            throw error;
        } else {
            throw ApiError.internal('An unexpected error occurred while deleting the wordle: ' + error.message);    
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
