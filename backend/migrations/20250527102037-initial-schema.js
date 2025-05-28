'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        field: 'name'
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        field: 'email'
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
        field: 'password'
      },
      role: {
        type: Sequelize.STRING(50),
        allowNull: false,
        field: 'role',
        validate: {
          isIn: [['student', 'teacher']]
        }
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.createTable('group', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        field: 'name'
      },
      initDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        field: 'initDate'
      },
      endDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        field: 'endDate'
      },
      userId: {
        type: Sequelize.INTEGER,
        references: { model: 'user', key: 'id' },
        onDelete: 'CASCADE',
        allowNull: false,
        field: 'userId'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.createTable('wordle', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        field: 'name'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'userId',
        references: {
          model: 'user',
          key: 'id'
        }
      },
      difficulty: {
        type: Sequelize.ENUM('low', 'high'),
        allowNull: false,
        defaultValue: 'low',
        field: 'difficulty'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.createTable('word', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
      },
      word: {
        type: Sequelize.STRING,
        allowNull: false,
        field: 'word'
      },
      hint: {
        type: Sequelize.STRING,
        allowNull: true,
        field: 'hint'
      },
      wordleId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'wordleId',
        references: {
          model: 'wordle',
          key: 'id'
        }
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.createTable('game', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
      },
      userId: {
        type: Sequelize.INTEGER,
        references: { model: 'user', key: 'id' },
        onDelete: 'CASCADE',
        allowNull: false,
        field: 'userId'
      },
      wordleId: {
        type: Sequelize.INTEGER,
        references: { model: 'wordle', key: 'id' },
        onDelete: 'CASCADE',
        allowNull: false,
        field: 'wordleId'
      },
      score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'score'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },

      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }

    });
    await queryInterface.addConstraint('game', {
      fields: ['userId', 'wordleId'],
      type: 'unique',
      name: 'unique_user_wordle_game'
    });

    await queryInterface.createTable('question', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
      },
      question: {
        type: Sequelize.TEXT,
        allowNull: false,
        field: 'question'
      },
      options: {
        type: Sequelize.TEXT,
        allowNull: false,
        field: 'options',
      },
      correctAnswer: {
        type: Sequelize.STRING(255),
        allowNull: false,
        field: 'correctAnswer',
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        field: 'type'
      },
      wordleId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'wordleId',
        references: {
          model: 'wordle',
          key: 'id'
        }
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.createTable('wordle_group', {

      wordleId: {
        type: Sequelize.INTEGER,
        references: { model: 'wordle', key: 'id' },
        onDelete: 'CASCADE',
        allowNull: false,
        primaryKey: true
      },
      groupId: {
        type: Sequelize.INTEGER,
        references: { model: 'group', key: 'id' },
        onDelete: 'CASCADE',
        allowNull: false,
        primaryKey: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.createTable('student_group', {

      userId: {
        type: Sequelize.INTEGER,
        references: { model: 'user', key: 'id' },
        onDelete: 'CASCADE',
        allowNull: false,
        primaryKey: true
      },
      groupId: {
        type: Sequelize.INTEGER,
        references: { model: 'group', key: 'id' },
        onDelete: 'CASCADE',
        allowNull: false,
        primaryKey: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }

    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('student_group');
    await queryInterface.dropTable('wordle_group');
    await queryInterface.dropTable('question');
    await queryInterface.dropTable('game');
    await queryInterface.dropTable('word');
    await queryInterface.dropTable('wordle');

    await queryInterface.dropTable('group');

    await queryInterface.dropTable('user');

  }
};
