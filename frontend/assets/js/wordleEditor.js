import { Wordle } from "/backend/utils/Wordle.js";
import { Word } from "/backend/utils/Word.js";
import { Question } from "/backend/utils/Question.js";
import { Group } from "/backend/utils/Group.js";


//TODO: importar utils
//TODO: conectar a BD
//TODO: (opcional) fusionar con grupo

//ONGOING: funcion saveWordles



let sessionWordle = null;
const params = new URLSearchParams(window.location.search);
const mode = params.get("mode"); // ["create", "edit", "visual"]
const wordleId = params.get("id");
const teacherId = params.get("teacherId");

// function generateSafeId() {
//     return crypto.randomUUID().replace(/-/g, ""); 
// }



document.addEventListener("DOMContentLoaded", function () {

    document.getElementById("pageTitle").textContent =
        mode === "edit" ? "Editar Wordle" : mode === "visual" ? "Ver Wordle" : "Crear Wordle";


    // cargar DOM
    if ((mode === "edit" || mode === "visual") && wordleId) {
        sessionWordle = loadWordleData(wordleId);

        if (mode === "edit") {
            displayAddButton();
        }

        dispalyData(sessionWordle);
    }
    else {
        //TODO: fase pruebas
        sessionWordle = newWordle();
        // sessionWordle = new Wordle("", teacherId, [], [], []);

        displayAddButton();
        dispalyData(sessionWordle, "edit");

    }
});


function loadWordleData(wordleId) {
    //TODO: cambiar a BD
    //FETCH

    const words = [
        new Word("HTML"),
        new Word("CSS"),
        new Word("JavaScript")
    ];

    const questions = [
        new Question("¿Qué es SCRUM?"),
        new Question("¿Qué es HTML?"),
        new Question("¿Para qué sirve CSS?"),

    ];

    const groups = [
        new Group("Grupo A"),
        new Group("Grupo B"),
        new Group("Grupo C"),
        new Group("Grupo D")
    ];


    return new Wordle("Wordle de prueba", teacherId, words, questions, groups);
}

function dispalyData(Wordle) {
    if (mode === "visual") {
        const wordleSection = document.querySelector(".wordle-name");
        wordleSection.innerHTML = `<h1>${Wordle.getName()}</h1>`;


        const container = document.querySelector(".container");
        const saveButton = container.querySelector(".save-button");
        if (saveButton) {
            saveButton.remove();
        }
        const div = document.createElement("div");
        div.classList.add("buttonSection");

        // Crear el botón de Editar
        const editButton = document.createElement("button");
        editButton.textContent = "Editar";
        editButton.classList.add("action-button");
        editButton.classList.add("edit-button");

        editButton.onclick = function () {
            const url = new URL(window.location.href);
            url.searchParams.set("mode", "edit");
            window.location.href = url.toString();
        };


        // Crear el botón de Eliminar
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Eliminar";
        deleteButton.classList.add("action-button");
        deleteButton.classList.add("delete-button");
        //TODO: añadir el onclick para eliminar el grupo


        // Agregar los nuevos botones al contenedor
        div.appendChild(editButton);
        div.appendChild(deleteButton);
        container.appendChild(div);
    }
    else {
        document.getElementById("wordleTitle").value = Wordle.getName();
    }

    //DISPLAY
    displayItems(Wordle.getWords(), "words");
    displayItems(Wordle.getQuestions(), "questions");
    displayItems(Wordle.getGroups(), "groups");

    //CHECKOVERFLOW
    checkOverflow();


}

function displayAddButton() {
    let elements = ["words", "questions", "groups"];
    elements.forEach(element => {
        const container = document.getElementById("container-" + element);
        container.innerHTML = `<div class='add-button' onclick="openPopup('${element}')">+</div>`;
    });
}


