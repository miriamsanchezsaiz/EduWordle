// backend/src/utils/generate-frontend-config.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') }); 

const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT ;
const API_BASE_URL_FOR_FRONTEND = process.env.FRONTEND_URL + '/frontend' || `http://localhost:${PORT}/frontend`;
const API_BASE_URL_FOR_BACKEND = process.env.FRONTEND_URL + '/api' || `http://localhost:${PORT}/api`;
const configContent = `
//Aquí se define la URL base de la API para que el frontend pueda hacer peticiones a ella.
//Este URL se importa añadiendo el script al html y se usa en el fetch seguido de la ruta 
// de la API que se quiera llamar.
// Poe ejemplo: fetch(\`\${API_BASE_URL}/auth/login\`)
// Este archivo es generado automáticamente por el backend. ¡No editar manualmente!
const API_BASE_URL = "${API_BASE_URL_FOR_BACKEND}";
const FRONT_URL = "${API_BASE_URL_FOR_FRONTEND}";


//ATENCIÓN: hay que cambiar los href y los src de los html tal que:
// href="assets/css/login.css" -> href="/assets/css/login.css"
// src="assets/js/login.js" -> src="/assets/js/login.js"

`;

const outputPath = path.join(__dirname, '..', '..', '..', 'frontend', 'assets', 'js', 'apiConfig.js'); 

fs.writeFileSync(outputPath, configContent.trim());

console.log(`[Backend Script] Generated API configuration file for frontend: ${outputPath}`);