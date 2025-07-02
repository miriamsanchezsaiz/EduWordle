//backend/src/config/database.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') }); 

const { Sequelize } = require('sequelize');



const env = process.env.NODE_ENV || 'development';

const config = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'mysql',
    dialectOptions: {
      charset: 'utf8mb4'
    },
    logging: console.log,
  },
  test: {
    username: process.env.DB_USER_TEST,
    password: process.env.DB_PASSWORD_TEST,
    database: process.env.DB_NAME_TEST,
    host: process.env.DB_HOST_TEST,
    dialect: 'mysql',
    dialectOptions: {
      charset: 'utf8mb4'
    },  
    logging: false
   }
   ,
   production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'mysql',
    dialectOptions: {
      charset: 'utf8mb4'
    },
    logging: console.log,
     }
}

const dbConfig = config[env];

const sequelize = new Sequelize(
  
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    dialectOptions: dbConfig.dialectOptions
  }
);


 if(env !== 'test'){
  sequelize.authenticate()
    .then(() => {
      console.log('Conexión a la base de datos establecida con éxito.');
    })
    .catch(error => {
      console.error('Error de conexión a la base de datos:', error);
    });
 }

module.exports = sequelize;


