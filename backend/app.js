// src/app.js
const express = require('express');
const cors = require('cors'); // Import cors middleware (install with npm/yarn install cors)
const sequelize = require('./src/config/database'); // Import sequelize instance from your config
const apiRoutes = require('./src/api/routes'); // Import your main API router
const errorHandler = require('./src/api/middlewares/errorHandler'); // Import error handling middleware

const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./docs/api/swagger.yaml');


const app = express();

// --- Middleware Setup ---

// Enable CORS for all origins (adjust in production)
app.use(cors());

// Parse JSON request bodies
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// You can add other global middlewares here if needed (e.g., logging)


// --- Database Synchronization ---
// Note: sequelize.sync() is great for development, but in production
// you would typically use database migration tools instead.
sequelize.sync() // Sync all models with the database
  .then(() => {
    console.log('Database models synchronized successfully.\n\n' +
      '========================= END OF SYNC =========================\n');
      
  })
  .catch((err) => {
    console.error('Error synchronizing database models:', err);
    // Depending on how critical this is, you might want to exit the process
    // process.exit(1);
  });


// --- Routes ---
// Mount the main API router under the /api path
app.use('/api', apiRoutes);


// --- Error Handling Middleware ---
// This should be the LAST middleware in your chain
app.use(errorHandler);


module.exports = app;