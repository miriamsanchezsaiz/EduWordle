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
function saveStudent() {
  const email = document.getElementById('email').value.trim();
  const name  = document.getElementById('name')?.value.trim() || '';
  if (!email) {
    toastr.error('El email es obligatorio');
    return;
  }
  window.sessionGroup = window.sessionGroup || { students: [], wordles: [] };
  const student = { id: null, email, name };
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

async function saveWordleToGroup() {
  const sel = document.getElementById('wordle-select');
  const id  = sel.value;
  if (!id) return toastr.error('Selecciona un wordle');
  const cur = sel.options[sel.selectedIndex].textContent;
  const obj = { id, name:cur };
  window.sessionGroup.wordles.push(obj);
  window.displayItem(obj,'wordles');
  if (window.sessionGroup.id) {
    try {
      await apiService.assignWordleToGroup(window.sessionGroup.id, id);
    } catch(e) {
      console.error(e);
      toastr.error('Error asociando wordle');
    }
  }
  toastr.success('Wordle añadido');
  closePopup();
}
window.saveWordleToGroup = saveWordleToGroup;

// saveWord: crea una palabra nueva en la BD y actualiza el UI
function saveWord() {
  window.sessionWordle = window.sessionWordle || { words:[] };
  const t = document.getElementById('word-input').value.trim();
  const h = document.getElementById('hint-input').value.trim();
  if (!t) return toastr.error('La palabra es obligatoria');
  const w = { title:t, hint:h };
  window.sessionWordle.words.push(w);
  localStorage.setItem('pendingWords', JSON.stringify(window.sessionWordle.words));
  window.displayItem(w,'words');
  toastr.success('Palabra guardada localmente');
  closePopup();
}
window.saveWord = saveWord;

// saveQuestion: crea una pregunta nueva en la BD y actualiza el UI
function saveQuestion() {
  window.sessionWordle = window.sessionWordle || { questions:[] };
  const stmt = document.getElementById('hint-input').value.trim();
  const opts = [...document.querySelectorAll('.option-input')].map(div=>div.querySelector('input').value.trim());
  const corr = [...document.querySelectorAll('.option-input')]
    .filter(div=>div.querySelector('input[type=checkbox]').checked)
    .map(div=>div.querySelector('input[type=text]').value.trim());
  if (!stmt) return toastr.error('Enunciado obligatorio');
  if (opts.length<2) return toastr.error('Mínimo 2 opciones');
  if (!corr.length) return toastr.error('Mínimo 1 respuesta correcta');
  const q = { statement:stmt, options:opts, correctAnswer:corr, type:corr.length>1?'multiple':'single' };
  window.sessionWordle.questions.push(q);
  localStorage.setItem('pendingQuestions', JSON.stringify(window.sessionWordle.questions));
  window.displayItem(q,'questions');
  toastr.success('Pregunta guardada localmente');
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
  const lines = text.split(';').map(l => l.trim()).filter(l => l);
  window.sessionGroup = window.sessionGroup || {};
  window.sessionGroup.students = Array.isArray(window.sessionGroup.students)
    ? window.sessionGroup.students
    : [];
  lines.forEach(line => {
    const [name, email] = line.split(';').map(cell => cell.trim());
    if (email) {
      const student = { id: null, name, email };
      window.sessionGroup.students.push(student);
      window.displayItem(student, 'students');
    }
  });
  localStorage.setItem(
    'pendingStudents',
    JSON.stringify(window.sessionGroup.students)
  );
  toastr.success(`${lines.length} alumnos importados localmente`);
};

window.uploadStudentsCSV = uploadStudentsCSV;

// --- Palabras: CSV palabra;pista ----------------------------------

/**
 * Procesa CSV de palabras: cada línea "palabra;pista"
 */
async function uploadWordsCSV(evt) {
const file = evt.target.files[0];
  if (!file) return;
  const text = await file.text();
  const lines = text.split(';').map(l => l.trim()).filter(l => l);
  window.sessionWordle = window.sessionWordle || {};
  window.sessionWordle.words = Array.isArray(window.sessionWordle.words)
    ? window.sessionWordle.words
    : [];
  lines.forEach(line => {
    const [title, hint] = line.split(';').map(cell => cell.trim());
    if (title) {
      const word = { id: null, title, hint };
      window.sessionWordle.words.push(word);
      window.displayItem(word, 'words');
    }
  });
  localStorage.setItem(
    'pendingWords',
    JSON.stringify(window.sessionWordle.words)
  );
  toastr.success(`${lines.length} palabras importadas localmente`);
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
  const lines = text.split(';').map(l => l.trim()).filter(l => l);
  window.sessionWordle = window.sessionWordle || {};
  window.sessionWordle.questions = Array.isArray(window.sessionWordle.questions)
    ? window.sessionWordle.questions
    : [];
  lines.forEach(line => {
    const cols = line.split(';').map(cell => cell.trim());
    const statement = cols[0] || '';
    const options = cols[1]
      ? cols[1].split(',').map(o => o.trim())
      : [];
    const correctAnswer = cols[2]
      ? cols[2].split(',').map(ca => ca.trim())
      : [];
    const qtype = cols[3]
      ? cols[3]
      : (correctAnswer.length > 1 ? 'multiple' : 'single');
    if (statement) {
      const question = { id: null, statement, options, correctAnswer, type: qtype };
      window.sessionWordle.questions.push(question);
      window.displayItem(question, 'questions');
    }
  });
  localStorage.setItem(
    'pendingQuestions',
    JSON.stringify(window.sessionWordle.questions)
  );
  toastr.success(`${lines.length} preguntas importadas localmente`);

}
window.uploadQuestionsCSV = uploadQuestionsCSV;
