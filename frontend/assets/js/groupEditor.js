import { Wordle } from "/backend/utils/Wordle.js";
import { Group } from "/backend/utils/Group.js";
import { Student } from "/backend/utils/Student.js";



// TODO: especificar formato fecha
// TODO: especificar que cuando se cree un nuevo group, initDate sea hoy
// TODO: conectar BD

//ONGOING: copiar de wordleEditor.js

let sessionGroup = null;
const params = new URLSearchParams(window.location.search);
const mode = params.get("mode"); // ["create", "edit", "visual"]
const groupId = params.get("id"); // solo existe en "edit" y "visual"
const teacherId = params.get("teacherId");


// function generateSafeId() {
//     return crypto.randomUUID().replace(/-/g, "");
// }


document.addEventListener("DOMContentLoaded", function () {
    const today = new Date().toISOString().split("T")[0];
    const nextYear = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0];

    document.getElementById("initDate").value = today;
    document.getElementById("endDate").value = nextYear;

    const noEndDate = document.getElementById("noEndDate");
    const setEndDate = document.getElementById("setEndDate");
    const endDateInput = document.getElementById("endDate");

    noEndDate.addEventListener("change", function () {
        endDateInput.disabled = true;
    });

    setEndDate.addEventListener("change", function () {
        endDateInput.disabled = false;
    });
});


document.addEventListener("DOMContentLoaded", function () {


    document.getElementById("pageTitle").textContent =
        mode === "edit" ? "Editar Grupo" : mode === "visual" ? "Ver Grupo" : "Crear Grupo";


    // carga de datos
    if ((mode === "edit" || mode === "visual") && groupId) {
        sessionGroup = loadGroupData(groupId);

        if (mode === "edit") {
            displayAddButton();
        }

        dispalyData(sessionGroup);
    }
    else {
        // TODO: fase pruebas
        sessionGroup = newGroup();

        // const today = new Date().toISOString().split("T")[0];
        //sessionGroup = new Group("", teacherId, [], [], today, null);
        displayAddButton();
        dispalyData(sessionGroup, "edit");

    }
});

function loadGroupData(wordleId) {
    //FETCH
    const students = [
        new Student("example1@mail.com"),
        new Student("example2@mail.com"),
        new Student("example3@mail.com")
    ];
    const wordles = [
        new Wordle("Wordle A"),
        new Wordle("Wordle B"),
        new Wordle("Wordle C")

    ];
    const initDate = "2021-10-10";


    return new Group("Grupo de prueba", teacherId, students, wordles, initDate);
}

function dispalyData(Group) {

    if (mode === "visual") {
        const groupSection = document.querySelector(".group-name");
        groupSection.innerHTML = `<h1>${Group.getName()}</h1>`;

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



        toggleDateDisplay(Group);
    }
    else {
        document.getElementById("groupName").value = Group.getName();
        diplayConfig(Group.getInitDate(), Group.getEndDate());
    }

    //DISPLAY
    displayItems(Group.getStudents(), "students");
    displayItems(Group.getWordles(), "wordles");


    //CHECK OVERFLOW
    checkOverflow();
}

function toggleDateDisplay(Group) {
    const initDateInput = document.getElementById("initDate");
    const endDateInput = document.getElementById("endDate");
    const noEndDateRadio = document.getElementById("noEndDate");
    const setEndDateRadio = document.getElementById("setEndDate");


    const initDateText = document.createElement("div");
    initDateText.classList.add("date-box");
    initDateText.textContent = Group.getInitDate();

    const endDateText = document.createElement("div");
    endDateText.classList.add("date-box");
    endDateText.textContent = Group.getEndDate() || "Fecha no definida";

    // Reemplazar los inputs por los divs con fecha
    initDateInput.replaceWith(initDateText);
    endDateInput.replaceWith(endDateText);

    // Ocultar los radio buttons y etiquetas asociadas
    noEndDateRadio.parentElement.style.display = "none";
    setEndDateRadio.parentElement.style.display = "none";
}

function displayAddButton() {
    let elements = ["students", "wordles"];
    elements.forEach(element => {
        const container = document.getElementById("container-" + element);
        container.innerHTML = `<div class='add-button' onclick="openPopup('${element}')">+</div>`;
    });
}



function newGroup() {
    //TODO: esto hay que cambiarlo para que haga un fetch real y quitar el display y checkOverflow
    // función sin servidor
    const sampleStudents = [
        new Student("example1@gmail.com"),
        new Student("example2@gmail.com"),
        new Student("example3@gmail.com"),
        new Student("example4@gmail.com"),
        new Student("example5@gmail.com"),
        new Student("example6@gmail.com"),
        new Student("example7@gmail.com"),
        new Student("example8@gmail.com")
    ];

    const sampleWordles = [
        new Wordle("Wordle Ejemplo1", 111),
        new Wordle("Wordle Ejemplo2", 222),
        new Wordle("Wordle Ejemplo3", 333),
        new Wordle("Wordle Ejemplo4", 444),
        new Wordle("Wordle Ejemplo5", 555),
        new Wordle("Wordle Ejemplo6", 666),
        new Wordle("Wordle Ejemplo7", 777),
        new Wordle("Wordle Ejemplo8", 888)
    ];

    sampleInitDate = "2025-10-10";


    return new Group(
        "Wordle ejemplo muchos datos",
        teacherId,
        sampleStudents,
        sampleWordles,
        sampleInitDate
    );

}

