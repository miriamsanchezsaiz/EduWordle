// Editable variables for an specific wordle
const NUMBER_OF_GUESSES = 6;
let guessesRemaining = NUMBER_OF_GUESSES;

let currentGuess = [];
let nextLetter = 0;
let rightGuessString = "";
let wordsize = 0;
let selectedWordObj = null;

async function fetchWords() {
  try {
      let response = await fetch('http://localhost:3000/words');
      let words = await response.json();
      return words;
  } catch (error) {
      console.error("Error al obtener palabras:", error);
      return [];
  }
}

async function initGame() {
  let words = await fetchWords();

  if (words.length === 0) {
      console.error("No se pudieron cargar las palabras.");
      return;
  }

  selectedWordObj = words[Math.floor(Math.random() * words.length)];
  rightGuessString = selectedWordObj.word;
  wordsize = rightGuessString.length;
  let config_hint = selectedWordObj.hint ? true : false;

  console.log("Palabra seleccionada:", rightGuessString);
  console.log("Hint disponible:", config_hint ? selectedWordObj.hint : "No hay hint");

  initBoard();
}

function initBoard() {
  let board = document.getElementById("game-board");

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
  if (nextLetter === 0) return;  // Evita eliminar si no hay letras ingresadas

  let row = document.getElementsByClassName("letter-row")[NUMBER_OF_GUESSES - guessesRemaining];
  let box = row.children[nextLetter - 1];
  box.textContent = "";
  box.classList.remove("filled-box");
  currentGuess.pop();
  nextLetter -= 1;
}



async function checkGuess() {
  let row = document.getElementsByClassName("letter-row")[NUMBER_OF_GUESSES - guessesRemaining];
  let guessString = currentGuess.join("");
  let rightGuess = Array.from(rightGuessString); // Copia de la palabra correcta
  let letterColor = Array(wordsize).fill("letter-grey");
  let guessedLetters = [];

  if (guessString.length !== wordsize) {
    toastr.error("Not enough letters!");
    return;
  }

  // **1️⃣ Verificar letras correctas (verde)**
  for (let i = 0; i < wordsize; i++) {
    if (guessString[i] === rightGuess[i]) {
      letterColor[i] = "letter-green";
      guessedLetters.push([i, "letter-green"]);
      rightGuess[i] = null; // Marcar como usada
    }
  }

  // **2️⃣ Verificar letras amarillas**
  for (let i = 0; i < wordsize; i++) {
    if (letterColor[i] === "letter-green") continue; // Saltar las verdes

    let letterIndex = rightGuess.indexOf(guessString[i]);
    if (letterIndex !== -1) {
      letterColor[i] = "letter-yellow";
      guessedLetters.push([i, "letter-yellow"]);
      rightGuess[letterIndex] = null; // Marcar como usada
    }
  }

  // **3️⃣ Aplicar los colores al tablero**
  for (let i = 0; i < wordsize; i++) {
    let box = row.children[i];
    let delay = 250 * i;
    setTimeout(() => {
      animateCSS(box, "flipInX");
      box.classList.remove("letter-grey", "letter-yellow", "letter-green");
      box.classList.add(letterColor[i]);
      shadeKeyBoard(guessString[i], letterColor[i]);
    }, delay);
  }

  // **4️⃣ Si la palabra es correcta, hacer pregunta**
  if (guessString === rightGuessString) {
    let answer = await popup_quest();
    if (answer) {
      toastr.success("You guessed right! Game over!");
      guessesRemaining = 0;
      delete_popup();
      return;
    }
  }

  // **5️⃣ Reducir intentos**
  guessesRemaining--;
  currentGuess = [];
  nextLetter = 0;

  if (guessesRemaining === 0) {
    toastr.error(`Game over! The word was: "${rightGuessString}"`);
  }
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
async function askForHint(){
  if (hintUnlocked) {
    toastr.info(`Hint: ${selectedWordObj.hint}`);
    return;
  }

  let answer = await popup_quest();

  if (answer) {
    hintUnlocked = true;
    toastr.info(`Hint: ${selectedWordObj.hint}`);
  }
  else{
    toastr.error("Wrong answer! No hint for you!");
  }
  
}




//************************* generate_questions() ************************************* */


async function generate_questions(guessedLetters, letterColor){

  var totalQuestions = guessedLetters.length;
  
  for (var i = 0; i < totalQuestions; i++){

      //print number of question/ total questions
      console.log("Pregunta " + (i+1) + "/" + totalQuestions);
      //preguntar
      try {
              if ( guessedLetters[i][1] == "letter-yellow" && letterColor[guessedLetters[i][0]] == "letter-green")  continue;
              let answer = await popup_quest(i, totalQuestions);

              if (answer) {
                letterColor[guessedLetters[i][0]] = guessedLetters[i][1];
              }
              else {
                console.log("Respuesta incorrecta: no se hace shade");
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
  }
});


function toggleDaltonicMode() {
  
 
  let body = document.body;
  let isDaltonic = body.classList.toggle("colorblind"); 

  localStorage.setItem("daltonicMode", isDaltonic ? "enabled" : "disabled");

  console.log("Modo daltónico activado:", document.body.classList.contains("colorblind"));
  console.log("Valor en localStorage:", localStorage.getItem("daltonicMode"));

}


//************************* TODO : Trasladar al script ************************************* */
function delete_popup() {
  let modal = document.querySelector(".modal-content");
  modal.innerHTML = "";
  document.getElementById("questionModal").style.display = "none";

}
//************************* TODO : Trasladar al script ************************************* */

async function fetchQuestions() {
  try {
      let response = await fetch('http://localhost:3000/questions');
      let questions = await response.json();
      return questions;
  } catch (error) {
      console.error("Error al obtener preguntas:", error);
      return [];
  }
}


async function popup_quest(i = 0, totalQuestions = 1) {
  return new Promise(async (resolve) => {
    let questions = await fetchQuestions();

    if (!questions || questions.length === 0) {
      console.error("No se pudieron cargar las preguntas.");
      resolve(false);
      return;
    }

    let question = questions[Math.floor(Math.random() * questions.length)];

    // Asegurar que los datos sean 
    let options = [];
    let rightAnswers = [];
    options = Array.isArray(question.options) ? question.options : JSON.parse(question.options);
    rightAnswers = Array.isArray(question.correctAnswer) ? question.correctAnswer : JSON.parse(question.correctAnswer);

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
      let inputType = question.type === "multiple" ? "checkbox" : "radio";

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
        resolve(result);
      } else {
        toastr.error("Please select at least one option before submitting.");
      }
    });
  });
}

// ******************************* TODO : Trasladar al script *************************************
function checkAnswer(selected, correct) {
  let isCorrect = selected.length === correct.length && selected.every(ans => correct.includes(ans));
  if (isCorrect) {
      toastr.success("Correct Answer!");
  } else {
      toastr.error("Wrong Answer!");
  }
  return isCorrect;
}

function insertLetter(pressedKey) {
  //************************************** DONE : Hacer adaptable a tamaño de la palabra **************************************** */
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
    if (guessesRemaining === 0) {
      return;
    }
  
    let pressedKey = String(e.key).toLowerCase(); // Convertir siempre a minúscula
  
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


initGame();
window.toggleDaltonicMode = toggleDaltonicMode;
window.toggleSettings = toggleSettings;
window.askForHint = askForHint;
