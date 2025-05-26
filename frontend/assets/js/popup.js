// assets/js/popup.js
import { apiService } from './apiService.js';

// Asegúrate de que toastr esté disponible globalmente
const toastr = window.toastr;
if (typeof toastr === 'undefined') {
  console.error('Toastr.js no está cargado o no es accesible globalmente.');
  // Considera un fallback o un mensaje de error más visible si es crítico
}
// Cargar dinámicamente los templates de popups
fetch("/popups.html")
  .then(res => res.text())
  .then(html => {
    document.getElementById("popup-placeholder").innerHTML = html;
  }).catch(err => console.error("Error al cargar popups.html:", err));

// Función para abrir un popup por su tipo (students o wordles, etc.)
function openPopup(popupType) {
  const popupBody = document.getElementById("popup-body");
  const template = document.getElementById(popupType);
  if (!template) {
    console.warn(`Template with ID '${popupType}' not found.`);
    return;
  }

  let content;
  if (template instanceof HTMLTemplateElement) {
    content = document.importNode(template.content, true);
  } else {
    content = template.innerHTML;
  }
  popupBody.innerHTML = "";
  if (content instanceof Node) popupBody.appendChild(content);
  else popupBody.innerHTML = content;
  document.getElementById("popup-placeholder").classList.remove("hidden");

  // Cargar datos específicos para popups de selección
  if (popupType === "groups") {
    loadListGroups();
  } else if (popupType === "wordles") {
    loadListWordles();
  }
}
window.openPopup = openPopup;

// Cerrar popup
function closePopup() {
  document.getElementById("popup-placeholder").classList.add("hidden");
}
window.closePopup = closePopup;

function openPopupPoints(points) {


  openPopup('game');
  const closeButton = document.getElementsByClassName("close-button")[0];
  closeButton.remove();
  const span = document.getElementById('points');

  if (span) {
    if (!points) {
      span.textContent = 0;
    }
    else {
      span.textContent = parseInt(points);
    }
  }

  const endBtn = document.getElementById("endButton");
  if (endBtn) {

    const currentUserString = sessionStorage.getItem('currentUser');
    let role = null;
    let userId = null; // Este será el studentId o teacherId
    let target = "/login.html";

    if (currentUserString) {
      try {
        const currentUser = JSON.parse(currentUserString);
        role = currentUser.role;
        userId = currentUser.id;

        if (role === 'student' && userId) {
          target = `/dashboard.html?type=student&studentId=${userId}`;
        } else if (role === 'teacher' && userId) {
          target = `/dashboard.html?type=teacher&teacherId=${userId}`;
        }


      } catch (e) {
        console.error('Error parsing currentUser from localStorage:', e);
      }
    }
    else {
      console.warn("No currentUser found in localStorage. Redirecting to login.");
    }

    endBtn.onclick = () => window.location.href = target;
  }
}

window.openPopupPoints = openPopupPoints;

// Cargar lista de grupos creados por el profesor
async function loadListGroups() {
  // 1) Leer teacherId de localStorage
  const currentUserString = sessionStorage.getItem('currentUser');
  let teacherId = null;
  if (currentUserString) {
    try {
      const currentUser = JSON.parse(currentUserString);
      if (currentUser.role === 'teacher') {
        teacherId = currentUser.id;
      }
    } catch (e) {
      console.error("Error parsing currentUser for teacherId:", e);
    }
  }

  if (!teacherId) {
    toastr.error("No se ha identificado al profesor. Por favor, inicie sesión como profesor.");
    return;
  }

  // 2) Hacer fetch real al backend
  try {
    // Usamos apiService.fetchGroups() que ya adaptamos para el profesor
    const groups = await apiService.fetchGroups(); // Asumo que este endpoint ya filtra por el teacherId del JWT
    const select = document.getElementById("group-select");
    select.innerHTML = '<option value="" disabled selected>Selecciona un grupo</option>';
    groups.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = g.name; // Asumo que el nombre del grupo es 'name'
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("Error cargando grupos:", err);
    toastr.error(err.message || "Error al cargar grupos.");
  }
}
window.loadListGroups = loadListGroups;


