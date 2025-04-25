//TODO: Hacer algo cuando no haya grupos / wordles que mostrar?
//ONGOING : al alumno no le salen grupos inactivos

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type"); // "group" o "wordle"
    const teacherId = params.get("teacherId");
    const studentId = params.get("studentId");

    let pageTitle = "";
    let fetchFunction = null;
    
    if (type === "group") {
        pageTitle = "Lista de Grupos";
        if (teacherId) {
            // Profesor: solo sus grupos
            fetchFunction = () => fetchGroupsForTeacher(teacherId);
        } else if (studentId) {
            // Alumno: grupos a los que pertenece
            fetchFunction = () => fetchGroupsForStudent(studentId);
        } else {
            console.error("Se requiere teacherId o studentId para ver grupos.");
            return;
        }
    }
    else if (type === "wordle") {
        pageTitle = "Lista de Wordles";
        if (teacherId) {
            // Profesor: sus propios wordles
            fetchFunction = () => fetchWordlesForTeacher(teacherId);
        } else if (studentId) {
            // Alumno: wordles asociados a los grupos a los que pertenece
            fetchFunction = () => fetchWordlesForStudent(studentId);
        } else {
            console.error("Se requiere teacherId o studentId para ver wordles.");
        }
    } else {
        pageTitle = "Lista";
    }
    
    // Mostrar botón de creación solo para profesores
    if (teacherId) {
        const createButton = document.createElement("button");
        createButton.textContent = "Crear nuevo";
        createButton.classList.add("create-button");
        createButton.onclick = () => {
            window.location.href = `${type}Editor.html?mode=create&teacherId=${teacherId}`;
        };
        const buttonContainer = document.getElementById("createButtonContainer");
        buttonContainer.appendChild(createButton);
        buttonContainer.classList.remove("hidden");
    }
    
    document.getElementById("pageTitle").textContent = pageTitle;

    if (fetchFunction) fetchFunction();
});

/**
 * Obtiene los grupos creados por un profesor
 */
function fetchGroupsForTeacher(teacherId) {
    fetch(`/grupos?teacherId=${teacherId}`)
        .then(response => response.json())
        .then(data => {
            displayItems(data, "groupEditor.html");
        })
        .catch(error => console.error("Error al obtener grupos para profesor:", error));
}

/**
 * Obtiene los wordles asociados a un profesor
 */
function fetchWordlesForTeacher(teacherId) {
    fetch(`/wordles?teacherId=${teacherId}`)
        .then(response => response.json())
        .then(data => {
            displayItems(data, "wordleEditor.html");
        })
        .catch(error => console.error("Error al obtener wordles para profesor:", error));
}

/**
 * Obtiene los wordles asociados a un alumno
 */
function fetchWordlesForStudent(studentId) {
    fetch(`/wordles?studentId=${studentId}`)
        .then(response => response.json())
        .then(data => {
            displayItems(data, "game.html");
            // En este ejemplo, redirijo a "game.html" para que el alumno juegue
            // Ajusta la URL según la lógica de tu aplicación.
        })
        .catch(error => console.error("Error al obtener wordles para alumno:", error));
}

/**
 * Función existente para mostrar los elementos en el DOM.
 * Se espera que cada elemento tenga propiedades "id" y "nombre".
 */
function displayItems(items, urlBase) {
    const container = document.getElementById("itemsContainer");
    const params = new URLSearchParams(window.location.search);
    const teacherId = params.get("teacherId");
    const studentId = params.get("studentId");

    items.forEach(item => {
        const itemElement = document.createElement("div");
        itemElement.classList.add("item");
        itemElement.textContent = item.nombre; // Asegúrate que en la BD el campo es "nombre" o adapta el nombre de propiedad.
        itemElement.onclick = () => {
            if(teacherId){
                window.location.href = `${urlBase}?mode=visual&id=${item.id}&teacherId=${teacherId}`;
            } else if(studentId){
                // Para alumnos, redirige directamente a la página de juego
                window.location.href = `${urlBase}?id=${item.id}&studentId=${studentId}`;
            } else {
                window.location.href = `${urlBase}?id=${item.id}`;
            }
        };

        container.appendChild(itemElement);
    });
}

/**
 * Función para obtener grupos (se puede mantener para profesores si fuera necesario)
 */
function fetchGroups() {
    fetch("/grupos")
        .then(response => response.json())
        .then(data => {
            displayItems(data, "groupEditor.html");
        })
        .catch(error => console.error("Error al obtener grupos:", error));
}

function fetchGroupsForStudent(studentId) {
    fetch(`/grupos?studentId=${studentId}`)
        .then(response => response.json())
        .then(data => {
            displayItems(data, "groupEditor.html");
        })
        .catch(error => console.error("Error al obtener grupos para el alumno:", error));
}

