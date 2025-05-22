const role      = sessionStorage.getItem('role');
const teacherId = sessionStorage.getItem('teacherId');
const studentId = sessionStorage.getItem('studentId');
if (!role || (!teacherId && !studentId)) {
  window.location.replace('login.html');
}
// ==================== wordleEditor.js ====================
// Frontend logic para crear, editar o visualizar un Wordle en EduWordle

// Obtener parámetros de URL
const params    = new URLSearchParams(window.location.search);
const mode      = params.get("mode");       // "create", "edit", "visual"
const wordleId  = params.get("id");
let sessionWordle = null;

// Inicialización tras cargar el DOM
document.addEventListener("DOMContentLoaded", async () => {
  // Ajustar título de la página
  const titulo = mode === "edit"   ? "Editar Wordle"
                : mode === "visual" ? "Ver Wordle"
                : "Crear Wordle";
  document.getElementById("pageTitle").textContent = titulo;
  /*if (mode === "create") {
  document
    .getElementById("container-words")
    .closest("section")
    .style.display = "none";
  document
    .getElementById("container-questions")
    .closest("section")
    .style.display = "none";
  document
    .getElementById("container-groups")
    .closest("section")
    .style.display = "none";
}*/

  // Exponer para popups
  window.removeItemById  = removeItemById;
  window.displayItem     = displayItem;

  // Cargar datos o inicializar vacío
  if ((mode === "edit" || mode === "visual") && wordleId) {
    try {
      sessionWordle = await loadWordleData(wordleId);
      window.sessionWordle = sessionWordle;
      displayData(sessionWordle);
    } catch (err) {
      console.error("Error cargando wordle:", err);
      toastr.error("No se pudo cargar los datos del wordle.");
    }
  } else {
    // Crear nuevo wordle en memoria
    sessionWordle = {
      id:        null,
      nombre:    "",
      words:     [],
      questions: [],
      groups:    []
    };
    window.sessionWordle = sessionWordle;
    displayData(sessionWordle);
  }
});

async function loadWordleData(wordleId) {
    const res = await fetch(`/wordles/${wordleId}`);
      if (!res.ok) throw new Error('Error al cargar wordle');
       const w = await res.json();
       return {
         id:        w.id,
         nombre:    w.nombre,
         difficulty: w.difficulty, 
         words:     w.words,
         questions: w.questions,
        groups:    w.groups
      };
 }

// displayData: rellena la UI según modo y datos
function displayData(wordle) {
  const saveBtn = document.querySelector(".save-button");
  if (mode === "visual") {
    // Mostrar título
    document.querySelector(".wordle-name").innerHTML = `<h1>${wordle.nombre}</h1>`;
    // Ocultar botón Guardar
    if (saveBtn) saveBtn.remove();
    // Botones Editar y Eliminar
    if (teacherId) {
      const cont = document.querySelector(".container");
      const opts = document.createElement("div"); opts.classList.add("buttonSection");
      const btnEdit = document.createElement("button");
      btnEdit.textContent = "Editar";
      btnEdit.classList.add("action-button","edit-button");
      btnEdit.onclick = () => { const url = new URL(window.location.href); url.searchParams.set("mode","edit"); window.location.href = url; };
      const btnDel = document.createElement("button");
      btnDel.textContent = "Eliminar";
      btnDel.classList.add("action-button","delete-button");
      btnDel.onclick = () => openPopup('delete');
      opts.append(btnEdit, btnDel);
      cont.appendChild(opts);
    }
  } else {
    document.getElementById("wordleTitle").value = wordle.nombre;
    document.getElementById("difficulty").value   = wordle.difficulty;
  }
  // Listados dinámicos
  displayItems(wordle.words,     "words");
  displayItems(wordle.questions, "questions");
  displayItems(wordle.groups,    "groups");
}

// displayItems: pinta elementos y añade botón '+' en edit/create\ n
  function displayItems(items, type) {
  const cont = document.getElementById(`container-${type}`);
  cont.innerHTML = "";
  items.forEach(item => displayItem(item, type));
  if (mode !== "visual" && !cont.querySelector('.add-button')) {
    const btn = document.createElement('div'); btn.classList.add('add-button'); btn.textContent = '+';
    btn.onclick = () => openPopup(type);
    cont.appendChild(btn);
  }
}

// displayItem: crea un ítem para words, questions o groups
function displayItem(item, type) {
  const cont = document.getElementById(`container-${type}`);
  const div  = document.createElement('div'); div.classList.add('list-item'); div.id = `item-${item.id}`;
  const a    = document.createElement('a');
  a.textContent = type === 'words' ? item.tittle : type === 'questions' ? item.statement : item.nombre;
  div.appendChild(a);
  if (mode !== 'visual') {
    const btnX = document.createElement('button'); btnX.classList.add('item-remove');
    btnX.onclick = () => removeItemById(item.id, type);
    div.appendChild(btnX);
  }
  cont.appendChild(div);
}

window.removeItemById = async function(id, type) {
  try {
    const url = type === 'words'
                ? `/words/${id}`
                : `/questions/${id}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error en servidor');

    const el = document.getElementById(`item-${id}`);
    if (el) el.remove();

    window.sessionWordle[type] = window.sessionWordle[type]
                                 .filter(x => x.id !== id);

    toastr.success(
      type === 'words'
        ? 'Palabra eliminada'
        : 'Pregunta eliminada'
    );
  } catch (err) {
    console.error(`Error eliminando ${type}:`, err);
    toastr.error(
      type === 'words'
        ? 'No se pudo eliminar la palabra'
        : 'No se pudo eliminar la pregunta'
    );
  }
};


window.saveWordleEditor = async function() {
  const nombre   = document.getElementById("wordleTitle").value.trim();
  const difficulty = document.getElementById("difficulty").value;
  if (!nombre) {
    toastr.error("El nombre del Wordle es obligatorio");
    return;
  }

  // CREATE: si no hay ID en sesión
  if (!sessionWordle.id) {
    try {
      const res = await fetch('/wordles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, teacherId, difficulty })
      });
      if (!res.ok) throw new Error('Error creando Wordle');
      const data = await res.json();
      window.location.href = 
        `wordleEditor.html?mode=edit&id=${data.id}&teacherId=${teacherId}`;
      toastr.success("Wordle creado correctamente");
    } catch (err) {
      console.error(err);
      toastr.error(err.message);
    }
    return;
  }
  try {
    const res = await fetch(`/wordles/${sessionWordle.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, difficulty })
    });
    if (!res.ok) throw new Error('Error guardando Wordle');
    toastr.success("Wordle guardado correctamente");
    setTimeout(() => {
      window.location.href = `list.html?type=wordle&teacherId=${teacherId}`;
    }, 500);
  } catch (err) {
    console.error(err);
    toastr.error(err.message);
  }
};

  
  
