import { apiService } from './apiService.js';
const toastr = window.toastr;

const authToken = sessionStorage.getItem('authToken');
const currentUserString = sessionStorage.getItem('currentUser');
let role = null;
let userId = null; // Este será el studentId o teacherId

if (currentUserString) {
  try {
    const currentUser = JSON.parse(currentUserString);
    role = currentUser.role;
    userId = currentUser.id; // Guarda el ID del usuario logueado
  } catch (e) {
    console.error('Error parsing currentUser from localStorage:', e);
  }
}

// Redirige si no hay token o el rol no es el esperado (solo estudiantes pueden jugar)
if (!authToken || role !== 'student' || !userId) {
  console.warn('Acceso denegado. Redirigiendo a login.html.');
  window.location.replace('login.html');
}


// Editable variables for an specific wordle ***********************
//********************************************************** */
const params = new URLSearchParams(window.location.search);
const wordleId = params.get('id');
if (!wordleId) {
  console.error('No se encontró el ID de la Wordle en la URL.');
}

const NUMBER_OF_GUESSES = 5;
let guessesRemaining = NUMBER_OF_GUESSES;

let currentGuess = [];
let nextLetter = 0;
let rightGuessString = "";
let wordsize = 0;
let selectedWordObj = null;
let words = [];
let difficulty = 'low';

let isProcessingGuess = false;
let isInputBlocked = false; 
let allQuestionsFromWordle = [];
let availableQuestionsForGame = [];

//********************************************************** */ */


async function fetchWordleMeta() {

  try {
    const w = await apiService.getWordleGameData(wordleId);
    difficulty = w.difficulty;

  } catch (e) {
    console.warn("No se pudo leer dificultad, asumiendo 'low':", e);
    difficulty = 'low';
  }
}

async function fetchWords() {
  try {

    const gameData = await apiService.getWordleGameData(wordleId);
    if (gameData && gameData.words && gameData.words.length > 0) {
      return gameData.words;
    } else {
      console.error('No se encontraron palabras en los datos del juego para esta Wordle.');
      return [];
    }
  } catch (err) {
    console.error('Error al obtener palabras del juego:', err);
    return [];
  }
}

async function fetchQuestions() {
  try {
    // Usa la ruta del estudiante para obtener los datos del juego
    const gameData = await apiService.getWordleGameData(wordleId);
    if (gameData && gameData.questions && gameData.questions.length > 0) {
      allQuestionsFromWordle = gameData.questions;
      resetAvailableQuestions();

    } else {
      console.warn('No se encontraron preguntas para esta Wordle.');
      allQuestionsFromWordle = [];
      availableQuestionsForGame = [];
      
    }
    return;
  } catch (err) {
    console.error('Error al obtener preguntas del juego:', err);
    allQuestionsFromWordle = [];
    availableQuestionsForGame = [];
    
  }
}

function resetAvailableQuestions() {
    // Clona el array original para no modificarlo
    availableQuestionsForGame = [...allQuestionsFromWordle];
    // Barajar las preguntas al reiniciar
    availableQuestionsForGame.sort(() => Math.random() - 0.5);
    console.log("Preguntas disponibles reiniciadas y barajadas.");
}

// Obtener una pregunta aleatoria sin repetición
function getUniqueRandomQuestion() {
    if (availableQuestionsForGame.length === 0) {
        console.warn("Todas las preguntas se han jugado. Reiniciando pool de preguntas.");
        resetAvailableQuestions(); // Reinicia si no quedan preguntas
        if (availableQuestionsForGame.length === 0) {
            console.error("No hay preguntas disponibles incluso después de reiniciar.");
            return null;
        }
    }

    // Saca una pregunta del final del array (como una pila)
    const question = availableQuestionsForGame.pop();
    return question;
}


// InitGame es fetch de words e iniciar el juego con cada palabra
async function initGame() {
  localStorage.removeItem("points");
  updateDisplayPoints(0);

  await fetchWordleMeta();
  words = await fetchWords();
  await fetchQuestions();

  if (words.length === 0) {
    toastr.error("No se pudieron cargar las palabras para jugar. Por favor, inténtelo de nuevo.");
    console.error("No se pudieron cargar las palabras.");
    return;
  }

  loadWord();

}

