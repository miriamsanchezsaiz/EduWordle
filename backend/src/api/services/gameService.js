// src/api/services/gameService.js
const { GameResult, User, Wordle, Group, StudentGroup } = require('../models'); 
const { Op } = require('sequelize'); 
const sequelize = require('../../config/database');
const ApiError = require('../../utils/ApiError');


const saveGameResult = async (userId, wordleId, score) => {
  const transaction = await sequelize.transaction(); 

  try {
    // 1. Find if a game result already exists for this user and wordle
    let gameResult = await GameResult.findOne({
      where: {
        userId: userId,
        wordleId: wordleId
      },
      transaction 
    });

    let message = '';

    if (gameResult) {
      // 2. If a result exists, compare scores
      if (score > gameResult.score) {
        // If the new score is higher, update the existing result
        gameResult.score = score;
        gameResult.creationDate = new Date();

        await gameResult.save({ transaction });
        message = 'Game result updated with a higher score';
      } else {
        // If the new score is not higher, do nothing
        message = 'Existing game result has a higher or equal score';
        // Return the existing result without changes
        await transaction.commit();
        return { message, gameResult: gameResult.toJSON() };
      }
    } else {
      // 3. If no result exists, create a new one
      gameResult = await GameResult.create({
        userId: userId,
        wordleId: wordleId,
        score: score,
      }, { transaction });
      message = 'New game result created';
    }

    await transaction.commit(); 

    
    return { message, gameResult: gameResult.toJSON() };

  } catch (error) {
    await transaction.rollback(); 
    console.debug('Error saving game result:', error);
    if (error instanceof ApiError) {
      throw error; 
    } else {
      throw ApiError.internal('An unexpected error occurred while saving the game result.'); 
    }
  }
};


// --- Helper Functions for Teacher Authorization ---

// CHECKED: Check if a student user is in any group created by a specific teacher
const isStudentInTeacherGroup = async (studentId, teacherId) => {
  try {
    const studentGroupEntry = await StudentGroup.findOne({
      where: { userId: studentId },
      include: {
        model: Group,
        as: 'group',
        where: { userId: teacherId }
      }
    });
    return studentGroupEntry !== null;
  } catch (error) {
    console.debug('Error checking if student is in teacher group:', error);
    throw ApiError.internal('An unexpected error occurred during student-teacher group check.');
  }
};

// Check if a wordle was created by a specific teacher
const isWordleCreatedByTeacher = async (wordleId, teacherId) => {
  try {
    const wordle = await Wordle.findOne({
      where: {
        id: wordleId,
        userId: teacherId
      },
      attributes: ['id']
    });
    return wordle !== null;
  } catch (error) {
    console.debug('Error checking if wordle created by teacher:', error);
    throw ApiError.internal('An unexpected error occurred during wordle-teacher ownership check.');
  }
};

// Check if a group was created by a specific teacher
const isGroupCreatedByTeacher = async (groupId, teacherId) => {
  try {
    const group = await Group.findOne({
      where: {
        id: groupId,
        userId: teacherId
      },
      attributes: ['id']
    });
    return group !== null;
  } catch (error) {
    console.debug('Error checking if group created by teacher:', error);
    throw ApiError.internal('An unexpected error occurred during group-teacher ownership check.');
  }
};

// --- Game Result Functions with Teacher Authorization ---

