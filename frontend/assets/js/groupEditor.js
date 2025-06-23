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
// ==================== groupEditor.js ====================
// Frontend logic para crear, editar o visualizar un grupo en EduWordle

// Obtener parámetros de URL
const params = new URLSearchParams(window.location.search);
const mode = params.get("mode");       // "create", "edit", "visual"
const groupId = params.get("id");
let sessionGroup = null;
let originalStudentIds = [];

// DOMContentLoaded: inicialización general
document.addEventListener("DOMContentLoaded", async () => {

  const mode = new URLSearchParams(window.location.search).get('mode');
  const infoBtn = document.getElementById('students-info-btn');

  // Solo mostrar el botón en modo 'create'
  if (mode == 'visual') {
    infoBtn.style.display = 'none';
  }

  // 1) Configuración de fechas
  const today = new Date().toISOString().split("T")[0];
  const nextYear = new Date(new Date().setFullYear(new Date().getFullYear() + 1))
    .toISOString().split("T")[0];
  document.getElementById("initDate").value = today;
  document.getElementById("endDate").value = nextYear;

  // Radios para habilitar/deshabilitar endDate
  document.getElementById("noEndDate").addEventListener("change", () => {
    document.getElementById("endDate").disabled = true;
  });
  document.getElementById("setEndDate").addEventListener("change", () => {
    document.getElementById("endDate").disabled = false;
  });

  // Ajustar título de la página
  const pageTitle = mode === "edit" ? "Editar Grupo"
    : mode === "visual" ? "Ver Grupo"
      : "Crear Grupo";
  document.getElementById("pageTitle").textContent = pageTitle;

  // Exponer en window para popups
  window.removeItemById = removeItemById;
  window.displayItem = displayItem;

  if (mode === 'visual') {
    document.body.classList.add('visual-mode');
  
  }
  


  // 2) Cargar datos si edit o visual, o inicializar vacío
  if ((mode === "edit" || mode === "visual") && groupId) {
    try {
      sessionGroup = await loadGroupData(groupId);
      const pending = JSON.parse(localStorage.getItem('pendingStudents') || '[]');

      const allStudents = [...sessionGroup.students, ...pending];
      const uniqueByEmail = [];
      const seenEmails = new Set();

      for (const student of allStudents) {
        const normalizedEmail = student.email.trim().toLowerCase();
        if (!seenEmails.has(normalizedEmail)) {
          seenEmails.add(normalizedEmail);
          uniqueByEmail.push(student);
        }
      }
      sessionGroup.students = uniqueByEmail;
      console.log(sessionGroup);
      window.sessionGroup = sessionGroup;
      originalStudentIds = sessionGroup.students.map(s => s.id);
      displayData(sessionGroup);

    } catch (err) {
      console.error("Error cargando el grupo:", err);
      toastr.error("No se pudo cargar los datos del grupo.");
    }
    
  } else {
    // Crear nuevo grupo
    sessionGroup = {
      id: null,
      nombre: "",
      initDate: today,
      endDate: null,
      students: [],
      wordles: []
    };
    window.sessionGroup = sessionGroup;
    displayData(sessionGroup);
  }
});

// loadGroupData: obtiene JSON del servidor y normaliza
async function loadGroupData(groupId) {
  const g = await apiService.getGroupDetails(groupId, role);
  return {
    id: g.id,
    nombre: g.name,
    initDate: g.initDate,
    endDate: g.endDate,
    students: Array.isArray(g.students)
      ? g.students.map(s => ({ email: s.email, id: s.id }))
      : [],
    wordles: Array.isArray(g.accessibleWordles)
      ? g.accessibleWordles.map(w => ({ nombre: w.name, id: w.id }))
      : []
  };
}

// displayData: rellena la UI según modo y datos
function displayData(group) {
  const saveBtn = document.querySelector(".save-button");
  if (mode === "visual") {
    document.querySelector(".group-name").innerHTML = `<h1>${group.nombre}</h1>`;
    // Ocultar botón 'Guardar'
    if (saveBtn) saveBtn.remove();
    // Botones editar y borrar
    if (role === 'teacher') {
      const cont = document.querySelector(".container");
      const opts = document.createElement("div");
      opts.classList.add("buttonSection");
      const btnEdit = document.createElement("button");
      btnEdit.textContent = "Editar";
      btnEdit.classList.add("action-button", "edit-button");
      btnEdit.onclick = () => {
        const url = new URL(window.location.href);
        url.searchParams.set("mode", "edit");
        window.location.href = url;
      };
      const btnDel = document.createElement("button");
      btnDel.textContent = "Eliminar";
      btnDel.classList.add("action-button", "delete-button");
      btnDel.onclick = () => openPopup('delete');
      opts.append(btnEdit, btnDel);
      cont.appendChild(opts);
    }
    // Fechas como texto
    toggleDateDisplay(group);
  } else {
    // Modo edit/create: rellenar inputs
    document.getElementById("groupName").value = group.nombre;
    displayConfig(group.initDate, group.endDate);
  }
  // Listados (añade '+' en edit/create)
  displayItems(group.students, "students");
  displayItems(group.wordles, "wordles");

  checkOverflow();
}

