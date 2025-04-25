//TODO: no funciona el load Groups

// popup.js
// Lógica de popups para Group Editor y Wordle Editor

// Cargar dinámicamente los templates de popups
fetch("/popups.html")
  .then(res => res.text())
  .then(html => {
    document.getElementById("popup-placeholder").innerHTML = html;
  });

// Función para abrir un popup por su tipo (students o wordles, etc.)
function openPopup(popupType) {
  const popupBody = document.getElementById("popup-body");
  const template  = document.getElementById(popupType);
  if (!template) return;
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

// Cargar lista de grupos (solo frontend de ejemplo)
function loadListGroups() {
  // TODO: implementar fetch si procede
  const grupos = [ /* ... */ ];
  const select = document.getElementById("group-select");
  select.innerHTML = '<option value="" disabled selected>Selecciona un grupo</option>';
  grupos.forEach(g => {
    const opt = document.createElement("option");
    opt.value = g.groupId;
    opt.textContent = g.name;
    select.appendChild(opt);
  });
}

// Cargar lista de wordles disponibles para el profesor
function loadListWordles() {
  const params    = new URLSearchParams(window.location.search);
  const teacherId = params.get("teacherId");
  if (!teacherId) {
    toastr.error("No se ha identificado al profesor");
    return;
  }
  fetch(`/wordles?teacherId=${teacherId}`)
    .then(res => {
      if (!res.ok) throw new Error("Error al cargar wordles");
      return res.json();
    })
    .then(list => {
      const select = document.getElementById("wordle-select");
      select.innerHTML = '<option value="" disabled selected>Selecciona un wordle</option>';
      list.forEach(w => {
        const opt = document.createElement("option");
        opt.value = w.id;
        opt.textContent = w.nombre;
        select.appendChild(opt);
      });
    })
    .catch(err => {
      console.error("Error al cargar wordles:", err);
      toastr.error(err.message);
    });
}

// Añadir una opción extra (para preguntas)
function addOption() {
  const cont = document.getElementById("options-container");
  const div  = document.createElement("div");
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
async function saveStudent() {
  const email = document.getElementById("email").value.trim();
  if (!email) {
    toastr.error("Debes introducir un email");
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
  } catch(e) {
    console.error("Error en saveStudent:", e);
    toastr.error(e.message);
  }
}
window.saveStudent = saveStudent;

// Función para guardar nuevo wordle en el grupo
function saveWordle() {
  const sel = document.getElementById("wordle-select");
  const id  = sel.value;
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
    const wordleId   = select.value;
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

function backFromEdit() {
    const mode = new URLSearchParams(window.location.search).get("mode");
    if (mode !== "visual") {
      const placeholder = document.getElementById("popup-placeholder");
      placeholder.className = 'popup-overlay';   // aplica overlay
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
  
