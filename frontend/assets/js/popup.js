// assets/js/popup.js
import { apiService } from './apiService.js';

const toastr = window.toastr;
if (typeof toastr === 'undefined') {
  console.error('Toastr.js no está cargado o no es accesible globalmente.');
}

function loadPopupBaseStructure() {
  const popupPlaceholder = document.getElementById("popup-placeholder");
  if (popupPlaceholder) {
    popupPlaceholder.innerHTML = ""; 
    popupPlaceholder.innerHTML = `
      <div id="popup-container" class="popup-overlay"></div>
      <div class="popup-panel">
        <button class="close-button" onclick="closePopup()">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="grey"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x h-4 w-4">
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </button>
        <div id="popup-body"></div>
      </div>
    `;
    popupPlaceholder.classList.add("hidden"); 
  } else {
    console.error("Element with ID 'popup-placeholder' not found.");
  }
}

// Llama a esta función al inicio para cargar la estructura base.
document.addEventListener('DOMContentLoaded', loadPopupBaseStructure);



// Cargar dinámicamente los templates de popups
fetch("/popups.html")
  .then(res => res.text())
  .then(html => {
    // Crea un div temporal para parsear el HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html; 
    const popupPlaceholder = document.getElementById("popup-placeholder");

    if (popupPlaceholder) {
      Array.from(tempDiv.children).forEach(child => {
        if (child.tagName === 'TEMPLATE') {
          document.body.appendChild(child.cloneNode(true)); 
        }
      });
    }
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

  if (popupType === 'delete') {
    setTimeout(() => {
      const btn = document.querySelector('#popup-body .exit-button');
      if (btn) {
        btn.onclick = async function () {
          try {
            if (window.sessionGroup?.id) {
              await apiService.deleteGroup(window.sessionGroup.id);
              toastr.success("Grupo eliminado correctamente");
              closePopup();
              const userId = sessionStorage.getItem('userId');
              window.location.replace (`dashboard.html?type=group&teacherId=${userId}`);
            } else if (window.sessionWordle?.id) {
              await apiService.deleteWordle(window.sessionWordle.id);
              toastr.success("Wordle eliminado correctamente");
              closePopup();
              const userId = sessionStorage.getItem('userId');
              window.location.replace(`dashboard.html?type=wordle&teacherId=${userId}`);
            } else {
              throw new Error("No hay entidad válida para eliminar");
            }
          } catch (error) {
            console.error("Error eliminando grupo o wordle:", error);
            toastr.error(error.message || "Error al eliminar el elemento");
          }
        };
      }
    }, 50);
  }


  // Cargar datos específicos para popups de selección
  if (popupType === "groups") {
    loadListGroups();
  } else if (popupType === "wordles") {
    loadListWordles();
  }
}
window.openPopup = openPopup;


function sessionExpiredPopup() {
  console.log(`[JWT ERROR] : Abriendo popup de mensaje `);

  openPopup('sessionExpired');
  const closeButton = document.getElementsByClassName("close-button")[0];
  closeButton.remove();

  const reloginButton = document.getElementById("reloginButton");
  if (reloginButton) {
    reloginButton.onclick = () => window.location.href = "/login.html";
  }

}
window.sessionExpiredPopup = sessionExpiredPopup;


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
    let userId = null;
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
    const groups = await apiService.fetchGroups("teacher"); 
    const select = document.getElementById("group-select");
    select.innerHTML = '<option value="" disabled selected>Selecciona un grupo</option>';
    groups.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = g.name; 
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
  let role = null;
  
  if (currentUserString) {
    try {
      const currentUser = JSON.parse(currentUserString);
      role = currentUser.role;
    } catch (e) {
      console.error("Error parsing currentUser for role:", e);
    }
  }

  if (!role) {
    toastr.error("No se ha identificado al usuario. Por favor, inicie sesión.");
    return;
  }

  try {
    const wordles = await apiService.fetchWordles(role); 
    const select = document.getElementById("wordle-select");
    select.innerHTML = '<option value="" disabled selected>Selecciona un wordle</option>';
    wordles.forEach(w => {
      const opt = document.createElement("option");
      opt.value = w.id;
      opt.textContent = w.name;
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
function saveStudent() {
  const email = document.getElementById('email').value.trim();
  const name  = document.getElementById('name')?.value.trim() || '';
  if (!email) {
    toastr.error('El email es obligatorio');
    return;
  }
  window.sessionGroup = window.sessionGroup || { students: [], wordles: [] };
  const student = { id: null, email, name };

  // Comprobar si el alumno ya existe
  const existingStudent = window.sessionGroup.students.find(s => s.email.toLowerCase() === email.toLowerCase());
  if (existingStudent) {
    toastr.warning(`El alumno con email ${email} ya está en el grupo.`);
    return;
  }


  window.sessionGroup.students.push(student);
  localStorage.setItem(
    'pendingStudents',
    JSON.stringify(window.sessionGroup.students)
  );
  window.displayItem(student, 'students');
  toastr.success('Alumno añadido (pendiente de guardar grupo)');

  closePopup();
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

function saveWordleToGroup() {
  const sel = document.getElementById('wordle-select');
  const id = sel.value;
  const name = sel.options[sel.selectedIndex]?.textContent;

  if (!id) {
    toastr.error('Selecciona un wordle');
    return;
  }

  const alreadyExists = sessionGroup.wordles.some(w => w.id == id);
  if (alreadyExists) {
    toastr.warning("Este wordle ya está asignado al grupo.");
    return;
  }

  const wordle = { id };
  sessionGroup.wordles.push(wordle);

  const visualItem = { id, nombre: name };
  displayItem(visualItem, 'wordles');

  toastr.success('Wordle añadido');
  closePopup();
}


window.saveWordleToGroup = saveWordleToGroup;

// saveWord: crea una palabra nueva en la BD y actualiza el UI
function saveWord() {
  const wordInput = document.getElementById("word-input");
  const hintInput = document.getElementById("hint-input");
  const word = wordInput.value.trim().toUpperCase();
  const hint = hintInput.value.trim();

  if (!word) {
    toastr.error("La palabra no puede estar vacía.");
    return;
  }

  const wordExists = sessionWordle.words.some(existingWord => existingWord.word === word);
  if (wordExists) {
    toastr.error(`La palabra "${word}" ya ha sido añadida a este Wordle.`);
    return; 
  }
  
  sessionWordle.words.push({
    id: null,
    word,
    hint
  });

  localStorage.setItem("pendingWords", JSON.stringify(sessionWordle.words));
  closePopup();
  displayItem({ word, hint }, "words");
}
window.saveWord = saveWord;

// saveQuestion: crea una pregunta nueva en la BD y actualiza el UI
function saveQuestion() {
  const questionInput = document.getElementById("hint-input");
  const question = questionInput?.value.trim();

  const optionDivs = document.querySelectorAll("#options-container .option-input");
  const options = [];
  const correctAnswer = [];

  optionDivs.forEach(div => {
    const input = div.querySelector("input[type='text']");
    const checkbox = div.querySelector("input[type='checkbox']");

    if (input && input.value.trim()) {
      const value = input.value.trim();
      options.push(value);
      if (checkbox?.checked) {
        correctAnswer.push(value);
      }
    }
  });

  if (options.length < 2) {
    toastr.error("Debes añadir al menos dos opciones para la pregunta.");
    return;
  }

  if (!question || options.length === 0 || correctAnswer.length === 0) {
    toastr.error("Completa todos los campos y marca al menos una respuesta correcta.");
    return;
  }

  const type = correctAnswer.length > 1 ? "multichoice" : "single";

  const newQuestion = {
    id: null,
    question: question,
    options,
    answer: correctAnswer,
    type
  };

  // Comprobar si la pregunta ya existe
  const existingQuestion = sessionWordle.questions.find(q => q.question.trim().toLowerCase() === question.toLowerCase());
  if (existingQuestion) {
    toastr.error(`La pregunta "${question}" ya ha sido añadida a este Wordle.`);
    return; 
  }

  sessionWordle.questions.push(newQuestion);
  localStorage.setItem("pendingQuestions", JSON.stringify(sessionWordle.questions));
  displayItem(newQuestion, "questions");
  closePopup();
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
  const groupObj = { id: groupId, name: groupName };
  window.sessionWordle.groups.push(groupObj);

  // 2) Reflejar en la UI
  displayItem(groupObj, "groups");
  toastr.success("Grupo añadido");

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
          <button class="close-button" onclick="closePopup()">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="grey" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x h-4 w-4">
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
            </svg></button>
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
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  // Siempre omitir la primera línea (header)
  const dataLines = lines.slice(1);

  window.sessionGroup = window.sessionGroup || {};
  window.sessionGroup.students = Array.isArray(window.sessionGroup.students)
    ? window.sessionGroup.students
    : [];

  const existingEmails = new Set(
    window.sessionGroup.students.map(s => s.email.trim().toLowerCase())
  );

  let added = 0;

  dataLines.forEach(line => {
    const [nameRaw, emailRaw] = line.split(';').map(cell => cell.trim());
    const email = emailRaw?.toLowerCase();
    const name = nameRaw?.trim() || '';

    if (!email || existingEmails.has(email)) return;

    const student = { id: null, name, email };
    window.sessionGroup.students.push(student);
    window.displayItem(student, 'students');
    existingEmails.add(email);
    added++;
  });

  localStorage.setItem(
    'pendingStudents',
    JSON.stringify(window.sessionGroup.students)
  );

  toastr.success(`${added} alumno(s) nuevos importados desde CSV`);
  closePopup();
}

window.uploadStudentsCSV = uploadStudentsCSV;

// --- Palabras: CSV palabra;pista ----------------------------------

/**
 * Procesa CSV de palabras: cada línea "palabra;pista"
 */
async function uploadWordsCSV(evt) {
  const file = evt.target.files[0];
  if (!file) return;

  const text = await file.text();
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const dataLines = lines.slice(1); // ignorar encabezado

  window.sessionWordle = window.sessionWordle || {};
  window.sessionWordle.words = Array.isArray(sessionWordle.words) ? sessionWordle.words : [];

  const existingWords = new Set(sessionWordle.words.map(w => w.word.trim().toUpperCase()));
  let added = 0;

  dataLines.forEach(line => {
    const [wordRaw, hint] = line.split(';').map(cell => cell.trim());
    const word = wordRaw?.toUpperCase();

    if (!word || existingWords.has(word)) return;

    const entry = { id: null, word, hint };
    sessionWordle.words.push(entry);
    window.displayItem(entry, 'words');
    existingWords.add(word);
    added++;
  });

  localStorage.setItem('pendingWords', JSON.stringify(sessionWordle.words));
  toastr.success(`${added} palabra(s) importadas desde CSV`);
  closePopup();
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
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const dataLines = lines.slice(1); // ignorar encabezado

  window.sessionWordle = window.sessionWordle || {};
  window.sessionWordle.questions = Array.isArray(sessionWordle.questions) ? sessionWordle.questions : [];

  const existingStatements = new Set(sessionWordle.questions.map(q => q.statement.trim().toLowerCase()));
  let added = 0;

  dataLines.forEach(line => {
    const cols = line.split(';').map(cell => cell.trim());
    const statement = cols[0];
    const options = cols[1] ? cols[1].split(',').map(o => o.trim()) : [];
    const correctAnswer = cols[2] ? cols[2].split(',').map(ca => ca.trim()) : [];
    const qtype = cols[3] || (correctAnswer.length > 1 ? 'multichoice' : 'single');

    const normalized = statement?.toLowerCase();
    if (!statement || existingStatements.has(normalized)) return;

    const question = {
      id: null,
      question: statement,
      options,
      correctAnswer,
      type: qtype
    };

    sessionWordle.questions.push(question);
    window.displayItem(question, 'questions');
    existingStatements.add(normalized);
    added++;
  });

  localStorage.setItem('pendingQuestions', JSON.stringify(sessionWordle.questions));
  toastr.success(`${added} pregunta(s) importadas desde CSV`);
  closePopup();
}
window.uploadQuestionsCSV = uploadQuestionsCSV;