// Cargar lista de wordles disponibles para el profesor
async function loadListWordles() {
   const currentUserString = sessionStorage.getItem('currentUser');
    let teacherId = null;
    if (currentUserString) {
        try {
            const currentUser = JSON.parse(currentUserString);
            if (currentUser.role === 'teacher') {
                teacherId = currentUser.id;
            }
        } catch (e) {
            console.error("Error parsing currentUser for teacherId:", e);
        }
    }

    if (!teacherId) {
        toastr.error("No se ha identificado al profesor. Por favor, inicie sesión como profesor.");
        return;
    }


   try {
        // Usamos apiService.fetchWordles() que ya adaptamos para el profesor
        const wordles = await apiService.fetchWordles(); // Asumo que este endpoint ya filtra por el teacherId del JWT
        const select = document.getElementById("wordle-select");
        select.innerHTML = '<option value="" disabled selected>Selecciona un wordle</option>';
        wordles.forEach(w => {
            const opt = document.createElement("option");
            opt.value = w.id;
            opt.textContent = w.name; // Asumo que el nombre de la wordle es 'name'
            select.appendChild(opt);
        });
    } catch (err) {
        console.error("Error al cargar wordles:", err);
        toastr.error(err.message || "Error al cargar wordles.");
    }
}
window.loadListWordles = loadListWordles;

// Añadir una opción extra (para preguntas)
function addOption() {
  const cont = document.getElementById("options-container");
  const div = document.createElement("div");
  div.classList.add("option-input");
  div.innerHTML = `
    <input type="text" placeholder="Escribe aquí">
    <div class="correct-answer">
      <input type="checkbox" class="checkbox-answer">
    </div>`;
  cont.appendChild(div);
}
window.addOption = addOption;

// Función para guardar nuevo alumno vía popup
//TODO: Adaptar para añadir el nombre y para adaptarlo al nuevo código de groupEditor
async function saveStudent() {
  const email = document.getElementById("email").value.trim();
  const name = document.getElementById("name") ? document.getElementById("name").value.trim() : '';
  if (!email) {
    toastr.error("Debes introducir un email");
    return;
  }
  if (!name && document.getElementById("name")) { 
        toastr.error("Debes introducir un nombre para el alumno.");
        return;
    }

  try {
    const resp = await fetch("/alumnos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "Error al crear alumno");
    }
    const a = await resp.json();
    const student = { email: a.email, id: a.id };
    window.sessionGroup.students.push(student);
    window.displayItem(student, "students");
    toastr.success("Alumno añadido");
    closePopup();
  } catch (e) {
    console.error("Error en saveStudent:", e);
    toastr.error(e.message);
  }
}
window.saveStudent = saveStudent;

// Función para guardar nuevo wordle en el grupo
function saveWordle() {
  const sel = document.getElementById("wordle-select");
  const id = sel.value;
  const txt = sel.options[sel.selectedIndex]?.textContent;
  if (!id) {
    toastr.error("Debes seleccionar un wordle");
    return;
  }
  const wordle = { id, nombre: txt };
  window.sessionGroup.wordles.push(wordle);
  window.displayItem(wordle, "wordles");
  toastr.success("Wordle añadido");
  closePopup();
}
window.saveWordle = saveWordle;

async function saveWordleToGroup() {
  const select = document.getElementById("wordle-select");
  if (!select) {
    toastr.error("No se encontró el selector de Wordles");
    return;
  }
  const wordleId = select.value;
  if (!wordleId) {
    toastr.error("Debes seleccionar un Wordle");
    return;
  }
  const wordleName = select.options[select.selectedIndex].textContent;

  // añade al array local
  const wordleObj = { id: wordleId, nombre: wordleName };
  window.sessionGroup.wordles.push(wordleObj);
  displayItem(wordleObj, "wordles");
  toastr.success("Wordle añadido");

  // si el grupo ya tiene ID, guarda la relación
  if (window.sessionGroup.id) {
    try {
      await fetch("/wordle_groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordleId, groupId: window.sessionGroup.id })
      });
    } catch (err) {
      console.error(err);
      toastr.error("Error al guardar la relación en la base de datos");
    }
  }

  closePopup();
}
window.saveWordleToGroup = saveWordleToGroup;