function loadWord() {
  selectedWordObj = words.shift();
  if (!selectedWordObj) {
    console.log("No hay más palabras para jugar. Fin del juego");
    endGame();
    return;
  }

  rightGuessString = selectedWordObj.word.toLowerCase();
  wordsize = rightGuessString.length;
  let config_hint = selectedWordObj.hint ? true : false;

  currentGuess = [];
  nextLetter = 0;
  guessesRemaining = NUMBER_OF_GUESSES;
  initBoard();
  hintUnlocked = false;
}


function initBoard() {

  resetKeyboard();
  let board = document.getElementById("game-board");
  board.innerHTML = `<button title ="Pista" id="hint-button" class="hint-button" onclick="askForHint()"></button>`;

  board.innerHTML = '';
  board.classList.remove("long-word-board");
  
  
  for (let i = 0; i < NUMBER_OF_GUESSES; i++) {
    let row = document.createElement("div");
    row.className = "letter-row";

    for (let j = 0; j < wordsize; j++) {
      let box = document.createElement("div");
      box.className = "letter-box";
      row.appendChild(box);
    }

    board.appendChild(row);
  }
}

function resetKeyboard() {
  for (const elem of document.getElementsByClassName("keyboard-button")) {
    elem.classList.remove("letter-grey", "letter-yellow", "letter-green");
  }
}


function shadeKeyBoard(letter, colorClass) {
  for (const elem of document.getElementsByClassName("keyboard-button")) {
    if (elem.textContent === letter) {
      if (elem.classList.contains("letter-green")) {
        return;
      }
      if (elem.classList.contains("letter-yellow") && colorClass !== "letter-green") {
        return;
      }

      elem.classList.remove("letter-grey", "letter-yellow", "letter-green");
      elem.classList.add(colorClass);
      break;
    }
  }
}


function deleteLetter() {
  if (isProcessingGuess) return; //No permite interactuar con el string que se está procesando
  if (nextLetter === 0) return;  // Evita eliminar si no hay letras ingresadas

  let row = document.getElementsByClassName("letter-row")[NUMBER_OF_GUESSES - guessesRemaining];
  let box = row.children[nextLetter - 1];
  box.textContent = "";
  box.classList.remove("filled-box");
  currentGuess.pop();
  nextLetter -= 1;
}