function newWordle() {
    //TODO: esto hay que cambiarlo para que haga un fetch real 
    // No existirá esta función, solamente se llamará al constructor del Wordle
    // función sin servidor

    const sampleWords = [
        new Word("SCRUM", "jdsjvjvjjsjds"),
        new Word("XXXXXXXXX"),
        new Word("XXXXX"),
        new Word("XXXXXXXXXXX"),
        new Word("XXXXX"),
        new Word("XXXXX"),
        new Word("SCRUM", "jdsjvjvjjsjds"),
        new Word("XXXXXXXXX"),
        new Word("XXXXX"),
        new Word("XXXXX"),
        new Word("XXXXXXXXXXX"),
        new Word("XXXXX"),
        new Word("HTML")
    ];

    const sampleQuestions = [
        new Question("¿Qué es SCRUM? XXXXXXXX XXXXX XXXXXX XXXXXX XXXXXX XX XX XXXXX  XXXX XX X XXXXX XXX XX XX XXX XX X XX X X XXXXXX XXXXX XXXXXXXXXXX XXXXXXXXXXXX  XXXXXXX XXXXXXXXXXXXXXXXX XXXXXXXXXXX XXXXXXX XXXXXXXXXX XXXXXXXXXX XXXXXXXXXXXXXX XXXX XXXXXX XXXXXXXXXXX XXXXXXXX XXXXXXXXX XXXXXXXXXXXX XXXXXXXXXXX XX XXXX XXXXXXXX XXXXXXXXXXXXX XXXXXXXXXX ", [], "jdsjvjvjjsjds"),
        new Question("¿Qué es HTML?"),
        new Question("¿Qué es SCRUM?", [], "jdsjvjvjjsjds"),
        new Question("¿Qué es HTML?"),
        new Question("¿Qué es SCRUM?", [], "jdsjvjvjjsjds"),
        new Question("¿Qué es HTML?")
    ];


    const sampleGroups = [
        new Group("FIS", "11111", [], [], "2021-10-01", "2021-10-15"),
        new Group("IPS", "22222", [], [], "2021-10-01", "2021-10-15"),
        new Group("MAT", "33333", ["student1", "student2"], ["wordle1"], "2022-01-10", "2022-06-30"),
        new Group("PROG", "44444", ["student3", "student4"], ["wordle2", "wordle3"], "2023-03-15", "2023-07-20")
    ];


    return new Wordle("", teacherId, sampleWords, sampleQuestions, sampleGroups);

}

function displayItems(items, element) {
    //items = [Word, Question, Group]
    const container = document.getElementById("container-" + element);
    items.forEach(item => displayItem(item, element));


    const section = container.parentElement;
    const showMoreButton = `<div class="show-more hidden" onclick="toggle(this)">+</div>`
    section.innerHTML += showMoreButton;

}

function displayItem(item, element) {
    const container = document.getElementById("container-" + element);

    let elementId = "";
    let form = null;
    let displayedText = "";

    switch (element) {
        case "words":
            displayedText = "tittle";
            elementId = "wordId";
            break;
        case "questions":
            displayedText = "statement";
            form = "list";
            elementId = "questionId";
            break;
        case "groups":
            displayedText = "name";
            form = "list";
            elementId = "groupId";
            break;
    }

    const itemElement = document.createElement("div");
    itemElement.classList.add((form || element) + "-item");
    itemElement.id = `item-${item[elementId]}`;

    const textElement = document.createElement("a");
    textElement.textContent = item[displayedText];
    itemElement.appendChild(textElement);

    if (mode !== "visual") {
        const closeButton = document.createElement("button");
        closeButton.classList.add("item-remove");
        closeButton.setAttribute("aria-label", "Remove");
        closeButton.setAttribute("onclick", `removeItemById('${item[elementId]}', '${element}')`);

        itemElement.appendChild(closeButton);
    }
    container.appendChild(itemElement);

}





//*************************************************************************************** 
// Remove Item from list
//***************************************************************************************
window.removeItemById = function removeItemById(objectID, type) {

    //TODO: cambiar cuando se use un wordle real con Words, Questions y Groups
    // console.log("type: ", type);
    // // Remove from storage
    // const functionName = `remove${type.charAt(0).toUpperCase()}${type.slice(1)}`;

    // //removeWords() / removeQuestions() / removeGroups()
    // sessionWordle[functionName](objectID);

    //Remove HTML element
    const itemElement = document.getElementById(`item-${objectID}`);
    if (itemElement) {
        itemElement.remove();
    }

    checkOverflow();
};





//*************************************************************************************** 
//***************************************************************************************
// Funciones visuales

function checkOverflow() {
    let elements = ["words", "questions", "groups"];
    const VISIBLE_LIMIT = 3;

    elements.forEach(element => {
        const container = document.getElementById("container-" + element);
        const section = container.closest(".wordle-section");
        const showMoreButton = section.querySelector(".show-more");


        if (element === "words") {
            const wasExpanded = container.classList.contains("expanded");
            if (wasExpanded) container.classList.remove("expanded");
           
            const isOverflow = container.scrollHeight > container.clientHeight + 5;
            
            if (wasExpanded) container.classList.add("expanded");

            if (isOverflow) {
                showMoreButton.classList.remove("hidden");
            } else {
                showMoreButton.classList.add("hidden");
            }
        }
        else {
            const items = container.querySelectorAll(".list-item");
            const isOverflow = items.length > VISIBLE_LIMIT;

            if (isOverflow) {
                showMoreButton.classList.remove("hidden");
            } else {
                showMoreButton.classList.add("hidden");
            }
        }

    });
}