// saveWord: crea una palabra nueva en la BD y actualiza el UI
async function saveWord() {
  // 1) Leer inputs del popup
  const wordInput = document.getElementById("word-input").value.trim().toLowerCase();
  const hintInput = document.getElementById("hint-input").value.trim();
  if (!wordInput) {
    toastr.error("La palabra es obligatoria.");
    return;
  }

  // 2) Enviar al servidor
  try {
    const res = await fetch("/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        word: wordInput,
        hint: hintInput,
        wordleId: window.sessionWordle.id
      })
    });
    if (!res.ok) throw new Error("Error creando palabra");

    // 3) Leer la respuesta y actualizar la sesión y UI
    const newWord = await res.json(); // { id, tittle, hint }
    window.sessionWordle.words.push(newWord);
    displayItem(newWord, "words");
    toastr.success("Palabra añadida");

    closePopup();
  } catch (err) {
    console.error("Error en saveWord:", err);
    toastr.error(err.message);
  }
}
window.saveWord = saveWord;

// saveQuestion: crea una pregunta nueva en la BD y actualiza el UI
async function saveQuestion() {
  // 1) Leer inputs del popup
  const statement = document.getElementById("hint-input").value.trim();
  if (!statement) {
    toastr.error("El enunciado es obligatorio.");
    return;
  }
  const optionsContainer = document.getElementById("options-container");
  const optionDivs = optionsContainer.querySelectorAll(".option-input");
  const options = [];
  const correctAnswers = [];
  optionDivs.forEach(div => {
    const text = div.querySelector("input[type='text']").value.trim();
    const checked = div.querySelector("input[type='checkbox']").checked;
    if (text) {
      options.push(text);
      if (checked) correctAnswers.push(text);
    }
  });
  if (options.length < 2) {
    toastr.error("Debes añadir al menos dos opciones.");
    return;
  }
  if (correctAnswers.length === 0) {
    toastr.error("Debes marcar al menos una respuesta correcta.");
    return;
  }
  const type = correctAnswers.length > 1 ? "multiple" : "single";

  // 2) Enviar al servidor
  try {
    const res = await fetch("/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statement,
        options,
        correctAnswers,
        type,
        wordleId: window.sessionWordle.id
      })
    });
    if (!res.ok) throw new Error("Error creando pregunta");

    // 3) Leer y actualizar
    const newQ = await res.json(); // { id, statement, options, correctAnswers, type }
    window.sessionWordle.questions.push(newQ);
    displayItem(newQ, "questions");
    toastr.success("Pregunta añadida");

    closePopup();
  } catch (err) {
    console.error("Error en saveQuestion:", err);
    toastr.error(err.message);
  }
}
window.saveQuestion = saveQuestion;

// Guarda la relación Wordle ↔ Grupo en memoria y en la BD
async function saveGroupToWordle() {
  const select = document.getElementById("group-select");
  if (!select) {
    toastr.error("No se encontró el selector de grupos");
    return;
  }
  const groupId = select.value;
  if (!groupId) {
    toastr.error("Debes seleccionar un grupo");
    return;
  }
  const groupName = select.options[select.selectedIndex].textContent;

  // 1) Añadir al array en memoria
  const groupObj = { id: groupId, nombre: groupName };
  window.sessionWordle.groups.push(groupObj);

  // 2) Reflejar en la UI
  displayItem(groupObj, "groups");
  toastr.success("Grupo añadido");

  // 3) Persistir en BD si el Wordle ya existe
  if (window.sessionWordle.id) {
    try {
      await fetch("/wordle_groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordleId: window.sessionWordle.id,
          groupId: groupId
        })
      });
    } catch (err) {
      console.error("Error asociando grupo a wordle:", err);
      toastr.error("Error al guardar la relación en la base de datos");
    }
  }

  // 4) Cerrar popup
  closePopup();
}
window.saveGroupToWordle = saveGroupToWordle;