async function checkGuess() {
  if (isProcessingGuess) return;
  isProcessingGuess = true;


  let row = document.getElementsByClassName("letter-row")[NUMBER_OF_GUESSES - guessesRemaining];
  let guessString = currentGuess.join("").toLowerCase();
  let rightGuess = Array.from(rightGuessString);
  let letterColor = Array(wordsize).fill("letter-grey");
  let guessedLetters = [];

  if (guessString.length !== wordsize) {
    toastr.error("No has introducido suficientes letras!");
    isProcessingGuess = false;
    return;
  }

  // **1️⃣ Verificar letras correctas (verde)**
  for (let i = 0; i < wordsize; i++) {
    if (guessString[i] === rightGuess[i]) {
      letterColor[i] = "letter-green";
      guessedLetters.push([i, "letter-green"]);
      rightGuess[i] = null;
    }
  }

  // **2️⃣ Verificar letras amarillas**
  for (let i = 0; i < wordsize; i++) {
    if (letterColor[i] === "letter-green") continue; // Saltar las verdes

    let letterIndex = rightGuess.indexOf(guessString[i]);
    if (letterIndex !== -1) {
      letterColor[i] = "letter-yellow";
      guessedLetters.push([i, "letter-yellow"]);
      rightGuess[letterIndex] = null;
    }
  }


  // **3️⃣ Si la palabra es correcta, hacer pregunta**
  if (guessString === rightGuessString) {
    let answer = await popup_quest();
    if (answer) {
      toastr.success("Bien hecho! Siguiente Palabra!");
      guessesRemaining = NUMBER_OF_GUESSES;
      delete_popup();
      updatePoints(1);
      await animateRow(row, letterColor, guessString);

      setTimeout(() => {
        loadWord();
        isProcessingGuess = false;
      }, 2000);

      return;
    }
    else {
      toastr.error("Respuesta incorrecta! No se hace shade.");
      letterColor = Array(wordsize).fill("none");

      // Esto es para evitar que vuelvan a salir preguntas si la palabra es correcta pero la respuesta es incorrecta
      guessesRemaining--;
      currentGuess = [];
      nextLetter = 0;

      if (guessesRemaining === 0) {
        toastr.error(`Has fallado! La palabra era: "${rightGuessString}"`);
        setTimeout(() => {
          loadWord();
          isProcessingGuess = false;
        }, 2000);
      }
      else {
        isProcessingGuess = false;
      }
      return


    }
  }

  //**4️⃣ Si no es correcta, generar preguntas dependiendo de la dificultad
  if (difficulty === 'high') {
    // generar preguntas para cada letra hallada
    await generate_questions(guessedLetters, letterColor);
  }
  else {
    // Si la dificultad es baja, solo se genera una pregunta
    let answer = await popup_quest();
    if (!answer) {
      toastr.error("Respuesta incorrecta! No se hace shade.");
      // Si la respuesta es incorrecta, no se cambia el color de las letras
      letterColor = Array(wordsize).fill("none");
    }

  }

  // **5️⃣ Aplicar los colores al tablero**
  await animateRow(row, letterColor, guessString);

  // ** Reducir intentos**
  guessesRemaining--;
  currentGuess = [];
  nextLetter = 0;

  if (guessesRemaining === 0) {
    toastr.error(`Has fallado! La palabra era: "${rightGuessString}"`);
    setTimeout(() => {
      loadWord();
      isProcessingGuess = false;
    }, 2000);
  }
  else {
    isProcessingGuess = false;
  }
}

//************************* animateRow() ************************************* */
function animateRow(row, letterColor, guessString) {
  return new Promise((resolve) => {
    let completedAnimations = 0;

    for (let i = 0; i < wordsize; i++) {
      let box = row.children[i];
      let delay = 250 * i;

      setTimeout(() => {
        animateCSS(box, "flipInX");
        box.classList.remove("letter-grey", "letter-yellow", "letter-green");
        box.classList.add(letterColor[i]);
        shadeKeyBoard(guessString[i], letterColor[i]);

        completedAnimations++;
        if (completedAnimations === wordsize) {
          resolve();
        }
      }, delay);
    }
  });
}


//************************* toggleSettings() ************************************* */

const panel = document.getElementById("settings-panel");
const overlay = document.getElementById("settings-overlay");

function toggleSettings() {

  if (panel.style.display === 'none' || panel.style.display === '') {
    panel.style.display = 'block';
    overlay.style.display = 'block';
  } else {
    panel.style.display = 'none';
    overlay.style.display = 'none';
  }
}

// Cierra el panel si se hace clic en el fondo oscuro
overlay.addEventListener("click", toggleSettings);


//************************* askForHint() ************************************* */
let hintUnlocked = false;
async function askForHint() {
  if (isInputBlocked) return; 
  if (hintUnlocked) {
    toastr.info(`Pista: ${selectedWordObj.hint}`);
    return;
  }

  let answer = await popup_quest();

  if (answer) {
    hintUnlocked = true;
    toastr.info(`Pista: ${selectedWordObj.hint}`);
  }
  else {
    toastr.error("Respuesta incorrecta! No hay pista para ti");
  }

}




//************************* generate_questions() ************************************* */


async function generate_questions(guessedLetters, letterColor) {

  var totalQuestions = guessedLetters.length;
 
  for (var i = 0; i < totalQuestions; i++) {
    
    try {
      if (guessedLetters[i][1] == "letter-yellow" && letterColor[guessedLetters[i][0]] == "letter-green") continue;
      let answer = await popup_quest(i, totalQuestions);

      if (answer) {
        letterColor[guessedLetters[i][0]] = guessedLetters[i][1];
      }
      else {
        letterColor[guessedLetters[i][0]] = "none";
      }
    } catch (error) {
      console.error("Error en popup_quest:", error);
    }
  }

}

