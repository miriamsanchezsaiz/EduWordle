const  sequelize  = require('../config/database');
const { User, Wordle, Group, WordleGroup, StudentGroup, Word, Question, GameResult } = require('../api/models'); 


console.log('Environment:', process.env.NODE_ENV);
console.log('Sequelize config:', sequelize.config);

beforeAll(async () => {
 // Voy a hacer la sincronización manual por tabla porque me da error de orden de creación de tablas
 try{ 
 await sequelize.authenticate();
  console.log('Test database connected.');


  await User.sync();
    console.log('User table synchronized.');

    await Wordle.sync();
    console.log('Wordle table synchronized.');

    await Group.sync();
    console.log('Group table synchronized.');

    await WordleGroup.sync();
    console.log('WordleGroup table synchronized.');

    await User.sync(); // Asegurándose que User esté sincronizado antes de StudentGroup
    console.log('User table synchronized (again, before StudentGroup).');

    await Group.sync(); // Asegurándose que Group esté sincronizado antes de StudentGroup
    console.log('Group table synchronized (again, before StudentGroup).');

    await StudentGroup.sync();
    console.log('StudentGroup table synchronized.');

    await Word.sync();
    console.log('Word table synchronized.');

    await Question.sync();
    console.log('Question table synchronized.');

    await GameResult.sync();
    console.log('GameResult table synchronized.');

    console.log('All tables synchronized.');

  console.log('Test database synchronized.');
 } 
 catch (error) {
  console.error('Error synchronizing test database:', error);
  throw error;
 }

});

afterAll(async () => {
  // Close the database connection after all tests are done
  await sequelize.close();
  console.log('Test database connection closed.');
});
