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
  } catch (e) {
    console.error("Error parsing currentUser:", e);
    sessionStorage.clear();
    window.location.replace('login.html');
  }
}

if (!authToken || !userId || !role) {
  window.location.replace('login.html');
}

// ==================== wordleEditor.js ====================
// Frontend logic para crear, editar o visualizar un Wordle en EduWordle

const params    = new URLSearchParams(window.location.search);
const mode      = params.get("mode"); // "create", "edit", "visual"
const wordleId  = params.get("id");
let sessionWordle = null;


// Inicializar al cargar DOM
document.addEventListener("DOMContentLoaded", async () => {
  // Título
document.getElementById("pageTitle").textContent =
    mode === "edit"   ? "Editar Wordle"
  : mode === "visual" ? "Ver Wordle"
  :                      "Crear Wordle";

  // Exponer utilidad
  window.removeItemById = removeItemById;
  window.displayItem    = displayItem;

    if (mode === 'visual') {
    document.body.classList.add('visual-mode');
  }

  // Cargar o iniciar vacío
  if ((mode === "edit" || mode === "visual") && wordleId) {
    try {
      sessionWordle = await apiService.getWordleDetails(wordleId);
      // Normalizar arrays
      sessionWordle.words     = Array.isArray(sessionWordle.words)     ? sessionWordle.words     : [];
      sessionWordle.questions = Array.isArray(sessionWordle.questions) ? sessionWordle.questions : [];
      sessionWordle.groups    = Array.isArray(sessionWordle.groups)    ? sessionWordle.groups    : [];
      displayData(sessionWordle);
    } catch (err) {
      console.error("Error cargando wordle:", err);
      toastr.error("No se pudo cargar los datos del wordle.");
    }
  } else {
    // Nuevo en memoria
    sessionWordle = { id:null, name:'', difficulty:'low', words:[], questions:[], groups:[] };
    displayData(sessionWordle);
  }
  const pendingW = JSON.parse(localStorage.getItem("pendingWords")    || "[]");
  const pendingQ = JSON.parse(localStorage.getItem("pendingQuestions")|| "[]");
  sessionWordle.words     = [...sessionWordle.words,     ...pendingW];
  sessionWordle.questions = [...sessionWordle.questions, ...pendingQ];
  window.sessionWordle = sessionWordle;
  document.querySelectorAll(".diff-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    sessionWordle.difficulty = btn.dataset.value;
  };

  // Marcar como seleccionada si ya está guardada en sesión
  if (sessionWordle.difficulty === btn.dataset.value) {
    btn.classList.add("selected");
  }

  // Si estás en modo visual, desactivar los botones
  if (mode === "visual") {
    btn.disabled = true;
    btn.classList.add("disabled");
  }
  });
});

// displayData: render UI
function displayData(w) {
  const saveBtn = document.querySelector(".save-button");
  if (mode === "visual") {
    document.querySelector(".wordle-name").innerHTML = `<h1>${w.name}</h1>`;
    if (saveBtn) saveBtn.remove();
    if (role === 'teacher') {
      const cont = document.querySelector(".container");
      const opts = document.createElement("div"); opts.classList.add("buttonSection");
      const btnE = document.createElement("button"); btnE.textContent="Editar"; btnE.classList.add("action-button","edit-button");
      btnE.onclick = () => { const u=new URL(window.location.href); u.searchParams.set("mode","edit"); window.location.href=u; };
      const btnD = document.createElement("button"); btnD.textContent="Eliminar"; btnD.classList.add("action-button","delete-button");
      btnD.onclick = () => openPopup('delete');
      opts.append(btnE,btnD); cont.appendChild(opts);
    }
  } else {
    document.getElementById("wordleTitle").value       = w.name;
    const diffEl = document.getElementById("difficulty"); if(diffEl) diffEl.value = w.difficulty;
  }
  displayItems(w.words,     "words");
  displayItems(w.questions, "questions");
  displayItems(w.groups,    "groups");
}

// displayItems: shows list
function displayItems(items, type) {
  const cont = document.getElementById(`container-${type}`); cont.innerHTML = '';
  (Array.isArray(items)?items:[]).forEach(item=>displayItem(item,type));
  if(mode!="visual" && !cont.querySelector('.add-button')){
    const btn=document.createElement('div'); btn.classList.add('add-button'); btn.textContent='+';
    btn.onclick=()=>openPopup(type); cont.appendChild(btn);
  }
}

// displayItem: single item
function displayItem(item,type){
  const cont=document.getElementById(`container-${type}`);
  const div=document.createElement('div'); div.classList.add('list-item'); div.id=`item-${item.id}`;
  const a=document.createElement('a');
  let txt='';
  if(type==='words')     txt=item.title||item.word||'';
  else if(type==='questions') txt=item.question || item.statement || item.prompt || '';
  else if(type==='groups')    txt=item.name||'';
  a.textContent=txt; div.appendChild(a);
  if(mode!=='visual'){
    const x=document.createElement('button'); x.classList.add('item-remove'); x.onclick=()=>removeItemById(item.id,type);
    div.appendChild(x);
  }
  cont.appendChild(div);
}

// removeItemById: deletes via API and UI
async function removeItemById(id,type){
  try{
    const url = type==='words' ? `/teacher/wordles/${sessionWordle.id}/words/${id}`
               : type==='questions' ? `/teacher/wordles/${sessionWordle.id}/questions/${id}`
               : ''; // adjust if needed
    if(url==='')throw new Error('Tipo no soportado');
    await apiService.callApi(url,{method:'DELETE'});
    document.getElementById(`item-${id}`)?.remove();
    toastr.success(type==='words'?'Palabra eliminada':'Pregunta eliminada');
  }catch(e){ console.error(e); toastr.error('Error eliminando'); }
}

// saveWordleEditor: create/update
async function saveWordleEditor() {
  const nameVal = document.getElementById("wordleTitle").value.trim();
  const diffVal = sessionWordle.difficulty;

  if (!nameVal) return toastr.error("El nombre es obligatorio");

  // 1) Reconstruyo arrays completos
  const words     = sessionWordle.words;     // ya contiene lo local + API
  const questions = sessionWordle.questions; // idem

  // 2) IDs de grupos
  const groupAccessIds = sessionWordle.groups.map(g => parseInt(g.id,10));

  // 3) Payload completo
  const payload = {
    name:            nameVal,
    words,           // si tu API acepta un array >1; si solo 1, ajusta a words[0]
    questions,
    groupAccessIds,
    difficulty:      diffVal
  };

  try {
    let res;
    if (!sessionWordle.id) {
      // CREATE
      res = await apiService.createWordle(payload);
      sessionWordle.id = res.id;
      toastr.success("Wordle creado");
      // pasamos al modo edit para poder guardar relaciones posteriores
      window.history.replaceState(null,null,`?mode=edit&id=${res.id}`);
    } else {
      // UPDATE
      await apiService.updateWordle(sessionWordle.id, payload);
      toastr.success("Wordle actualizado");
    }

    // 4) ¡Limpio los buffers locales!
    localStorage.removeItem("pendingWords");
    localStorage.removeItem("pendingQuestions");

    // 5) Redirijo a la lista tras un pequeño retardo opcional
    setTimeout(() => {
      window.location.href = `list.html?type=wordle&teacherId=${userId}`;
    }, 200);

  } catch (err) {
    console.error("Error en create/update Wordle:", err);
    toastr.error(err.message || "Error comunicándose con la API");
  }
}
window.saveWordleEditor = saveWordleEditor;

  
  
