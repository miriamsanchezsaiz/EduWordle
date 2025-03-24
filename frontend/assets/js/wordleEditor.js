
//TODO: conectar a BD
//TODO: hacer pop-ups en el add button
//TODO: (opcional) fusionar con grupo
// document.addEventListener("DOMContentLoaded", function () {
//     checkOverflow();

// });

document.addEventListener("DOMContentLoaded", function () {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode"); // ["create", "edit", "visual"]
    const wordleId = params.get("id"); // solo existe en "edit" y "visual"
    


    document.getElementById("pageTitle").textContent = 
    mode === "edit" ? "Editar Wordle" : mode === "visual" ? "Ver Wordle" : "Crear Wordle";


    // carga de datos
    if ((mode === "edit" || mode === "visual") && wordleId) {
            let Wordle = loadWordleData(wordleId);

            if(mode === "edit"){
                displayAddButton();
            }

            dispalyData(Wordle, mode);
    }
    else{ 
        // TODO: esto hay que cambiarlo ya que es de pueba, 
        // habría que crear una instancia nueva de "Wordle"
        let Wordle = newWordle();
        displayAddButton();
        dispalyData(Wordle, "edit");
        
    }
});


function loadWordleData(id) {
    //FETCH
    const wordleData = {
        name: "Wordle de prueba",
        words: [
            { tittle: "HTML"}, { tittle: "CSS"}, { tittle: "JavaScript"}        
        ],
        questions: [
            { enunciado: "¿Qué es SCRUM?"},
            { enunciado: "¿Qué es HTML?"},
            { enunciado: "¿Para qué sirve CSS?"}        
        ],
        groups: [{nombre:"Grupo A"}, {nombre:"Grupo B"}]
    };

    return wordleData;
}

function dispalyData(Wordle, mode) {
    if(mode === "visual")
        {
            const wordleSection = document.querySelector(".wordle-name");
            wordleSection.innerHTML = `<h1>${Wordle.name}</h1>`;

           
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

            // Agregar los nuevos botones al contenedor
            div.appendChild(editButton);
            div.appendChild(deleteButton);
            container.appendChild(div);
        }
        else{
            document.getElementById("wordleTitle").value = Wordle.name;
        }
        displayItems( Wordle.words, "words");
        displayItems(Wordle.questions, "questions");
        displayItems( Wordle.groups, "groups");
    
        //CHECK OVERFLOW
        checkOverflow();
    }

function displayAddButton() {
    elements= ["words", "questions", "groups"];
    elements.forEach(element => {
        const container = document.getElementById("container-"+ element);
        container.innerHTML = `<div class='add-button' onclick="openPopup('${element}')">+</div>`;
    });
}

// function openPopup(type) {
//     alert("Abrir pop-up para añadir " + type);
// }




function newWordle() {
    //TODO: esto hay que cambiarlo para que haga un fetch real y quitar el display y checkOverflow
    // función sin servidor
    
    const sampleWords = [
        { tittle: "SCRUM", hint: "jdsjvjvjjsjds" },
        { tittle: "XXXXXXXXX", hint: "" },
        { tittle: "XXXXX", hint: "" },
        { tittle: "XXXXXXXXXXX", hint: "" },
        { tittle: "XXXXX", hint: "" },
        { tittle: "XXXXX", hint: "" },
        { tittle: "SCRUM", hint: "jdsjvjvjjsjds" },
        { tittle: "XXXXXXXXX", hint: "" },
        { tittle: "XXXXX", hint: "" },
        { tittle: "XXXXX", hint: "" },
        { tittle: "XXXXXXXXXXX", hint: "" },
        { tittle: "XXXXX", hint: "" },
        { tittle: "HTML", hint: "" }
    ];

    const sampleQuestions = [
        { enunciado: "¿Qué es SCRUM? XXXXXXXX XXXXX XXXXXX XXXXXX XXXXXX XX XX XXXXX  XXXX XX X XXXXX XXX XX XX XXX XX X XX X X XXXXXX XXXXX XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", answer: "jdsjvjvjjsjds", type: "simple", opciones: [] },
        { enunciado: "¿Qué es HTML?", answer: "", type: "simple", opciones: [] },
        { enunciado: "¿Qué es SCRUM?", answer: "jdsjvjvjjsjds", type: "simple", opciones: [] },
        { enunciado: "¿Qué es HTML?", answer: "", type: "simple", opciones: [] },
        { enunciado: "¿Qué es SCRUM?", answer: "jdsjvjvjjsjds", type: "simple", opciones: [] },
        { enunciado: "¿Qué es HTML?", answer: "", type: "simple", opciones: [] }
    ];

    const sampleGruops = [
        { ID: "11111", nombre: "FIS", fechaInicio: "2021-10-01", fechaFin: "2021-10-30", fechaFin: "2021-10-15" },
        { ID: "22222", nombre: "IPS", fechaInicio: "2021-10-01", fechaFin: "2021-10-30", fechaFin: "2021-10-15" }
    ];


    const wordleData = {
        name: "",
        words: sampleWords,
        questions: sampleQuestions,
        groups: sampleGruops
    };
    return wordleData;


    }

function displayItems(items, element) {

    const container = document.getElementById("container-" + element);
    switch(element) {
        case "words":
            displayedText = "tittle";
            break;
        case "questions":
            displayedText = "enunciado";
            element = "list";

            break;
        case "groups":
            displayedText = "nombre";
            element = "list";
            break;
    }

    items.forEach(item => {
        const itemElement = document.createElement("div");
        itemElement.classList.add(element + "-item");
        itemElement.textContent = item[displayedText];

        container.appendChild(itemElement);
    });

    const section =  container.parentElement;
    const showMoreButton = `<div class="show-more hidden" onclick="toggle(this)">+</div>`
    section.innerHTML += showMoreButton;
}

//*************************************************************************************** 
//***************************************************************************************
// Funciones visuales

function checkOverflow() {
    elements= ["words", "questions", "groups"];
    elements.forEach(element => {
        const container = document.getElementById("container-" + element);
        const section = container.closest(".wordle-section");
        const showMoreButton = section.querySelector(".show-more");

        if (container.scrollHeight > container.clientHeight + 5) {
            showMoreButton.classList.remove("hidden");
        } else {
            showMoreButton.classList.add("hidden");
        }
    });
}

function toggle(button) {
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


