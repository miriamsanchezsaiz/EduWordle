'use strict';
const { User, Group, StudentGroup, Wordle, Word, Question, WordleGroup, GameResult } = require('../src/api/models');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;


/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Starting initial data seeding...');

    // 1. Create Users
    console.log('Creating users...');
    const hashedPasswordManuela = await bcrypt.hash("Password_456!", SALT_ROUNDS);
    const hashedPasswordJuan = await bcrypt.hash("Password_123!", SALT_ROUNDS);
    const hashedPasswordDani = await bcrypt.hash("Teacher_pass25!", SALT_ROUNDS);
    const hashedPasswordOtherStudent = await bcrypt.hash("Student_pass25!", SALT_ROUNDS);

    const users = await queryInterface.bulkInsert('user', [ // Usa queryInterface.bulkInsert
      { name: 'Manuela Malasaña', email: 'manuela.m@example.com', password: hashedPasswordManuela, role: 'teacher', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Juan Perez', email: 'juan.perez@example.com', password: hashedPasswordJuan, role: 'student', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Dani', email: 'dani@example.com', password: hashedPasswordDani, role: 'teacher', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Otro Alumno', email: 'otro.alumno@example.com', password: hashedPasswordOtherStudent, role: 'student', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Alumno Sin Grupo', email: 'alumno.singrupo@example.com', password: await bcrypt.hash("nogrouppass", SALT_ROUNDS), role: 'student', createdAt: new Date(), updatedAt: new Date() },
    ], {});

    const [manuela, juan, otroProfesor, otroAlumno, alumnoSinGrupo] = await Promise.all([
      User.findOne({ where: { email: 'manuela.m@example.com' } }),
      User.findOne({ where: { email: 'juan.perez@example.com' } }),
      User.findOne({ where: { email: 'dani@example.com' } }),
      User.findOne({ where: { email: 'otro.alumno@example.com' } }),
      User.findOne({ where: { email: 'alumno.singrupo@example.com' } }),
    ]);

    console.log('Users created.');

     // 2. Create Groups
    console.log('Creating groups...');
    await queryInterface.bulkInsert('group', [
        { name: 'Grupo A - Manuela', initDate: '2025-01-01', endDate: null, userId: manuela.id, createdAt: new Date(), updatedAt: new Date() },
        { name: 'Grupo B - Manuela', initDate: '2025-03-15', endDate: '2025-12-31', userId: manuela.id, createdAt: new Date(), updatedAt: new Date() },
        { name: 'Grupo C - Otro Profesor', initDate: '2025-02-01', endDate: null, userId: otroProfesor.id, createdAt: new Date(), updatedAt: new Date() },
        { name: 'Grupo Caducado', initDate: '2024-01-01', endDate: '2024-12-31', userId: manuela.id, createdAt: new Date(), updatedAt: new Date() },
        { name: 'Grupo Futuro', initDate: '2026-01-01', endDate: null, userId: manuela.id, createdAt: new Date(), updatedAt: new Date() },
    ], {});

    const [grupoA, grupoB, grupoC, grupoCaducado, grupoFuturo] = await Promise.all([
        Group.findOne({ where: { name: 'Grupo A - Manuela' } }),
        Group.findOne({ where: { name: 'Grupo B - Manuela' } }),
        Group.findOne({ where: { name: 'Grupo C - Otro Profesor' } }),
        Group.findOne({ where: { name: 'Grupo Caducado' } }),
        Group.findOne({ where: { name: 'Grupo Futuro' } }),
    ]);
    console.log('Groups created.');

    // 3. Link Students to Groups (StudentGroup join table)
    console.log('Linking students to groups...');
    await queryInterface.bulkInsert('student_group', [ // Nombre de la tabla de unión
        { userId: juan.id, groupId: grupoA.id, createdAt: new Date(), updatedAt: new Date() },
        { userId: juan.id, groupId: grupoB.id, createdAt: new Date(), updatedAt: new Date() },
        { userId: otroAlumno.id, groupId: grupoA.id, createdAt: new Date(), updatedAt: new Date() },
        { userId: otroAlumno.id, groupId: grupoC.id, createdAt: new Date(), updatedAt: new Date() },
    ], {});
    console.log('Students linked to groups.');

    // 4. Create Wordles, Words, and Questions
    console.log('Creating wordles, words, and questions...');
    const wordle1 = await queryInterface.bulkInsert('wordle', [{ name: 'Capital de España', userId: manuela.id, createdAt: new Date(), updatedAt: new Date() }], {});
    const wordleId1 = await Wordle.findOne({ where: { name: 'Capital de España', userId: manuela.id } }).then(w => w.id);

    await queryInterface.bulkInsert('word', [{ word: 'MADRID', hint: 'Empieza por M', wordleId: wordleId1, createdAt: new Date(), updatedAt: new Date() }], {});
    await queryInterface.bulkInsert('question', [
      { question: '¿Cuántas letras tiene la palabra?', options: JSON.stringify(['6', '7', '8']), correctAnswer: JSON.stringify('6'), type: 'single', wordleId: wordleId1, createdAt: new Date(), updatedAt: new Date() },
      { question: '¿Es una ciudad europea?', options: JSON.stringify(['si', 'no']), correctAnswer: JSON.stringify('si'), type: 'single', wordleId: wordleId1, createdAt: new Date(), updatedAt: new Date() },
    ], {});

    const wordle2 = await queryInterface.bulkInsert('wordle', [{ name: 'Animal Doméstico', userId: manuela.id, createdAt: new Date(), updatedAt: new Date() }], {});
    const wordleId2 = await Wordle.findOne({ where: { name: 'Animal Doméstico', userId: manuela.id } }).then(w => w.id);
    await queryInterface.bulkInsert('word', [{ word: 'PERRO', hint: 'El mejor amigo del hombre', wordleId: wordleId2, createdAt: new Date(), updatedAt: new Date() }], {});
    await queryInterface.bulkInsert('question', [
      { question: '¿Tiene 4 patas?', options: JSON.stringify(['si', 'no']), correctAnswer: JSON.stringify('si'), type: 'single', wordleId: wordleId2, createdAt: new Date(), updatedAt: new Date() },
      { question: '¿Maulla?', options: JSON.stringify(['si', 'no']), correctAnswer: JSON.stringify('no'), type: 'single', wordleId: wordleId2, createdAt: new Date(), updatedAt: new Date() },
    ], {});

    const wordle3 = await queryInterface.bulkInsert('wordle', [{ name: 'Color Primario', userId: otroProfesor.id, createdAt: new Date(), updatedAt: new Date() }], {});
    const wordleId3 = await Wordle.findOne({ where: { name: 'Color Primario', userId: otroProfesor.id } }).then(w => w.id);
    await queryInterface.bulkInsert('word', [{ word: 'AZUL', hint: 'El color del cielo', wordleId: wordleId3, createdAt: new Date(), updatedAt: new Date() }], {});
    await queryInterface.bulkInsert('question', [
      { question: '¿Es un color cálido?', options: JSON.stringify(['si', 'no']), correctAnswer: JSON.stringify('no'), type: 'single', wordleId: wordle3, createdAt: new Date(), updatedAt: new Date() },
    ], {});

    const wordle4 = await queryInterface.bulkInsert('wordle', [{ name: 'Capital de Francia', userId: manuela.id, createdAt: new Date(), updatedAt: new Date() }], {});
    const wordleId4 = await Wordle.findOne({ where: { name: 'Capital de Francia', userId: manuela.id } }).then(w => w.id);
    await queryInterface.bulkInsert('word', [{ word: 'PARIS', hint: 'La ciudad de la luz', wordleId: wordleId4, createdAt: new Date(), updatedAt: new Date() }], {});
    await queryInterface.bulkInsert('question', [
      { question: '¿Es famosa por la Torre Eiffel?', options: JSON.stringify(['si', 'no']), correctAnswer: JSON.stringify('si'), type: 'single', wordleId: wordle4, createdAt: new Date(), updatedAt: new Date() },
    ], {});
    console.log('Wordles, words, and questions created.');

    // 5. Link Wordles to Groups (WordleGroup join table)
    console.log('Linking wordles to groups...');
    await queryInterface.bulkInsert('wordle_group', [ 
        { wordleId: wordleId1, groupId: grupoA.id, createdAt: new Date(), updatedAt: new Date() },
        { wordleId: wordleId2, groupId: grupoB.id, createdAt: new Date(), updatedAt: new Date() },
        { wordleId: wordleId3, groupId: grupoC.id, createdAt: new Date(), updatedAt: new Date() },
        { wordleId: wordleId1, groupId: grupoB.id, createdAt: new Date(), updatedAt: new Date() },
    ], {});
    console.log('Wordles linked to groups.');

    // 6. Create Game Results
    console.log('Creating game results...');
    await queryInterface.bulkInsert('game', [ // Nombre de la tabla
        { userId: juan.id, wordleId: wordleId1, score: 200,  createdAt: new Date(), updatedAt: new Date() },
        { userId: juan.id, wordleId: wordleId2, score: 250, createdAt: new Date(), updatedAt: new Date() },
        { userId: otroAlumno.id, wordleId: wordleId1, score: 210,  createdAt: new Date(), updatedAt: new Date() },
        { userId: otroAlumno.id, wordleId: wordleId3, score: 300, createdAt: new Date(), updatedAt: new Date() },
    ], {});
    console.log('Game results created.');

    console.log('Initial data seeding completed successfully.');



  },

  async down(queryInterface, Sequelize) {
    console.log('Reverting initial data seed...');

    // 1. Eliminar datos de tablas de unión y tablas que dependen de otras:
    await queryInterface.bulkDelete('game', null, {}); // Depende de users y wordles
    await queryInterface.bulkDelete('wordle_group', null, {}); // Depende de wordles y groups
    await queryInterface.bulkDelete('question', null, {}); // Depende de wordles
    await queryInterface.bulkDelete('word', null, {}); // Depende de wordles
    await queryInterface.bulkDelete('student_group', null, {}); // Depende de users y groups

    // 2. Eliminar datos de tablas principales:
    await queryInterface.bulkDelete('wordle', null, {}); // Wordles pueden ser eliminados una vez que sus hijos (words, questions, wordle_groups) ya no los referencian
    await queryInterface.bulkDelete('group', null, {}); // Groups pueden ser eliminados una vez que sus hijos (student_groups, wordle_groups) ya no los referencian

    // 3. Eliminar la tabla más "padre" o sin dependencias fuertes:
    await queryInterface.bulkDelete('user', null, {}); // Users puede ser eliminado al final, una vez que groups y wordles (que dependen de userId) ya no los referencian

    console.log('Initial data seed reverted successfully.');
  }
};