// displayItems: pinta alumnos o wordles en su contenedor
function displayItems(items, type) {
  const cont = document.getElementById(`container-${type}`);
  cont.innerHTML = "";
  if (mode !== "visual" && !cont.querySelector('.add-button')) {
    const btn = document.createElement('div');
    btn.classList.add('add-button');
    btn.textContent = '+';
    btn.onclick = () => openPopup(type);
    cont.appendChild(btn);
  }
  items.forEach(item => displayItem(item, type));
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
    let elements = ["students", "wordles"];
    const VISIBLE_LIMIT = 3;

    elements.forEach(element => {

        const container = document.getElementById("container-" + element);
        const section = container.closest(".group-section");
        const showMoreButton = section.querySelector(".show-more");


        if (element === "students") {
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
    const section = button.closest(".group-section");
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

// displayItem: crea un elemento para un alumno o wordle
function displayItem(item, type) {
  const cont = document.getElementById(`container-${type}`);
  const div = document.createElement('div');
  div.classList.add('list-item');
  div.id = `item-${item.id}`;
  const a = document.createElement('a');
  a.textContent = type === 'students' ? item.email : item.nombre;
  div.appendChild(a);
  if (mode !== 'visual') {
    const btnX = document.createElement('button');
    btnX.classList.add('item-remove');
    btnX.onclick = () => removeItemById(item.id, type);
    div.appendChild(btnX);
  }
  cont.appendChild(div);
}

// removeItemById: elimina del DOM y de sessionGroup
function removeItemById(id, type) {
  const el = document.getElementById(`item-${id}`);
  if (el) el.remove();
  if (window.sessionGroup) {
    window.sessionGroup[type] = window.sessionGroup[type]
      .filter(x => x.id !== id);
  }
  checkOverflow();
}

// displayConfig: inputs de fecha en edit/create
function displayConfig(initDate, endDate) {
  document.getElementById("initDate").value = initDate;
  const end = document.getElementById("endDate");
  if (endDate) { end.value = endDate; end.disabled = false; document.getElementById("setEndDate").checked = true; }
  else { end.value = ''; end.disabled = true; document.getElementById("noEndDate").checked = true; }
}

// toggleDateDisplay: muestra fechas como div en modo visual
function toggleDateDisplay(group) {
  const inp1 = document.getElementById("initDate"), inp2 = document.getElementById("endDate");
  const no = document.getElementById("noEndDate"), si = document.getElementById("setEndDate");
  const d1 = document.createElement('div'), d2 = document.createElement('div');
  d1.classList.add('date-box'); d1.textContent = group.initDate;
  d2.classList.add('date-box'); d2.textContent = group.endDate || 'Fecha no definida';
  inp1.replaceWith(d1); inp2.replaceWith(d2);
  no.parentElement.style.display = 'none'; si.parentElement.style.display = 'none';
}

window.saveGroup = async function () {
  // 1) Leer y validar campos
  const name = document.getElementById('groupName').value.trim();
  const initDate = document.getElementById('initDate').value;
  const endDate = document.getElementById('endDate').value || null;

  if (!name || !initDate) {
    toastr.error('El nombre y la fecha de inicio son obligatorios');
    return;
  }

  // 2) Recoger solo los emails de los alumnos
  const studentEmails = (sessionGroup.students || [])
    .map(s => s.email?.trim().toLowerCase())
    .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));


  const currentStudentIds = (sessionGroup.students || [])
    .map(s => s.id)
    .filter(id => id !== null && id !== undefined); // ← Filtrar nulls

  const removeStudentIds = originalStudentIds
    .filter(id => Number.isInteger(id) && !currentStudentIds.includes(id));

  // 3) Recoger solo los IDs de los wordles
  const wordleIds = (sessionGroup.wordles || [])
    .map(w => parseInt(w.id))
    .filter(id => !isNaN(id));

  // 4) Construir payload
  const payload = {
    name,
    initDate,
    endDate,
    studentEmails,
    wordleIds,
    removeStudentIds
  };

  try {
    let res;

    if (!sessionGroup.id) {
      // Crear grupo nuevo
      console.log("Payload enviado a la API:", JSON.stringify(payload, null, 2));
      res = await apiService.createGroup(payload);
      sessionGroup.id = res.id;
      toastr.success('Grupo creado correctamente');
      window.history.replaceState(null, null,
        `groupEditor.html?mode=edit&id=${res.id}&teacherId=${userId}`
      );
    } else {
      // Actualizar grupo existente
      console.log("Payload enviado a la API:", JSON.stringify(payload, null, 2));
      await apiService.updateGroup(sessionGroup.id, payload);
      toastr.success('Grupo actualizado correctamente');
    }

    // Limpiar pendientes de localStorage
    localStorage.removeItem('pendingStudents');

    setTimeout(() => {
      window.location.replace(`dashboard.html?type=teacher`);
    }, 1000);

  } catch (err) {
    console.error('Error en la API:', err);
    toastr.error(err.message || 'Error guardando el grupo');
  }
};



// ===============================================================
