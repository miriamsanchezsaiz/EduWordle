// src/app.js
const express = require('express');
const cors = require('cors'); // Import cors middleware (install with npm/yarn install cors)
const sequelize = require('./src/config/database'); 
const apiRoutes = require('./src/api/routes'); 
const errorHandler = require('./src/api/middlewares/errorHandler'); // Import error handling middleware
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./docs/api/swagger.yaml');


const app = express();


// --- Middleware Setup ---

// Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    console.log(`[HTTP Request Log] ${req.method} ${req.originalUrl}`);
    next();
});

// Enable CORS for all origins
//CHANGE (23/05): si front y back se ejecutan en puertos diferentes, esto es necesario
app.use(cors({
  origin: process.env.FRONTEND_URL ,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, 
  optionsSuccessStatus: 204
}));


app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


// --- Static File Serving ---
//CHANGE(23/05): he añadido esto porque recomiendan pasar el frontend desde el backend
// Serve static files from the 'frontend' directory
const frontendPath = path.join(__dirname, '..', 'frontend');
console.log(`Serving static frontend files from: ${frontendPath}`);

app.use(express.static(frontendPath));
app.use((req, res, next) => {
    // Si la petición no fue manejada por express.static, ni por /api-docs, ni por /api
    // Aquí es donde un 404 para archivos estáticos podría originarse si no están en el path correcto
    console.log(`[HTTP Request Log] Request for ${req.originalUrl} passed static handler.`);
    next();
});


// --- Database Synchronization ---

// sequelize.sync()
//   .then(() => {
//     console.log('Database models synchronized successfully.\n\n' +
//       '========================= END OF SYNC =========================\n');
      
//   })
//   .catch((err) => {
//     console.error('Error synchronizing database models:', err);
//     process.exit(1);
//   });


// --- Routes ---

// Mount the main API router under the /api path
app.use('/api', apiRoutes);

app.use((req, res, next) => {
    console.warn(`[HTTP Request Log] 404 Not Found for: ${req.originalUrl}`);
    res.status(404).send('404 Not Found');
});

// --- Error Handling Middleware ---

// This should be the LAST middleware in your chain
app.use(errorHandler);


module.exports = app;