//************************* toggleDaltonicMode() ************************************* */
//-> el modo se matiene incluso al recargar
document.addEventListener("DOMContentLoaded", () => {
  let body = document.body;
  let isDaltonic = localStorage.getItem("daltonicMode") === "enabled";

  const toggle = document.querySelector("#daltonic-mode");

  if (isDaltonic) {
    body.classList.add("colorblind");
    toggle.checked = true;
  } else {
    body.classList.remove("colorblind");
    toggle.checked = false;
  }
});


function toggleDaltonicMode() {


  let body = document.body;
  let isDaltonic = body.classList.toggle("colorblind");

  localStorage.setItem("daltonicMode", isDaltonic ? "enabled" : "disabled");

}


//************************* Eliminar popup ************************************* */
function delete_popup() {
  let modal = document.querySelector(".modal-content");
  modal.innerHTML = "";
  let questionModal = document.getElementById("questionModal")
  questionModal.style.display = "none";

}
//************************* Mostrar Pregunta ************************************* */


async function popup_quest(i = 0, totalQuestions = 1) {
  return new Promise(async (resolve) => {
    isInputBlocked = true;
    if (availableQuestionsForGame.length === 0) { 
        console.warn("Se han jugado todas las preguntas. Reiniciando preguntas.");
        resetAvailableQuestions();
    }

    let questions = availableQuestionsForGame;
    if (!questions) {
      console.error("No se pudieron cargar las preguntas.");
      resolve(false);
      return;
    }

    let question = getUniqueRandomQuestion();

    // Asegurar que los datos sean 
    let options = [];

    options = Array.isArray(question.options)
      ? question.options
      : [question.options];

    options = options.map(opt =>
      typeof opt === 'string'
        ? opt.replace(/^"(.*)"$/, '$1').trim()
        : opt
    );

    let rightAnswers;
    if (Array.isArray(question.correctAnswer)) {
      rightAnswers = question.correctAnswer;
    } else {
      // Si `correctAnswer` es un valor simple (como "si" o "6"), lo convertimos a un array para `.map`
      rightAnswers = [question.correctAnswer];
    }

    rightAnswers = rightAnswers.map(ans =>
      typeof ans === 'string'
        ? ans.replace(/^"(.*)"$/, '$1').trim()
        : ans
    );

    let quest = document.querySelector(".modal-content");
    quest.innerHTML = "";

    let questionCounter = document.createElement("div");
    questionCounter.id = "questionCounter";
    questionCounter.style.position = "absolute";
    questionCounter.style.right = "2rem";
    questionCounter.style.fontWeight = "bold";
    questionCounter.innerText = `${i + 1}/${totalQuestions}`;
    quest.appendChild(questionCounter);

    let p_quest = document.createElement("p");
    p_quest.innerText = question.question;
    quest.appendChild(p_quest);

    let form = document.createElement("form");
    form.id = "options";

    let optionsContainer = document.createElement("div");
    optionsContainer.classList.add("options-container");

    options.forEach((option, index) => {
      let inputType = question.type === "multichoice" ? "checkbox" : "radio";

      let optionElement = document.createElement("p");

      let input = document.createElement("input");
      input.type = inputType;
      input.id = `option-${index}`;
      input.name = "option";
      input.value = option;

      let label = document.createElement("label");
      label.htmlFor = `option-${index}`;
      label.innerText = option;

      optionElement.appendChild(input);
      optionElement.appendChild(label);
      optionsContainer.appendChild(optionElement);
    });

    form.appendChild(optionsContainer);
    quest.appendChild(form);

    let submit = document.createElement("button");
    submit.id = "submit";
    submit.innerText = "Submit";
    quest.appendChild(submit);

    document.getElementById("questionModal").style.display = "block";

    submit.addEventListener("click", function (event) {
      event.preventDefault();
      let selectedOptions = Array.from(document.querySelectorAll('input[name="option"]:checked')).map(el => el.value);

      if (selectedOptions.length > 0) {
        let result = checkAnswer(selectedOptions, rightAnswers);
        document.getElementById("questionModal").style.display = "none";
        isInputBlocked = false;
        resolve(result);
      } else {
        toastr.error("Por favor, selecciona al menos una respuesta.");
      }
    });
  });
}

