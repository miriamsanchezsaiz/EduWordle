
//TODO: Hacer algo cuando no haya grupos / wordles que mostrar?
//ONGOING : al alumno no le salen grupos inactivos
const role      = sessionStorage.getItem('role');
const teacherId = sessionStorage.getItem('teacherId');
const studentId = sessionStorage.getItem('studentId');
if (!role || (!teacherId && !studentId)) {
  window.location.replace('login.html');
}
document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type"); // "group" o "wordle"
    const teacherId = params.get("teacherId");
    const studentId = params.get("studentId");

    let pageTitle = "";
    let fetchFunction = null;
    
    if (type === "group") {
            pageTitle = "Lista de Grupos";
            if (studentId) {
                // Si soy alumno, al clicar iré a ?type=wordle&groupId=…
            fetchFunction = () => fetchGroupsForStudent(studentId);
            } else {
            fetchFunction = () => fetchGroupsForTeacher(teacherId);
            }
        } 
    else if (type === "wordle") {
            pageTitle = "Lista de Wordles";
            const groupId = params.get("groupId");
        if (groupId) {
            // Estoy viendo los wordles de un grupo concreto
                fetchFunction = () => fetchWordlesForGroup(groupId);
        } else if (teacherId) {
            fetchFunction = () => fetchWordlesForTeacher(teacherId);
            } else if (studentId) {
                fetchFunction = () => fetchWordlesForStudent(studentId);
            } else {
                console.error("Se requiere teacherId, studentId o groupId para ver wordles.");
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
      .then(response => {
        if (!response.ok) 
          throw new Error(`Error ${response.status}: no se pudieron cargar los wordles`);
        return response.json();
      })
       .then(data => {
        // data es siempre un array aquí
        displayItems(data, "game.html");
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
        .then(r => {
            if (!r.ok) throw new Error("Error al cargar grupos");
            return r.json();
        })
        .then(groups => {
            const container = document.getElementById("itemsContainer");
            container.innerHTML = "";
            groups.forEach(g => {
                const item = document.createElement("div");
                item.classList.add("item");
                item.textContent = g.nombre;
                item.onclick = () => {
                    window.location.href =
                      `list.html?type=wordle&studentId=${studentId}&groupId=${g.id}`;
                };
                container.appendChild(item);
            });
        })
        .catch(err => {
            console.error("Error al obtener grupos para el alumno:", err);
            toastr.error(err.message);
        });
}

function fetchWordlesForGroup(groupId) {
    fetch(`/grupos/${groupId}`)
        .then(r => {
            if (!r.ok) throw new Error("Error al cargar datos de grupo");
            return r.json();
        })
        .then(group => {
            // el endpoint /grupos/:id devuelve { wordles: [...] }
            displayItems(group.wordles, "game.html");
        })
        .catch(err => {
            console.error("Error al obtener wordles para el grupo:", err);
            toastr.error(err.message);
        });
}
