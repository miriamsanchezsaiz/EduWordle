
import { apiService } from './apiService.js';
const toastr = window.toastr;

const authToken = sessionStorage.getItem('authToken');
const currentUserString = sessionStorage.getItem('currentUser');


let role = null;
let userId = null;

if (authToken && currentUserString) {
  try {
    const currentUser = JSON.parse(currentUserString); 
    role = currentUser.role; 
    userId = currentUser.id; 
    console.log("List: User autenticated. Rol:", role, "ID:", userId);
  } catch (e) {
    console.error("List: Error parsing currentUser from sessionStorage:", e);
    sessionStorage.clear();
    window.location.replace('login.html');
  }
}

if (!authToken || !userId || !role) {
  console.warn("List: No authenticated user found. Redirecting to login.");
  window.location.replace('login.html');
}

document.addEventListener("DOMContentLoaded",  async () => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type"); // "group" o "wordle"
    const groupIdFromURL = params.get("groupId");

    let pageTitle = "";
    let fetchFunction = null;

    if (type === "group") {
        pageTitle = "Lista de Grupos";
        fetchFunction = () => fetchGroups(role);
    }
    else if (type === "wordle") {
        pageTitle = "Lista de Wordles";
        if (groupIdFromURL) {
            fetchFunction = () => fetchWordlesForGroup(groupIdFromURL);
        } else {
            fetchFunction = () => fetchWordles(role); 
        }
        
    } else {
        pageTitle = "Lista";
    }
    if (fetchFunction) await fetchFunction();

    // Mostrar botón de creación solo para profesores
    if (role === 'teacher') {
        const container = document.getElementById("itemsContainer");
        const wrapper   = document.createElement("div");
        wrapper.classList.add("item","create-container");
        const btn = document.createElement("button");
        btn.textContent = "Crear nuevo";
        btn.classList.add("create-button");
        btn.onclick = () => window.location.href = `${type}Editor.html?mode=create&userId=${userId}`;
        wrapper.appendChild(btn);
        container.prepend(wrapper);
    }

    document.getElementById("pageTitle").textContent = pageTitle;
});



async function fetchGroups(userRole) {
    try {
        const data = await apiService.fetchGroups(userRole);
        console.log("[list.js] Datos de grupos recibidos del API:", data); 


        if (userRole === 'student') {
            displayItemsForStudentGroups(data);
        } else {
            displayItems(data, "groupEditor.html");
        }
    } catch (error) {
        console.error("Error al obtener grupos:", error);
        toastr.error(error.message || "Error al cargar los grupos."); // Asumiendo que usas toastr
    }
}

async function fetchWordles(userRole) {
    try {
        const data = await apiService.fetchWordles(userRole);
        // La URL base para wordles depende del rol
        const urlBase = userRole === 'teacher' ? "wordleEditor.html" : "game.html";
        displayItems(data, urlBase);
    } catch (error) {
        console.error("Error al obtener wordles:", error);
        toastr.error(error.message || "Error al cargar los wordles.");
    }
}

async function fetchWordlesForGroup(groupId) {
    try {
        const groupData = await apiService.fetchWordlesForGroup(groupId);
        displayItems(groupData.wordles, "game.html");
    } catch (err) {
        console.error("Error al obtener wordles para el grupo:", err);
        toastr.error(err.message || "Error al cargar los wordles del grupo.");
    }
}

/**
 * Función existente para mostrar los elementos en el DOM.
 * Se espera que cada elemento tenga propiedades "id" y "name".
 */
function displayItems(items, urlBase) {
    const container = document.getElementById("itemsContainer");
    container.innerHTML = ""; 
    
    if (!items || items.length === 0) {
        container.innerHTML = "<p>No hay elementos para mostrar.</p>";
        return;
    }

    items.forEach(item => {
        const itemElement = document.createElement("div");
        itemElement.classList.add("item");
        itemElement.textContent = item.name; 
        itemElement.onclick = () => {
            let redirectUrl = `${urlBase}?id=${item.id}`;

            // Siempre añadir `userId` como el ID del usuario logeado
            redirectUrl += `&userId=${userId}`; 
            
            // Lógica específica para profesores que editan/visualizan
            if (role === 'teacher' && (urlBase === "groupEditor.html" || urlBase === "wordleEditor.html")) {
                redirectUrl += "&mode=visual";
            }
            
            window.location.href = redirectUrl;
        };
        container.appendChild(itemElement);
    });
}


function displayItemsForStudentGroups(groups) {
    const container = document.getElementById("itemsContainer");
    container.innerHTML = "";
    if (!groups || groups.length === 0) {
        container.innerHTML = "<p>No hay grupos para mostrar.</p>";
        return;
    }
    groups.forEach(g => {
        const item = document.createElement("div");
        item.classList.add("item");
        item.textContent = g.name;
        item.onclick = () => {
            // Redirige a la lista de wordles de ese grupo para el alumno
            window.location.href = `groupEditor.html?id=${g.id}&userId=${userId}&mode=visual`;
        };
        container.appendChild(item);
    });
}