function backFromEdit() {
  const mode = new URLSearchParams(window.location.search).get("mode");
  if (mode !== "visual") {
    const placeholder = document.getElementById("popup-placeholder");
    placeholder.className = 'popup-overlay';   
    placeholder.innerHTML = `
        <div class="popup-panel">
          <button class="close-button" onclick="closePopup()">×</button>
          <div class="popup-body">
            <h2>Salir de la página</h2>
            <p>¿Seguro que quieres salir de la edición? Los cambios no se guardarán.</p>
            <div class="buttonSection">
              <button class="exit-button" onclick="window.history.back()">Salir</button>
            </div>
          </div>
        </div>
      `;
    placeholder.classList.remove("hidden");
  } else {
    window.history.back();
  }
}
window.backFromEdit = backFromEdit;

// ======================= popup.js =======================

// --- Alumnos: CSV nombre;email ----------------------------------

/**
 * Dispara el <input type="file"> oculto y luego procesa cada fila
 */
async function uploadStudentsCSV(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const text = await file.text();
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  for (const row of lines) {
    const [nombre, email] = row.split(';').map(c => c.trim());
    if (!nombre || !email) {
      toastr.error(`Fila inválida: ${row}`);
      continue;
    }
    try {
      await saveStudentCSV(email, nombre);
    } catch (e) {
      console.error("Error subiendo alumno", row, e);
      toastr.error(`Error con ${row}: ${e.message}`);
    }
  }
  // permitir volver a seleccionar el mismo archivo
  evt.target.value = "";
}
window.uploadStudentsCSV = uploadStudentsCSV;

/**
 * Crea (o recupera) un alumno y lo asocia al grupo
 */
async function saveStudentCSV(email, nombre) {
  // 1) Crear o recuperar alumno
  let resp = await fetch("/alumnos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, nombre })
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || "Error creando alumno");
  }
  const alumno = await resp.json();

  // 2) Añadir al objeto JS y UI
  const student = { email: alumno.email, id: alumno.id };
  window.sessionGroup.students.push(student);
  window.displayItem(student, "students");
  toastr.success(`Alumno ${nombre} añadido`);

  // 3) Asociar en BD si el grupo ya existe
  if (window.sessionGroup.id) {
    resp = await fetch("/student_groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: alumno.id,
        groupId: window.sessionGroup.id
      })
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "Error asociando alumno");
    }
  }
}
window.saveStudentCSV = saveStudentCSV;


// --- Palabras: CSV palabra;pista ----------------------------------

/**
 * Procesa CSV de palabras: cada línea "palabra;pista"
 */
async function uploadWordsCSV(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const text = await file.text();
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  for (const row of lines) {
    const [word, hint] = row.split(';').map(c => c.trim());
    try {
      const resp = await fetch(`/wordles/${window.sessionWordle.id}/words`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, hint })
      });
      if (!resp.ok) throw new Error("Error creando palabra");
      const newW = await resp.json();
      window.sessionWordle.words.push(newW);
      displayItem(newW, "words");
      toastr.success(`Palabra "${word}" añadida`);
    } catch (e) {
      console.error("Error palabra:", row, e);
      toastr.error(`Palabra "${row}": ${e.message}`);
    }
  }
  evt.target.value = "";
}
window.uploadWordsCSV = uploadWordsCSV;


// --- Preguntas: CSV enunciado;op1,op2,op3,op4;corr1,corr2;type ----

/**
 * Procesa CSV de preguntas:
 *   enunciado;op1,op2,op3,op4;corr1,corr2;type
 */
async function uploadQuestionsCSV(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const text = await file.text();
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  for (const row of lines) {
    const [statement, optsRaw, corrRaw, type] = row.split(';').map(c => c.trim());
    const options = optsRaw.split(',').map(o => o.trim());
    const correctAnswer = corrRaw.split(',').map(o => o.trim());
    try {
      const resp = await fetch(`/wordles/${window.sessionWordle.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statement,
          options,
          correctAnswer,
          type
        })
      });
      if (!resp.ok) throw new Error("Error creando pregunta");
      const newQ = await resp.json();
      window.sessionWordle.questions.push(newQ);
      displayItem(newQ, "questions");
      toastr.success("Pregunta añadida");
    } catch (e) {
      console.error("Error pregunta:", row, e);
      toastr.error(`Pregunta "${statement}": ${e.message}`);
    }
  }
  evt.target.value = "";
}
window.uploadQuestionsCSV = uploadQuestionsCSV;
