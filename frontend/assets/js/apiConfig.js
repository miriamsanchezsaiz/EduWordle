//Aquí se define la URL base de la API para que el frontend pueda hacer peticiones a ella.
//Este URL se importa añadiendo el script al html y se usa en el fetch seguido de la ruta 
// de la API que se quiera llamar.
// Poe ejemplo: fetch(`${API_BASE_URL}/auth/login`)
// Este archivo es generado automáticamente por el backend. ¡No editar manualmente!
export const API_BASE_URL = "https://eduwordle.etsisi.upm.es/api";
export const FRONT_URL = "https://eduwordle.etsisi.upm.es/frontend";


//ATENCIÓN: hay que cambiar los href y los src de los html tal que:
// href="assets/css/login.css" -> href="/assets/css/login.css"
// src="assets/js/login.js" -> src="/assets/js/login.js"