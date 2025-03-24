//TODO: no funciona el load Groups

// Cargar dinámicamente los popups desde un archivo externo
fetch("/frontend/popups.html")
    .then(response => response.text())
    .then(data => {
        document.getElementById("popup-placeholder").innerHTML = data;
    });

function openPopup(popupType) {
    const popupBody = document.getElementById("popup-body");
    const template = document.getElementById(popupType);

    if (template) {
        
        popupBody.innerHTML = template.innerHTML;
        document.getElementById("popup-placeholder").classList.remove("hidden");
        if(popupType in ["groups", "wordles"] )
            {
                popupType ==="groups" ? loadListGroups(): loadListWordles();
            }
    }

}

function closePopup() {
    document.getElementById("popup-placeholder").classList.add("hidden");
}

function loadListGroups(teacherId){
    //TODO: cambiar a servidor
    const grupos = ["Grupo 1", "Grupo 2", "Grupo 3", "Grupo 4", "Grupo 5"];
    
    const datalist = document.getElementById("group-list");
    datalist.innerHTML = '';  

    grupos.forEach(grupo => {
        const option = document.createElement("option");
        option.value = grupo;
        datalist.appendChild(option);
    });
}

function loadListWordles(teacherId){
    //TODO: cambiar a servidor
    const grupos = ["Wordle 1", "Wordle 2", "IPS", "IRM", "FIS"];
    
    const datalist = document.getElementById("wordle-list");
    datalist.innerHTML = '';  

    grupos.forEach(grupo => {
        const option = document.createElement("option");
        option.value = grupo;
        datalist.appendChild(option);
    });
}



// Función para añadir una nueva opción de respuesta
function addOption() {
    const optionsContainer = document.getElementById("options-container");
    
    // Crear un nuevo div de opción
    const newOption = document.createElement("div");
    newOption.classList.add("option-input");

    newOption.innerHTML = `
        <input type="text" placeholder="Escribe aquí">
        <div class="correct-answer">
            <input type="checkbox" class="checkbox-answer">
        </div>
    `;

    // Añadir el nuevo div al contenedor de opciones
    optionsContainer.appendChild(newOption);
}


function backFromEdit(){
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode"); 
    
    if(mode !== "visual"){
        document.getElementById("popup-placeholder").innerHTML = `
        <div id="popup-container" class="popup-overlay"> </div>
        <div class="popup-panel">
            <button class="close-button" onclick="closePopup()">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="grey"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x h-4 w-4">
                    <path d="M18 6 6 18"></path>
                    <path d="m6 6 12 12"></path>
                </svg>
            </button>
            <div id="popup-body" class="popup-body">
                <div class="popup-header">
                    <h2>Salir de la página</h2>
                </div>
                <div class="popup-content">
                    <p>¿Seguro que quieres salir de la página de edición? Los cambios no se guardarán</p>
                    <div class="buttonSection">
                        
                        <button class = "exit-button" onclick="window.history.back()">Salir</button>
                    </div>
                </div>
            </div>
        </div>
        `;

        document.getElementById("popup-placeholder").classList.remove("hidden");   
        // TODO: cuando se pulse este botón, se deberá de preguntar si se quiere salir de la página sin guardar los cambios  

    }
    else{
        window.history.back();
    }
}
