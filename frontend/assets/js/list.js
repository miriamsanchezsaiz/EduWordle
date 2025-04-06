//TODO: Hacer algo cuando no haya grupos / wordles que mostrar?
//ONGOING : al alumno no le salen grupos inactivos

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type"); // Obtiene el tipo de la URL !!!! Esto permite saber si es lista de wordle o grupo
    const teacherId = params.get("teacherId"); 

    let pageTitle = "";
    let fetchFunction = null;
    
    if (type === "group") {
        pageTitle = "Lista de Grupos";
        fetchFunction = fetchGroups;
    } else if (type === "wordle") {
        pageTitle = "Lista de Wordles";
        fetchFunction = fetchWordles;
    } else {
        pageTitle = "Lista";
    }
    if(teacherId){
        //cargar el botón de crear grupo / wordle
        const createButton = document.createElement("button");
        createButton.textContent = "Crear nuevo";
        createButton.classList.add("create-button");
        createButton.onclick = () => {
            window.location.href = `${type}Editor.html?mode=create&teacherId=${teacherId}`;
        };
        const buttonContainer = document.getElementById("createButtonContainer")
        buttonContainer.appendChild(createButton);
        buttonContainer.classList.remove("hidden");
    }
    
    document.getElementById("pageTitle").textContent = pageTitle;

    if (fetchFunction) fetchFunction();

});


/**
 * Obtiene los grupos desde el servidor y los muestra en la página
 */
function fetchGroups() {
    // función sin servidor
    const sampleGroups = [
        { id: 1, nombre: "FIS" },
        { id: 2, nombre: "IPS" }
    ];
    displayItems(sampleGroups, "groupEditor.html");

    // función con servidor
    // fetch("/api/grupos") 
    //     .then(response => response.json())
    //     .then(data => {
    //         // Filtrar grupos inactivos
    //         const activeGroups = data.filter(group => group.isActive() === true);
    //         displayItems(activeGroups, "groupEditor.html");
    //     })
    //     .catch(error => console.error("Error al obtener grupos:", error));
}

function fetchWordles() {
    // función sin servidor
    const sampleGroups = [
        { id: 1, nombre: "FIS: Tema 1" },
        { id: 2, nombre: "IPS: Tema 2" }
    ];
    displayItems(sampleGroups, "wordleEditor.html");

    // función con servidor
    // fetch("/api/wordles") 
    //     .then(response => response.json())
    //     .then(data => {
    //         displayItems(data);
    //     })
    //     .catch(error => console.error("Error al obtener wordles:", error));
}

/**
 * Genera el DOM de los grupos en la lista -> usa name y groupID
 */
function displayItems(items, urlBase) {
    const container = document.getElementById("itemsContainer");
    
    const params = new URLSearchParams(window.location.search);
    const teacherId = params.get("teacherId"); 


    items.forEach(item => {
        const itemElement = document.createElement("div");
        itemElement.classList.add("item");
        itemElement.textContent = item.nombre;
        itemElement.onclick = () => {
            if(!teacherId && urlBase.includes("wordle")){
                window.location.href = `game.html?&id=${item.id}`;
            }
            else {
                if(teacherId){
                    window.location.href = `${urlBase}?mode=visual&id=${item.id}&teacherId=${teacherId}`;
                }
                else {
                    window.location.href = `${urlBase}?mode=visual&id=${item.id}`;
                }
            }
        };

        container.appendChild(itemElement);
    });
}

/**
 * Filtra los grupos en la lista según la búsqueda del usuario
 */
function filterItems() {
    const searchTerm = document.getElementById("searchInput").value.toLowerCase();
    const items = document.querySelectorAll(".item");

    items.forEach(item => {
        if (item.textContent.toLowerCase().includes(searchTerm)) {
            item.style.display = "block";
        } else {
            item.style.display = "none";
        }
    });
}


