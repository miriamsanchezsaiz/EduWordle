// backend/src/seeders/seed.js
require('dotenv').config({
  path: process.env.NODE_ENV === 'test'
    ? require('path').resolve(__dirname, '../../.env.test')
    : require('path').resolve(__dirname, '../../.env'),
});


const { Sequelize } = require('sequelize'); // Import Sequelize
const sequelize = require('../config/database'); // Import the configured sequelize instance
const { User, Group, StudentGroup, Wordle, Word, Question, WordleGroup } = require('../api/models'); // Import all models
const bcrypt = require('bcrypt'); // Import bcrypt for password hashing

const SALT_ROUNDS = 10; // Define salt rounds for hashing

const seedDatabase = async () => {
  let transaction;
  try {
    transaction = await sequelize.transaction(); // Start a transaction

    console.log('Starting database seeding...');

    // 1. Drop all tables and recreate them
    // Use { force: true } to drop existing tables
    // In a real-world scenario, you might use migrations instead of force: true
    console.log('Synchronizing database (dropping and recreating tables)...');
    await sequelize.sync({ force: true, transaction });
    console.log('Database synchronized successfully.');

    // 2. Create Users
    console.log('Creating users...');
    const hashedPasswordManuela = await bcrypt.hash("Password_456!", SALT_ROUNDS);
    const hashedPasswordJuan = await bcrypt.hash("Password_123!", SALT_ROUNDS);
    const hashedPasswordDani = await bcrypt.hash("Teacher_pass25!", SALT_ROUNDS);
    const hashedPasswordOtherStudent = await bcrypt.hash("Student_pass25!", SALT_ROUNDS);


    const users = await User.bulkCreate([
      { name: 'Manuela Malasaña', email: 'manuela.m@example.com', password: hashedPasswordManuela, role: 'teacher' },
      { name: 'Juan Perez', email: 'juan.perez@example.com', password: hashedPasswordJuan, role: 'student' },
      { name: 'Dani', email: 'dani@example.com', password: hashedPasswordDani, role: 'teacher' },
      { name: 'Otro Alumno', email: 'otro.alumno@example.com', password: hashedPasswordOtherStudent, role: 'student' },
       { name: 'Alumno Sin Grupo', email: 'alumno.singrupo@example.com', password: await bcrypt.hash("nogrouppass", SALT_ROUNDS), role: 'student' },
    ], { transaction, individualHooks: true }); // individualHooks: true ensures hooks (like password hashing if defined in model) run

    const manuela = users[0];
    const juan = users[1];
    const otroProfesor = users[2];
    const otroAlumno = users[3];
    const alumnoSinGrupo = users[4];
    console.log('Users created.');

    // 3. Create Groups
    console.log('Creating groups...');
    const groups = await Group.bulkCreate([
      { name: 'Grupo A - Manuela', initDate: '2025-01-01', endDate: null, userId: manuela.id },
      { name: 'Grupo B - Manuela', initDate: '2025-03-15', endDate: '2025-12-31', userId: manuela.id },
      { name: 'Grupo C - Otro Profesor', initDate: '2025-02-01', endDate: null, userId: otroProfesor.id },
       { name: 'Grupo Caducado', initDate: '2024-01-01', endDate: '2024-12-31', userId: manuela.id }, // Group ended in the past
       { name: 'Grupo Futuro', initDate: '2026-01-01', endDate: null, userId: manuela.id }, // Group starts in the future
    ], { transaction });

    const grupoA = groups[0];
    const grupoB = groups[1];
    const grupoC = groups[2];
    const grupoCaducado = groups[3];
    const grupoFuturo = groups[4];
    console.log('Groups created.');

    // 4. Link Students to Groups (StudentGroup join table)
    console.log('Linking students to groups...');
    await StudentGroup.bulkCreate([
      { userId: juan.id, groupId: grupoA.id }, // Juan in Grupo A
      { userId: juan.id, groupId: grupoB.id }, // Juan in Grupo B
      { userId: otroAlumno.id, groupId: grupoA.id }, // Otro Alumno in Grupo A
      { userId: otroAlumno.id, groupId: grupoC.id }, // Otro Alumno in Grupo C (different teacher)
    ], { transaction, ignore: true }); // ignore: true is useful if you run seeder multiple times without force: true
    console.log('Students linked to groups.');


    // 5. Create Wordles, Words, and Questions
    console.log('Creating wordles, words, and questions...');

    // Wordle 1 (by Manuela, accessible to Grupo A)
    const wordle1 = await Wordle.create({ name: 'Capital de España', userId: manuela.id }, { transaction });
    await Word.create({ word: 'MADRID', hint: 'Empieza por M', wordleId: wordle1.id }, { transaction });
    await Question.bulkCreate([
      { question: '¿Cuántas letras tiene la palabra?', options: JSON.stringify(['6', '7', '8']), correctAnswer: JSON.stringify('6'), type: 'single', wordleId: wordle1.id },
      { question: '¿Es una ciudad europea?', options: JSON.stringify(['si', 'no']), correctAnswer: JSON.stringify('si'), type: 'single', wordleId: wordle1.id },
    ], { transaction });

    // Wordle 2 (by Manuela, accessible to Grupo B)
    const wordle2 = await Wordle.create({ name: 'Animal Doméstico', userId: manuela.id }, { transaction });
    await Word.create({ word: 'PERRO', hint: 'El mejor amigo del hombre', wordleId: wordle2.id }, { transaction });
     await Question.bulkCreate([
      { question: '¿Tiene 4 patas?', options: JSON.stringify(['si', 'no']), correctAnswer: JSON.stringify('si'), type: 'single', wordleId: wordle2.id },
      { question: '¿Maulla?', options: JSON.stringify(['si', 'no']), correctAnswer: JSON.stringify('no'), type: 'single', wordleId: wordle2.id },
    ], { transaction });


    // Wordle 3 (by Otro Profesor, accessible to Grupo C)
    const wordle3 = await Wordle.create({ name: 'Color Primario', userId: otroProfesor.id }, { transaction });
    await Word.create({ word: 'AZUL', hint: 'El color del cielo', wordleId: wordle3.id }, { transaction });
     await Question.bulkCreate([
      { question: '¿Es un color cálido?', options: JSON.stringify(['si', 'no']), correctAnswer: JSON.stringify('no'), type: 'single', wordleId: wordle3.id },
    ], { transaction });

     // Wordle 4 (by Manuela, no group access initially)
    const wordle4 = await Wordle.create({ name: 'Capital de Francia', userId: manuela.id }, { transaction });
    await Word.create({ word: 'PARIS', hint: 'La ciudad de la luz', wordleId: wordle4.id }, { transaction });
     await Question.bulkCreate([
      { question: '¿Es famosa por la Torre Eiffel?', options: JSON.stringify(['si', 'no']), correctAnswer: JSON.stringify('si'), type: 'single', wordleId: wordle4.id },
    ], { transaction });


    console.log('Wordles, words, and questions created.');


    // 6. Link Wordles to Groups (WordleGroup join table)
    console.log('Linking wordles to groups...');
    await WordleGroup.bulkCreate([
      { wordleId: wordle1.id, groupId: grupoA.id }, // Wordle 1 accessible to Grupo A
      { wordleId: wordle2.id, groupId: grupoB.id }, // Wordle 2 accessible to Grupo B
      { wordleId: wordle3.id, groupId: grupoC.id }, // Wordle 3 accessible to Grupo C
      { wordleId: wordle1.id, groupId: grupoB.id }, // Wordle 1 also accessible to Grupo B
    ], { transaction, ignore: true }); // ignore: true to prevent duplicates if linking same wordle/group combo
    console.log('Wordles linked to groups.');


    await transaction.commit(); // Commit the transaction
    console.log('Database seeding completed successfully.');

  } catch (error) {
    if (transaction) await transaction.rollback(); // Rollback transaction on error
    console.error('Error during database seeding:', error);
    process.exit(1); // Exit with a non-zero code to indicate failure
  } finally {
    // Close the database connection after seeding
    // Note: In test environment, you might not want to close here if tests run after seed
    // But for a standalone seed script, it's good practice.
    // Consider if your test setup handles closing the connection.
    // await sequelize.close(); // Commented out: let the test environment manage connection closing
  }
};

// Execute the seeding function if the script is run directly
if (require.main === module) {
  seedDatabase();
}

// Optional: Export the function if you want to call it from elsewhere (e.g., test setup)
// module.exports = seedDatabase;
