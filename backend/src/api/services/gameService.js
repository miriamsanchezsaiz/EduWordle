// src/api/services/gameService.js
const { GameResult, User, Wordle, Group, StudentGroup, WordleGroup} = require('../models'); // Import the GameResult model
const { Op } = require('sequelize'); // Import Op for Sequelize operators
const userService = require('./userService');
const sequelize = require('../../config/database');

// Function to save a basic game result entry
// NOTE: Based on the current simplified 'partidas' table structure,
// this only saves the user, wordle, and creation date.
// It DOES NOT save attempts, score, or whether the word was guessed.
// If you need to store those details, you MUST add columns to the 'partidas' table
// and modify this function to accept and save that data.
const saveGameResult = async (userId, wordleId, score) => {
  const transaction = await sequelize.transaction(); // Start a transaction

  try {
    // 1. Find if a game result already exists for this user and wordle
    let gameResult = await GameResult.findOne({
      where: {
        userId: userId,
        wordleId: wordleId
      },
      transaction // Include transaction
    });

    let message = '';

    if (gameResult) {
      // 2. If a result exists, compare scores
      if (score > gameResult.score) {
        // If the new score is higher, update the existing result
        gameResult.score = score;
        // Optionally update creationDate if you want the timestamp of the best score
        // gameResult.creationDate = new Date();
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
        // creationDate is automatically set by Sequelize timestamps
      }, { transaction });
      message = 'New game result created';
    }

    await transaction.commit(); // Commit the transaction

    // Return the saved/updated game result
    return { message, gameResult: gameResult.toJSON() };

  } catch (error) {
    await transaction.rollback(); // Rollback transaction on error
    console.debug('Error saving game result:', error);
    throw error;
  }
};


// --- Helper Functions for Teacher Authorization ---

// Check if a student user is in any group created by a specific teacher
const isStudentInTeacherGroup = async (studentId, teacherId) => {
  try {
      // Find an entry in the StudentGroup join table
      const studentGroupEntry = await StudentGroup.findOne({
          where: { userId: studentId }, // Where the student ID matches
          include: {
              model: Group,
              as: 'group', // Alias defined in models/index.js for StudentGroup -> Group
              where: { userId: teacherId } // And the group is created by the teacher
          }
      });
      // If an entry is found, the student is in a group created by the teacher
      return studentGroupEntry !== null;
  } catch (error) {
      console.debug('Error checking if student is in teacher group:', error);
      throw error;
  }
};

// Check if a wordle was created by a specific teacher
const isWordleCreatedByTeacher = async (wordleId, teacherId) => {
  try {
      // Find the wordle and check its creator (userId)
      const wordle = await Wordle.findOne({
          where: {
              id: wordleId,
              userId: teacherId // Where the wordle is created by the teacher
          },
          attributes: ['id'] // Only need the ID to confirm existence
      });
      // If a wordle is found with this ID and teacherId, it was created by the teacher
      return wordle !== null;
  } catch (error) {
      console.debug('Error checking if wordle created by teacher:', error);
      throw error;
  }
};

// Check if a group was created by a specific teacher
const isGroupCreatedByTeacher = async (groupId, teacherId) => {
  try {
      // Find the group and check its creator (userId)
      const group = await Group.findOne({
          where: {
              id: groupId,
              userId: teacherId // Where the group is created by the teacher
          },
          attributes: ['id'] // Only need the ID to confirm existence
      });
      // If a group is found with this ID and teacherId, it was created by the teacher
      return group !== null;
  } catch (error) {
      console.debug('Error checking if group created by teacher:', error);
      throw error;
  }
};

// --- Game Result Functions with Teacher Authorization ---

// Function to get all game results for a specific student user (Teacher can view if student is in their group)
const getGameResultsForStudent = async (studentId, teacherId = null) => { // Added optional teacherId
  try {
    // If teacherId is provided, perform authorization check
    if (teacherId) {
        const isAuthorized = await isStudentInTeacherGroup(studentId, teacherId);
        if (!isAuthorized) {
            // Throw a specific error that the controller can catch
            throw new Error('Teacher not authorized to view this student\'s results');
        }
    }

    // Find game results where the userId matches the provided studentId
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
          attributes: ['id', 'name']
        }
      ],
      order: [['creationDate', 'DESC']]
    });

    return gameResults.map(result => result.toJSON());

  } catch (error) {
    console.debug('Error getting game results for student:', error);
    throw error;
  }
};

