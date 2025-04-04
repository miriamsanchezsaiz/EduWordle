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
        if (["groups", "wordles"].includes(popupType)) {
            popupType === "groups" ? loadListGroups() : loadListWordles();
        }
        
    }

}

function openPopupPoints(type, points){
    const popupBody = document.getElementById("popup-body");
    const template = document.getElementById(type);

    const overlay = document.getElementById("settings-overlay");
    

    if (template) {
        overlay.style.display = 'block';

        popupBody.innerHTML = template.innerHTML;
        document.getElementById("popup-placeholder").classList.remove("hidden");
        
        const pointSpan = document.getElementById("points");
        pointSpan.textContent= points;
        
    }

}

function closePopup() {
    document.getElementById("popup-placeholder").classList.add("hidden");
}

function loadListGroups(teacherId){
    console.log("LoadGroups llamada");
    //TODO: cambiar a servidor
    const grupos = [
        { groupId: "11111", name: "FIS", fechaInicio: "2021-10-01", fechaFin: "2021-10-30", fechaFin: "2021-10-15" },
        { groupId: "22222", name: "IPS", fechaInicio: "2021-10-01", fechaFin: "2021-10-30", fechaFin: "2021-10-15" },
        { groupId: "33333", name: "MAT", fechaInicio: "2021-10-01", fechaFin: "2021-10-30", fechaFin: "2021-10-15" },
        { groupId: "44444", name: "PROG", fechaInicio: "2021-10-01", fechaFin: "2021-10-30", fechaFin: "2021-10-15" }
    ];    
    const select = document.getElementById("group-select");
    select.innerHTML = '<option value="" disabled selected>Selecciona un grupo</option>'; 

    grupos.forEach(grupo => {
        const option = document.createElement("option");
        option.value = grupo.groupId;  
        option.textContent = grupo.name;
        select.appendChild(option);
    });
    console.log("Grupos cargados:", grupos); 
}

function loadListWordles(teacherId){
    console.log("LoadGroups llamada");

    //TODO: cambiar a servidor
    const wordles = [
        {wordleId: "11111", name: "Wordle 1"},
        {wordleId: "22222", name: "Wordle 2"},
        {wordleId: "33333", name: "Wordle 3"},  
        {wordleId: "44444", name: "IPS"},
        {wordleId: "55555", name: "IRM"},
        {wordleId: "66666", name: "FIS"},
        {wordleId: "77777", name: "PROG"}
    ]
    
    const select = document.getElementById("wordle-select");
    select.innerHTML = '<option value="" disabled selected>Selecciona un wordle</option>';

    wordles.forEach(wordle => {
        const option = document.createElement("option");
        option.value = wordle.wordleId;
        option.textContent = wordle.name;
        select.appendChild(option);
    });
    console.log("Wordles cargados:", wordles); 
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
