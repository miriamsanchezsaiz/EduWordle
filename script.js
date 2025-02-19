import { WORDS } from "./words.js";
import { WORDLE_WORDS } from "./w_words.js";
import { questions } from "./questions.js";

// Editable variables for an specific wordle
const NUMBER_OF_GUESSES = 6;
let guessesRemaining = NUMBER_OF_GUESSES;



let selectedWordObj = WORDLE_WORDS[Math.floor(Math.random() * WORDLE_WORDS.length)];
let config_hint = selectedWordObj.hint ? true : false;

let currentGuess = [];
let nextLetter = 0;
let rightGuessString = selectedWordObj.word;
let wordsize = rightGuessString.length;

const hintButton = document.getElementById("hint-button");

console.log(rightGuessString);

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

  if (config_hint) {
    hintButton.style.display = "block";  // Mostrar botón si hay hint
  } else {
      hintButton.style.display = "none";  // Ocultar botón si no hay hint
  }

console.log("Palabra seleccionada:", selectedWordObj.word);
console.log("Hint disponible:", config_hint ? selectedWordObj.hint : "No hay hint");

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
  let row = document.getElementsByClassName("letter-row")[NUMBER_OF_GUESSES - guessesRemaining];
  let box = row.children[nextLetter - 1];
  box.textContent = "";
  box.classList.remove("filled-box");
  currentGuess.pop();
  nextLetter -= 1;
}



async function checkGuess() {
  let row = document.getElementsByClassName("letter-row")[NUMBER_OF_GUESSES - guessesRemaining];
  let guessString = "";
  let rightGuess = Array.from(rightGuessString);

  for (const val of currentGuess) {
    guessString += val;
  }


  if (guessString.length != wordsize) {
    toastr.error("Not enough letters!");
    return;
  }

  if (!WORDS.some(entry => entry.word === guessString) && !WORDLE_WORDS.some(entry => entry.word === guessString)) {
    toastr.error("Word not in list!");
    return;
  }


  //********************* Here an educational thing **************************
  if (guessString === rightGuessString) {         //si se adivina la palabra, preguntas y fin del juego

    let answer = await popup_quest();
    if (answer) {                                 // si la respuesta es correcta, se cierra la pregunta
      // TODO: Add end game logic
      toastr.success("You guessed right! Game over!");
      guessesRemaining = 0;
      delete_popup();
      
      for (let i = 0; i < wordsize; i++) {
        let box = row.children[i];
        let delay = 250 * i;
        setTimeout(() => {
          //flip box
          animateCSS(box, "flipInX");
          //shade box
  
            box.classList.remove("letter-grey", "letter-yellow");
            box.classList.add("letter-green");
  
            shadeKeyBoard(guessString.charAt(i) + "", "letter-green");
  
        }, delay);
                 
  
        }
      


      return;
    }
    else {
      
      console.log("Respuesta a pregunta de palabra incorrecta");
      
    }

    delete_popup();

  } else {                                       


    //************************************** chech_letters() **************************************** */

    var letterColor = Array(wordsize).fill("letter-grey");
    
    // Será una lista de nodos, cada nodo representa una letra acertada, en el primer valor se guardará la posición de la letra (i) y en el segunto, el color al que cambia (amarillo o verde)
    var guessedLetters = [];

    //************ check green + pop up quest
    for (let i = 0; i < wordsize; i++) {

      
      if (rightGuess[i] == currentGuess[i]) {
        guessedLetters.push([i, "letter-green"]);
        rightGuess[i] = "#";


      }
    }

    //********** check yellow letters
    for (let i = 0; i < wordsize; i++) {
      // si ya se ha marcado como verde, ignore
      if (rightGuess[i] == "#") continue;

      for (let j = 0; j < wordsize; j++) {
        if (rightGuess[j] == currentGuess[i]) {
          guessedLetters.push([i, "letter-yellow"]);
          rightGuess[j] = "#";
          j = wordsize;
         
        }
      }
    }
    //************************************** generate_questions() **************************************** */
    await generate_questions(guessedLetters, letterColor);

    //************************************** DONE : Hacer adaptable a tamaño de la palabra **************************************** */
    for (let i = 0; i < wordsize; i++) {
      let box = row.children[i];
      let delay = 250 * i;
      setTimeout(() => {
        //flip box
        animateCSS(box, "flipInX");
        //shade box
        if(letterColor[i] != "none"){

          box.classList.remove("letter-grey", "letter-yellow", "letter-green");
          box.classList.add(letterColor[i]);

          shadeKeyBoard(guessString.charAt(i) + "", letterColor[i]);

        }
        else{
          box.classList.remove("letter-grey", "letter-yellow", "letter-green");
          box.classList.add("letter-failed");
        }
               

      }, delay);
    }
    
    }

    //Si fallas la pregunta de la palabra, también pierdes un intento
    guessesRemaining -= 1;
    currentGuess = [];
    nextLetter = 0;


    if (guessesRemaining === 0) {
      toastr.error("You've run out of guesses! Game over!");
      toastr.info(`The right word was: "${rightGuessString}"`);
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
async function popup_quest(i = 0, totalQuestions = 1) {
  return new Promise((resolve) => {
      let question = questions[Math.floor(Math.random() * questions.length)];
      let options = question.options;
      let rightAnswers = question.correctAnswer;
      let answer = [];

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

      for (let i = 0; i < options.length; i++) {
          let inputType = question.type === "multiple" ? "checkbox" : "radio";
          
          let optionElement = document.createElement("p");
          
          let input = document.createElement("input");
          input.type = inputType;
          input.id = options[i];
          input.name = "option";
          input.value = options[i];

          let label = document.createElement("label");
          label.htmlFor = options[i];
          label.innerText = options[i];

          optionElement.appendChild(input);
          optionElement.appendChild(label);
          optionsContainer.appendChild(optionElement);
      }

      form.appendChild(optionsContainer);

      quest.appendChild(form);

      let submit = document.createElement("button");
      submit.id = "submit";
      submit.innerText = "Submit";
      quest.appendChild(submit);

      document.getElementById("questionModal").style.display = "block";

      submit.addEventListener("click", function (event) {
          event.preventDefault();
          let selectedOptions = document.querySelectorAll('input[name="option"]:checked');
          answer = Array.from(selectedOptions).map(option => option.value);

          if (answer.length > 0) {
              let result = checkAnswer(answer, rightAnswers);
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
  if (nextLetter === wordsize) {
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

  let pressedKey = String(e.key);
  if (pressedKey === "Backspace" && nextLetter !== 0) {
    deleteLetter();
    return;
  }

  if (pressedKey === "Enter") {
    checkGuess();
    return;
  }

  let found = pressedKey.match(/[a-z]/gi);
  if (!found || found.length > 1) {
    return;
  } else {
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


initBoard();
window.toggleDaltonicMode = toggleDaltonicMode;
window.toggleSettings = toggleSettings;
window.askForHint = askForHint;