// Function to get all game results for a specific wordle (Teacher can view if they created the wordle)
const getGameResultsForWordle = async (wordleId, teacherId = null) => { // Added optional teacherId
  try {
    // If teacherId is provided, perform authorization check
    if (teacherId) {
        const isAuthorized = await isWordleCreatedByTeacher(wordleId, teacherId);
        if (!isAuthorized) {
            // Throw a specific error that the controller can catch
            throw new Error('Teacher not authorized to view results for this wordle');
        }
    }

    // Find game results where the wordleId matches the provided wordleId
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
          attributes: ['id', 'name']
        }
      ],
      order: [['creationDate', 'DESC']]
    });

    return gameResults.map(result => result.toJSON());

  } catch (error) {
    console.debug('Error getting game results for wordle:', error);
    throw error;
  }
};

// Function to get all game results for a specific group (Teacher can view if they created the group)
const getGameResultsForGroup = async (groupId, teacherId = null) => { // Added optional teacherId
  try {
      // If teacherId is provided, perform authorization check
      if (teacherId) {
          const isAuthorized = await isGroupCreatedByTeacher(groupId, teacherId);
          if (!isAuthorized) {
               // Throw a specific error that the controller can catch
              throw new Error('Teacher not authorized to view results for this group');
          }
      }

      // 1. Find the group and get the IDs of students in it and wordles accessible to it
      const group = await Group.findByPk(groupId, {
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
          // This case should ideally be caught by the isGroupCreatedByTeacher check,
          // but this is a defensive check.
          throw new Error('Group not found');
      }

      const studentIdsInGroup = group.students.map(student => student.id);
      const accessibleWordleIds = group.accessibleWordles.map(wordle => wordle.id);

      if (studentIdsInGroup.length === 0 || accessibleWordleIds.length === 0) {
          return []; // No students or no accessible wordles means no results possible
      }

      // 2. Find game results played by these students for these wordles
      const gameResults = await GameResult.findAll({
          where: {
              userId: { [Op.in]: studentIdsInGroup },
              wordleId: { [Op.in]: accessibleWordleIds }
          },
           include: [
              {
                model: User,
                as: 'player',
                attributes: ['id', 'name', 'email']
              },
              {
                model: Wordle,
                as: 'wordle',
                attributes: ['id', 'name']
              }
            ],
          order: [['creationDate', 'DESC']]
      });

      return gameResults.map(result => result.toJSON());

  } catch (error) {
      console.debug('Error getting game results for group:', error);
      throw error;
  }
};


// Function to get details of a specific game result (Teacher can view if they have access)
const getGameResultDetails = async (gameResultId, teacherId = null) => { // Added optional teacherId
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
                attributes: ['id', 'name', 'userId'] // Include wordle creator ID
              }
            ]
      });

      if (!gameResult) {
          throw new Error('Game result not found');
      }

      // If teacherId is provided, perform authorization check
      if (teacherId) {
          let isAuthorized = false;

          // Check if the teacher created the wordle associated with this game result
          if (gameResult.wordle && gameResult.wordle.userId === teacherId) {
              isAuthorized = true;
          }

          // If not authorized by wordle ownership, check if the student player
          // is in any group created by this teacher
          if (!isAuthorized && gameResult.player) {
              isAuthorized = await isStudentInTeacherGroup(gameResult.player.id, teacherId);
          }

          if (!isAuthorized) {
               // Throw a specific error that the controller can catch
              throw new Error('Teacher not authorized to view this game result');
          }
      }

      // Exclude sensitive info like wordle creator ID from the final response if not the creator
      const resultJson = gameResult.toJSON();
       if (teacherId && resultJson.wordle && resultJson.wordle.userId !== teacherId) {
           delete resultJson.wordle.userId; // Remove creator ID if teacher is not the creator
       }


      return resultJson;

  } catch (error) {
      console.debug('Error getting game result details:', error);
      throw error;
  }
};

module.exports = {
  saveGameResult,
  getGameResultsForStudent,
  getGameResultsForWordle,
  getGameResultDetails,
  getGameResultsForGroup, 
};