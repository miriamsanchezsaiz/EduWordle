
// TODO: especificar formato fecha
// TODO: especificar que cuando se cree un nuevo group, initDate sea hoy
// TODO: conectar BD
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
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode"); // ["create", "edit", "visual"]
    const groupId = params.get("id"); // solo existe en "edit" y "visual"
    


    document.getElementById("pageTitle").textContent =
        mode === "edit" ? "Editar Grupo" : mode === "visual" ? "Ver Grupo" : "Crear Grupo";


    // carga de datos
    if ((mode === "edit" || mode === "visual") && groupId) {
        let Group = loadGroupData(groupId);

        if (mode === "edit") {
            displayAddButton();
        }

        dispalyData(Group, mode);
    }
    else {
        // TODO: esto hay que cambiarlo ya que es de pueba, 
        // habría que crear una instancia nueva de "Group"
        let Group = newGroup();
        displayAddButton();
        dispalyData(Group, "edit");

    }
});

function loadGroupData(id) {
    //FETCH
    const groupData = {
        name: "Grupo de prueba",
        students: [
            { mail: "example@mail.com" }, { mail: "example@mail.com" }, { mail: "example@mail.com" }
        ],
        wordles: [{ name: "Wordle A" }, { name: "Wordle B" }],
        initDate: "2021-10-10",
        endDate: null
    };

    return groupData;
}

function dispalyData(Group, mode) {
    const params = new URLSearchParams(window.location.search);
    const teacherId = params.get("teacherId");
    if (mode === "visual") {
        const groupSection = document.querySelector(".group-name");
        groupSection.innerHTML = `<h1>${Group.name}</h1>`;

        const container = document.querySelector(".container");
            const saveButton = container.querySelector(".save-button");
            if (saveButton) {
                saveButton.remove();
            }
        if (teacherId !== "null") {
            
            const div = document.createElement("div");
            div.classList.add("buttonSection");

            // Crear el botón de Editar
            const editButton = document.createElement("button");
            editButton.textContent = "Editar";
            editButton.classList.add("action-button");
            editButton.classList.add("edit-button");


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


        toggleDateDisplay(Group);
    }
    else {
        document.getElementById("groupName").value = Group.name;
        diplayConfig(Group.initDate, Group.endDate);
    }
    displayItems(Group.students, "students");
    displayItems(Group.wordles, "wordles");


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
    initDateText.textContent = Group.initDate;

    const endDateText = document.createElement("div");
    endDateText.classList.add("date-box");
    endDateText.textContent = Group.endDate || "Fecha no definida";

    // Reemplazar los inputs por los divs con fecha
    initDateInput.replaceWith(initDateText);
    endDateInput.replaceWith(endDateText);

    // Ocultar los radio buttons y etiquetas asociadas
    noEndDateRadio.parentElement.style.display = "none";
    setEndDateRadio.parentElement.style.display = "none";
}

function displayAddButton() {
    elements = ["students", "wordles"];
    elements.forEach(element => {
        const container = document.getElementById("container-" + element);
        container.innerHTML = `<div class='add-button' onclick="openPopup('${element}')">+</div>`;
    });
}



function newGroup() {
    //TODO: esto hay que cambiarlo para que haga un fetch real y quitar el display y checkOverflow
    // función sin servidor

    const sampleStudents = [
        { mail: "SCRUM" },
        { mail: "XXXXXXXXX" },
        { mail: "HTML" },
        { mail: "XXXXXXXXX" },
        { mail: "SCRUM" },
        { mail: "XXXXXXXXX" },
        { mail: "HTML" },
        { mail: "XXXXXXXXX" }
    ];

    const sampleWordles = [
        { name: "Wordle Ejemplo1" },
        { name: "Wordle Ejemplo2" },
        { name: "Wordle Ejemplo3" },
        { name: "Wordle Ejemplo4" },
        { name: "Wordle Ejemplo5" },
        { name: "Wordle Ejemplo6" },
        { name: "Wordle Ejemplo7" },
        { name: "Wordle Ejemplo8" }

    ];

    sampleInitDate = "2025-10-10";

    const groupData = {
        name: "Wordle ejemplo muchos datos",
        students: sampleStudents,
        wordles: sampleWordles,
        initDate: sampleInitDate
    };

    return groupData;

}

function displayItems(items, element) {

    const container = document.getElementById("container-" + element);
    switch (element) {
        case "students":
            displayedText = "mail";
            element = "list";
            break;
        case "wordles":
            displayedText = "name";
            element = "list";

            break;

    }

    items.forEach(item => {
        const itemElement = document.createElement("div");
        itemElement.classList.add(element + "-item");
        itemElement.textContent = displayedText === "mail" ? item[displayedText].split("@")[0] : item[displayedText];

        container.appendChild(itemElement);
    });

    const section = container.parentElement;
    const showMoreButton = `<div class="show-more hidden" onclick="toggle(this)">+</div>`
    section.innerHTML += showMoreButton;
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
//***************************************************************************************
// Funciones visuales

function checkOverflow() {
    elements = ["students", "wordles"];
    elements.forEach(element => {
        const container = document.getElementById("container-" + element);
        const section = container.closest(".group-section");
        const showMoreButton = section.querySelector(".show-more");

        if (container.scrollHeight > container.clientHeight + 5) {
            showMoreButton.classList.remove("hidden");
        } else {
            showMoreButton.classList.add("hidden");
        }
    });
}

function toggle(button) {
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