function displayItems(items, element) {
    //items = [Student, Wordle]
    const container = document.getElementById("container-" + element);
    items.forEach(item => displayItem(item, element));


    const section = container.parentElement;
    let showMoreButton = section.querySelector(".show-more");
    if (!showMoreButton) {
        showMoreButton = document.createElement("div");
        showMoreButton.classList.add("show-more", "hidden");
        showMoreButton.id = "showMoreButton";
        showMoreButton.textContent = "+";
        showMoreButton.onclick = function () { toggle(this); };
        section.appendChild(showMoreButton);
    }
}

function displayItem(item, element) {
    const container = document.getElementById("container-" + element);

    let elementId = "";
    let form = "list";
    let displayedText = "";


    switch (element) {
        case "students":
            displayedText = "mail";
            elementId = "studentId";
            break;
        case "wordles":
            displayedText = "name";
            elementId = "wordleId";
            break;

    }


    const itemElement = document.createElement("div");
    itemElement.classList.add((form || element) + "-item");
    itemElement.id = `item-${item[elementId]}`;

    //text item
    const textElement = document.createElement("a");
    textElement.textContent = displayedText === "mail" ? item[displayedText].split("@")[0] : item[displayedText];
    itemElement.appendChild(textElement);

    //button item
    if (mode !== "visual") {
        const closeButton = document.createElement("button");
        closeButton.classList.add("item-remove");
        closeButton.setAttribute("aria-label", "Remove");
        closeButton.setAttribute("onclick", `removeItemById('${item[elementId]}' , '${element}')`);
        itemElement.appendChild(closeButton);

    }
    container.appendChild(itemElement);


}

function diplayConfig(initDate, endDate) {
    document.getElementById("initDate").value = initDate;
    if (endDate) {
        document.getElementById("setEndDate").checked = true;
        document.getElementById("endDate").value = endDate;
    } else {
        document.getElementById("noEndDate").checked = true;
        document.getElementById("endDate").disabled = true;
    }
}

//*************************************************************************************** 
// Remove Item from list
//***************************************************************************************
window.removeItemById = function removeItemById(objectID, type) {

    console.log("remove function called");
    //TODO: cambiar cuando se use un wordle real con Students y Wordles
    // console.log("type: ", type);
    // // Remove from storage
    // const functionName = `remove${type.charAt(0).toUpperCase()}${type.slice(1)}`;

    // //removeWordles() / removeStudents()
    // sessionGroup[functionName](objectID);



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
    let elements = ["students", "wordles"];
    const VISIBLE_LIMIT = 3;


    elements.forEach(element => {

        const container = document.getElementById("container-" + element);
        const section = container.closest(".group-section");
        const showMoreButton = section.querySelector(".show-more");


        if (element === "students") {
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
    const section = button.closest(".group-section");
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

window.saveStudent = function () {

    console.log("sessionGroup students pre saveStudent: ", sessionGroup.getStudents());
    const studentInput = document.getElementById("email").value.trim();

    if (!studentInput) {
        toastr.error("El mail es obligatorio.");
        return;
    }

    const partes = studentInput.split("@");
    if (partes.length !== 2 || !partes[0] || !partes[1]) {
        toastr.error("El mail no es válido.");
        return;
    }

    const dominio = partes[1].split(".");
    if (dominio.length < 2 || dominio.some(part => part.length < 2)) {
        toastr.error("El dominio del mail no es válido.");
        return;
    }	

    const existingMails = sessionGroup.getStudents();
    const alreadyExists = existingMails.some(student => student.getMail() === studentInput);


    if (alreadyExists) {
        toastr.error("Este alumno ya ha sido añadido.");
        return;
    }


    // Crear un nuevo estudiante
    const student = new Student(studentInput);


    document.getElementById("email").value = "";

    sessionGroup.addStudent(student);
    console.log("Nuevo alumno guardado:", student);
    console.log("sessionGroup students: ", sessionGroup.getStudents());

    toastr.success("Alumno añadido");
    closePopup();

    displayItem(student, "students");
    checkOverflow();
};

window.saveWordle = function () {
    console.log("saveWordle called");

    const wordleSelect = document.getElementById("wordle-select");
    const selectedWordleId = wordleSelect.value.trim();
    const selectedWordleName = wordleSelect.options[wordleSelect.selectedIndex]?.textContent;


    if (!selectedWordleName) {
        toastr.error("Debes seleccionar un wordle");
        return;
    }

    const existingWordles = sessionGroup.getWordles();
    const alreadyExists = existingWordles.some(wordle => wordle.wordleId === selectedWordleId);

    if (alreadyExists) {
        toastr.error("Este wordle ya ha sido añadido.");
        return;
    }



    // Crear objeto de wordle
    const wordleObject = { wordleId: selectedWordleId, name: selectedWordleName };

    sessionGroup.addWordle(wordleObject);
    console.log("Wordle guardado:", wordleObject);

    wordleSelect.value = "";

    console.log("sessionGroup actual: ", sessionGroup.getWordles());

    toastr.success("Wordle añadido");
    closePopup();
    displayItem(wordleObject, "wordles");
    checkOverflow();
};

// function saveGroup(){
//     //TODO: conectar con la bd para que guarde el Wordle
// }