// ******************************* TODO : Trasladar al script *************************************
function checkAnswer(selected, correct) {
  let isCorrect = selected.length === correct.length && selected.every(ans => correct.includes(ans));
  if (isCorrect) {
    toastr.success("Respuesta Correcta!");
  } else {
    toastr.error("Respuesta Incorrecta!");
  }
  return isCorrect;
}

function insertLetter(pressedKey) {
  if (isProcessingGuess) return; //No permite interactuar con el string que se está procesando
  if (nextLetter >= wordsize) {
    return;
  }
  pressedKey = pressedKey.toLowerCase();

  let row = document.getElementsByClassName("letter-row")[NUMBER_OF_GUESSES - guessesRemaining];
  let box = row.children[nextLetter];
  animateCSS(box, "pulse");
  box.textContent = pressedKey;
  box.classList.add("filled-box");
  currentGuess.push(pressedKey);
  nextLetter += 1;
}

const animateCSS = (element, animation, prefix = "animate__") =>
  // We create a Promise and return it
  new Promise((resolve, reject) => {
    const animationName = `${prefix}${animation}`;
    // const node = document.querySelector(element);
    const node = element;
    node.style.setProperty("--animate-duration", "0.8s");

    node.classList.add(`${prefix}animated`, animationName);

    // When the animation ends, we clean the classes and resolve the Promise
    function handleAnimationEnd(event) {
      event.stopPropagation();
      node.classList.remove(`${prefix}animated`, animationName);
      resolve("Animation ended");
    }

    node.addEventListener("animationend", handleAnimationEnd, { once: true });
  });

document.addEventListener("keyup", (e) => {
  if (isInputBlocked) return;
  if (guessesRemaining === 0) {
    return;
  }

  let pressedKey = String(e.key).toLowerCase(); 

  if (["shift", "control", "alt", "meta", "capslock", "tab", "escape"].includes(pressedKey)) {
    return;
  }

  if (pressedKey === "backspace") {
    deleteLetter();
    return;
  }

  if (pressedKey === "enter") {
    checkGuess();
    return;
  }

  if (/^[a-zñ]$/.test(pressedKey)) {  // Verifica si es una letra válida
    insertLetter(pressedKey);
  }
});


document.getElementById("keyboard-cont").addEventListener("click", (e) => {
  const target = e.target;

  if (target.closest('.delete-button')) {
    document.dispatchEvent(new KeyboardEvent("keyup", { key: "Backspace" }));
    return;
  }

  if (target.closest('.keyboard-button')) {
    let key = target.textContent.trim();
    document.dispatchEvent(new KeyboardEvent("keyup", { key: key }));
  }
});




//Puntos de partida
function updateDisplayPoints(points) {
  document.getElementById("pointsDisplay").textContent = points;
}

function updatePoints(points) {
  let currentPoints = localStorage.getItem("points") ?? 0;
  let newPoints = parseInt(currentPoints) + points;
  localStorage.setItem("points", newPoints);
  updateDisplayPoints(newPoints);
}

async function endGame() {
  // Se obtiene la puntuación final
  const points = parseInt(localStorage.getItem("points") || 0, 10);
  localStorage.removeItem("points");


  //Se muestra popup de fin de wordle
  openPopupPoints(points);


  //Se suman los puntos en la BD
  try {
    await apiService.saveGameResult(wordleId, { score: points }); // Usa el userId del JWT
    toastr.success('Puntuación guardada exitosamente.');
  } catch (err) {
    console.error('Error guardando puntuación:', err);
    toastr.error('Error al guardar la puntuación.');
  }

  return points;
}


window.backFromWordle = function backFromWordle() {
  openPopup("wordle-back");
}


initGame();
window.toggleDaltonicMode = toggleDaltonicMode;
window.toggleSettings = toggleSettings;
window.askForHint = askForHint;