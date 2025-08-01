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

async function loadTeacherGroups() {
  try {
    return await apiService.fetchGroups("teacher");
  } catch (error) {
    console.error("Error al obtener grupos del profesor:", error);
    return [];
  }
}

const params = new URLSearchParams(window.location.search);
const mode = params.get("mode");
const wordleId = params.get("id");
let sessionWordle = null;
let originalWordIds = [];
let originalQuestionIds = [];

document.addEventListener("DOMContentLoaded", async () => {
  //Primero hay que borrar lo almacenado el localStorage
  sessionStorage.removeItem("pendingWords");
  sessionStorage.removeItem("pendingQuestions");
  sessionStorage.removeItem("sessionWordle");

  const mode = new URLSearchParams(window.location.search).get('mode');

  // Función para ocultar los botones de información en modo edición
  const hideInfoButtons = (mode) => {
    if (mode === 'visual') {
      const difficultyInfoBtn = document.getElementById('difficulty-info-btn');
      const wordsInfoBtn = document.getElementById('words-info-btn');
      const questionsInfoBtn = document.getElementById('questions-info-btn');

      if (difficultyInfoBtn) difficultyInfoBtn.style.display = 'none';
      if (wordsInfoBtn) wordsInfoBtn.style.display = 'none';
      if (questionsInfoBtn) questionsInfoBtn.style.display = 'none';
    }
  };

  hideInfoButtons(mode);
  
  document.getElementById("pageTitle").textContent =
    mode === "edit" ? "Editar Wordle"
    : mode === "visual" ? "Ver Wordle"
    : "Crear Wordle";

  window.removeItemById = removeItemById;
  window.displayItem = displayItem;

  if (mode === 'visual') {
    document.body.classList.add('visual-mode');
  
  }
  

  if ((mode === "edit" || mode === "visual") && wordleId) {
    try {
      sessionWordle = await apiService.getWordleDetails(wordleId);
      sessionWordle.groups = sessionWordle.groupsWithAccess || [];
      if (sessionWordle.groups.length > 0 && typeof sessionWordle.groups[0] === "number") {
        const allGroups = await loadTeacherGroups();
        sessionWordle.groups = sessionWordle.groups
          .map(id => allGroups.find(g => g.id === id))
          .filter(g => g);
      }

      sessionWordle.words = Array.isArray(sessionWordle.words) ? sessionWordle.words : [];
      sessionWordle.questions = Array.isArray(sessionWordle.questions) ? sessionWordle.questions : [];
      sessionWordle.groups = Array.isArray(sessionWordle.groups) ? sessionWordle.groups : [];

      originalWordIds = sessionWordle.words.map(w => w.id);
      originalQuestionIds = sessionWordle.questions.map(q => q.id);

      sessionWordle.questions = sessionWordle.questions.map(q => {
        let optionsParsed = q.options;
        let correctParsed = q.correctAnswer;

        try {
          if (typeof optionsParsed === 'string' && (optionsParsed.startsWith('[') || optionsParsed.startsWith('{') || optionsParsed.startsWith('"'))) {
            optionsParsed = JSON.parse(optionsParsed);
          }
        } catch (e) {
          console.warn(`No se pudo parsear options para la pregunta "${q.question}":`, e);
        }

        try {
          if (typeof correctParsed === 'string' && (correctParsed.startsWith('[') || correctParsed.startsWith('{') || correctParsed.startsWith('"'))) {
            correctParsed = JSON.parse(correctParsed);
          }
        } catch (e) {
          console.warn(`No se pudo parsear correctAnswer para la pregunta "${q.question}":`, e);
        }

        return {
          ...q,
          options: optionsParsed,
          correctAnswer: correctParsed
        };
      });

      displayData(sessionWordle);
    } catch (err) {
      console.error("Error cargando wordle:", err);
      toastr.error("No se pudo cargar los datos del wordle.");
    }
  } else {
    sessionWordle = { name: '', difficulty: 'low', words: [], questions: [], groups: [] };
    delete sessionWordle.id;
    displayData(sessionWordle);
  }

  const pendingW = JSON.parse(localStorage.getItem("pendingWords") || "[]");
  const pendingQ = JSON.parse(localStorage.getItem("pendingQuestions") || "[]");

  const uniqueById = (arr) => Object.values(
    arr.reduce((acc, curr) => {
      const id = curr.id || JSON.stringify(curr);
      acc[id] = curr;
      return acc;
    }, {})
  );

  if (pendingW.length > 0) sessionWordle.words = uniqueById([...sessionWordle.words, ...pendingW]);
  if (pendingQ.length > 0) sessionWordle.questions = uniqueById([...sessionWordle.questions, ...pendingQ]);

  window.sessionWordle = sessionWordle;
  if (mode === 'create') {
  delete sessionWordle.id; 
  }

  document.querySelectorAll(".diff-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      sessionWordle.difficulty = btn.dataset.value;
    };

    if (sessionWordle.difficulty === btn.dataset.value) btn.classList.add("selected");
    if (mode === "visual") {
      btn.disabled = true;
      btn.classList.add("disabled");
    }
  });
});