window.toggle = function toggle(button) {
    const section = button.closest(".wordle-section");
    const container = section.querySelector(".container-section");
    const showMoreButton = section.querySelector(".show-more");


    if (container.classList.contains("expanded")) {
        container.classList.remove("expanded");
        showMoreButton.textContent = "+";
    } else {
        container.classList.add("expanded");
        showMoreButton.textContent = "-";
    }
}

//**********************************************************************
//********************* Save Data Functions ****************************
//**********************************************************************

function saveWord() {
    const wordInput = document.getElementById("word-input").value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const hintInput = document.getElementById("hint-input").value.trim();

    if (!wordInput) {
        toastr.error("La palabra es obligatoria.");
        return;
    }

    const existingWords = sessionWordle.getWords();
    const alreadyExists = existingWords.some(word => word.getTittle() === wordInput);

    if (alreadyExists) {
        toastr.error("Esta palabra ya ha sido añadida.");
        return;
    }


    // Crear una nueva pregunta
    const word = new Word(wordInput, hintInput);


    document.getElementById("word-input").value = "";
    document.getElementById("hint-input").value = "";

    sessionWordle.addWord(word);
    console.log("Nueva palabra guardada:", word);
    console.log("sessionWordle words: ", sessionWordle.getWords());

    toastr.success("Palabra añadida");
    closePopup();

    displayItem(word, "words");
    checkOverflow();
};

function saveQuestion() {
    const statement = document.getElementById("hint-input").value.trim();
    if (!statement) {
        toastr.error("Por favor, introduce un enunciado.");
        return;
    }

    const optionsContainer = document.getElementById("options-container");
    const options = optionsContainer.querySelectorAll(".option-input");

    let optionsArray = [];
    let correctAnswers = [];

    options.forEach(option => {
        const answerText = option.querySelector("input[type='text']").value.trim();
        const isCorrect = option.querySelector("input[type='checkbox']").checked;

        if (answerText) {
            optionsArray.push(answerText);
            if (isCorrect) {
                correctAnswers.push(answerText);
            }
        }
    });

    if (optionsArray.length <= 1) {
        toastr.error("Debes agregar al menos dos respuestas.");
        return;
    }

    if (correctAnswers.length === 0) {
        toastr.error("Debes agregar al menos una respuesta correcta.");
        return;
    }

    const questionType = correctAnswers.length > 1 ? "multiple" : "single";


    const question = new Question(statement, optionsArray, correctAnswers, questionType);

    sessionWordle.addQuestion(question);

    console.log("Pregunta guardada:", question);
    console.log("sessionWordle actual: ", sessionWordle.getQuestions());

    toastr.success("Pregunta añadida");
    closePopup();
    displayItem(question, "questions");
    checkOverflow();


};

function saveGroup() {

    const groupSelect = document.getElementById("group-select");
    const selectedGroupId = groupSelect.value.trim();
    const selectedGroupName = groupSelect.options[groupSelect.selectedIndex]?.textContent;


    if (!selectedGroupName) {
        toastr.error("Debes seleccionar un grupo");
        return;
    }

    const existingGroups = sessionWordle.getGroups();
    const alreadyExists = existingGroups.some(group => group.groupId === selectedGroupId);

    if (alreadyExists) {
        toastr.error("Este grupo ya ha sido añadido.");
        return;
    }


    // Crear objeto de grupo
    const groupObject = { groupId: selectedGroupId, name: selectedGroupName };

    sessionWordle.addGroup(groupObject);
    console.log("Grupo guardado:", groupObject);

    groupSelect.value = "";

    console.log("sessionWordle actual: ", sessionWordle.getGroups());

    toastr.success("Grupo añadido");
    closePopup();
    displayItem(groupObject, "groups"); // Pasar el objeto con ID
    checkOverflow();
};

// function saveWordle(){
//     //TODO: conectar con la bd para que guarde el Wordle
// }

//********************************************************* */
//***********Asignación de funciones DOM******************* */
//********************************************************* */


document.body.addEventListener("click", (event) => {
    if (event.target.id === "save-word") {
        saveWord();
    } else if (event.target.id === "save-question") {
        saveQuestion();
    } else if (event.target.id === "save-group") {
        saveGroup();
    }
});