// CHECKED: Function to get all game results for a specific student user (Teacher can view if student is in their group)
const getGameResultsForStudent = async (studentId, teacherId) => {
  try {

    const student = await User.findByPk(studentId, {
      attributes: ['id', 'role'],
      where: { role: 'student' }
    });

    if (!student) {
      throw ApiError.notFound('Student not found.');
    }
    const isAuthorized = await isStudentInTeacherGroup(studentId, teacherId);
    if (!isAuthorized) {
      throw ApiError.forbidden('Teacher not authorized to view this student\'s game results. Student is not in any of the teacher\'s groups.'); 
    }

    const gameResults = await GameResult.findAll({
      where: { userId: studentId },
      include: [
        {
          model: User,
          as: 'player',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Wordle,
          as: 'wordle',
          attributes: ['id', 'name', 'difficulty']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return gameResults.map(result => result.toJSON());

  } catch (error) {
    console.debug('Error getting game results for student:', error);
    if (error instanceof ApiError) {
      throw error; s
    } else {
      throw ApiError.internal('An unexpected error occurred while fetching game results for the student.'); 
    }
  }
};

// CHECKED: Function to get all game results for a specific wordle (Teacher can view if they created the wordle)
const getGameResultsForWordle = async (wordleId, teacherId) => {
  try {
    // 1. Verificar si el Wordle existe y pertenece a este profesor
    const wordle = await Wordle.findByPk(wordleId, {
      attributes: ['id', 'name', 'difficulty', 'userId']
    });

    if (!wordle) {
      throw ApiError.notFound('Wordle not found.');
    }

    if (wordle.userId !== teacherId) {
      throw ApiError.forbidden('Teacher not authorized to view results for this wordle. Wordle was not created by this teacher.');
    }

    // 2. Encontrar los resultados del juego para este Wordle
    const gameResults = await GameResult.findAll({
      where: { wordleId: wordleId },
      include: [
        {
          model: User,
          as: 'player',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Wordle,
          as: 'wordle',
          attributes: ['id', 'name', 'difficulty']
        }
      ],
      order: [['score', 'DESC']]
    });

    return gameResults.map(result => result.toJSON());

  } catch (error) {
    console.debug('Error getting game results for wordle:', error);
    if (error instanceof ApiError) {
      throw error;
    } else {
      throw ApiError.internal('An unexpected error occurred while fetching game results for the wordle.'); 
    }
  }
};

// CHECKED: Function to get all game results for a specific group (Teacher can view if they created the group)
const getGameResultsForGroup = async (groupId, teacherId) => {
  try {
    // 1. Find the group and get the IDs of students in it and wordles accessible to it
    const group = await Group.findByPk(groupId, {
      attributes: ['id', 'userId'],
      include: [
        {
          model: User,
          as: 'students',
          through: { attributes: [] },
          attributes: ['id']
        },
        {
          model: Wordle,
          as: 'accessibleWordles',
          through: { attributes: [] },
          attributes: ['id']
        }
      ]
    });

    if (!group) {
      throw ApiError.notFound('Group not found.');
    }
    if (group.userId !== teacherId) {
      throw ApiError.forbidden('Teacher not authorized to view results for this group. Group was not created by this teacher.');
    }

    const studentIdsInGroup = group.students.map(student => student.id);
    const accessibleWordleIds = group.accessibleWordles.map(wordle => wordle.id);

    if (studentIdsInGroup.length === 0 || accessibleWordleIds.length === 0) {
      return [];
    }

    // 2. Find game results played by these students for these wordles
    const gameResults = await GameResult.findAll({
      attributes: [
        'userId',
        [sequelize.fn('SUM', sequelize.col('score')), 'totalScore']
      ],
      where: {
        userId: { [Op.in]: studentIdsInGroup },
        wordleId: { [Op.in]: accessibleWordleIds }
      },
      include: [
        {
          model: User,
          as: 'player',
          attributes: ['id', 'name', 'email']
        }
      ],
      group: ['userId', 'player.id', 'player.name', 'player.email'],
      order: [['totalScore', 'DESC']]
    });

    return gameResults.map(result => ({
      userName: result.player.name,
      score: result.dataValues.totalScore
    }));

  } catch (error) {
    console.debug('Error getting game results for group:', error);
    if (error instanceof ApiError) {
      throw error;
    } else {
      throw ApiError.internal('An unexpected error occurred while fetching game results for the group.');
    }
  }
};


// CHECKED: Function to get details of a specific game result (Teacher can view if they have access)
const getGameResultDetails = async (gameResultId, teacherId) => { 
  try {
    const gameResult = await GameResult.findByPk(gameResultId, {
      include: [
        {
          model: User,
          as: 'player',
          attributes: ['id', 'name', 'email', 'role']
        },
        {
          model: Wordle,
          as: 'wordle',
          attributes: ['id', 'name', 'difficulty', 'userId']
        }
      ]
    });

    if (!gameResult) {
      throw ApiError.notFound('Game result not found.');
    }

    let isAuthorized = false;

    if (gameResult.wordle && gameResult.wordle.userId === teacherId) {
      isAuthorized = true;
    }

    if (!isAuthorized && gameResult.player) {
      isAuthorized = await isStudentInTeacherGroup(gameResult.player.id, teacherId);
    }

    if (!isAuthorized) {
      throw ApiError.forbidden('Teacher not authorized to view this game result. Neither created the Wordle nor manages the student.');
    }


    const resultJson = gameResult.toJSON();
    if (teacherId && resultJson.wordle && resultJson.wordle.userId !== teacherId) {
      delete resultJson.wordle.userId;
    }


    return resultJson;

  } catch (error) {
    console.debug('Error getting game result details:', error);
    if (error instanceof ApiError) {
      throw error;
    } else {
      throw ApiError.internal('An unexpected error occurred while fetching game result details.');
    }
  }
};




module.exports = {
  saveGameResult,
  getGameResultsForStudent,
  getGameResultsForWordle,
  getGameResultDetails,
  getGameResultsForGroup,
};