function displayData(w) {
  const saveBtn = document.querySelector(".save-button");
  if (mode === "visual") {
  document.querySelector(".wordle-name").innerHTML = `<h1>${w.name}</h1>`;
  if (w.difficulty === 'low' || w.difficulty === 'high') {
    const diffText = w.difficulty === 'low' ? 'FÁCIL' : 'DIFÍCIL';
    const container = document.querySelector(".wordle-difficulty-visual");

    if (container) {
      container.innerHTML = `
        <h2>Dificultad</h2>
        <div class="container-section" id="container-difficulty"></div>
      `;

      const inner = document.getElementById("container-difficulty");
      if (inner) {
        const div = document.createElement("div");
        div.classList.add("list-item");
        div.textContent = diffText;
        inner.appendChild(div);
      }
    }
  }

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
    document.getElementById("wordleTitle").value = w.name;
    const diffEl = document.getElementById("difficulty"); if(diffEl) diffEl.value = w.difficulty;
  }
  displayItems(w.words, "words");
  displayItems(w.questions, "questions");
  displayItems(w.groups, "groups");

  checkOverflow();
}

function displayItems(items, type) {
  
  const cont = document.getElementById(`container-${type}`); cont.innerHTML = '';
   if(mode!="visual" && !cont.querySelector('.add-button')){
    const btn=document.createElement('div'); btn.classList.add('add-button'); btn.textContent='+';
    btn.onclick=()=>openPopup(type); cont.appendChild(btn);
  }
  (Array.isArray(items)?items:[]).forEach(item=>displayItem(item,type));

  const section = cont.parentElement;
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


//*************************************************************************************** 
//***************************************************************************************
// Funciones visuales

function checkOverflow() {
    let elements = ["words", "questions", "groups"];
    const VISIBLE_LIMIT = 3;

    elements.forEach(element => {

        const container = document.getElementById("container-" + element);
        const section = container.closest(".wordle-section");
        const showMoreButton = section.querySelector(".show-more");


        if (element === "words") {
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
window.checkOverflow = checkOverflow;

window.toggle = function toggle(button) {
    const section = button.closest(".wordle-section");
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

function removeItemById(id,type){
  try{
    if (type === 'groups') {
      sessionWordle.groups = sessionWordle.groups.filter(g => parseInt(g.id) !== parseInt(id));
    } else {
      sessionWordle[type] = sessionWordle[type].filter(item => parseInt(item.id) !== parseInt(id));
    }
    document.getElementById(`item-${id}`)?.remove();
    toastr.success(`${type === 'groups' ? 'Grupo' : type === 'words' ? 'Palabra' : 'Pregunta'} eliminad${type === 'groups' ? 'o' : 'a'}`);
  } catch (e) {
    console.error(e);
    toastr.error('Error eliminando');
  }
  checkOverflow();
}

async function saveWordleEditor() {
  const name = document.getElementById("wordleTitle")?.value.trim();
  const diffBtn = document.querySelector(".diff-btn.selected");
  const difficulty = diffBtn?.dataset.value || "low";

  if (!name) return toastr.error("El nombre del Wordle es obligatorio.");

  const normalizedWords = (sessionWordle.words || [])
    .map(w => ({
      word: w.word || w.title || '',
      hint: w.hint || ''
    }))
    .filter(w => w.word);

  if (normalizedWords.length === 0) {
    return toastr.error("Debes añadir al menos una palabra.");
  }

  const normalizedQuestions = (sessionWordle.questions || [])
    .map(q => {
      try {
        const text = q.question || q.statement || '';
        const rawAnswer = q.correctAnswer ?? q.answer ?? [];
        const answer = Array.isArray(rawAnswer) ? rawAnswer : [rawAnswer];
        const options = Array.isArray(q.options)
          ? q.options
          : (typeof q.options === 'string'
            ? JSON.parse(q.options)
            : []);

        const validOptions = Array.isArray(options) && options.length >= 2;
        const validAnswer = Array.isArray(answer) && answer.length > 0 && answer.every(a => options.includes(a));

        if (!text || !validOptions || !validAnswer) {
          console.warn("Pregunta inválida descartada:", q);
          return null;
        }

        const question = {
          question: text,
          correctAnswer: answer,
          options: options,
          type: q.type || (answer.length > 1 ? 'multichoice' : 'single')
        };

        if (Number.isInteger(q.id)) {
          question.id = q.id;
        }

        return question;

      } catch (e) {
        console.warn("Error procesando pregunta:", q, e);
        return null;
      }
    })
    .filter(Boolean);


  if (normalizedQuestions.length === 0) {
    return toastr.error("Debes añadir al menos una pregunta válida.");
  }

  const groupAccessIds = (sessionWordle.groups || []).map(g => parseInt(g.id));
  const payload = {
    name,
    difficulty,
    words: normalizedWords,
    questions: normalizedQuestions,
    groupAccessIds
  };

  try {
    if (sessionWordle.id !== undefined && sessionWordle.id !== null) {
      await apiService.updateWordle(sessionWordle.id, payload);
      toastr.success("Wordle actualizado correctamente.");
    } else {
      await apiService.createWordle(payload);
      toastr.success("Wordle creado correctamente. Redirigiendo...");
    }

    localStorage.removeItem("pendingWords");
    localStorage.removeItem("pendingQuestions");

    setTimeout(() => {
      window.location.replace(`dashboard.html?type=teacher`);
    }, 2000);
  } catch (error) {
    console.error("Error en create/update Wordle:", error);
    toastr.error(error.message || "No se pudo guardar el Wordle.");
  }
}

window.saveWordleEditor = saveWordleEditor;