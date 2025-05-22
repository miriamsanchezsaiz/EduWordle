const role      = sessionStorage.getItem('role');
const teacherId = sessionStorage.getItem('teacherId');
const studentId = sessionStorage.getItem('studentId');
if (!role || (!teacherId && !studentId)) {
  window.location.replace('login.html');
}
// ==================== groupEditor.js ====================
// Frontend logic para crear, editar o visualizar un grupo en EduWordle

// Obtener parámetros de URL
const params    = new URLSearchParams(window.location.search);
const mode      = params.get("mode");       // "create", "edit", "visual"
const groupId   = params.get("id");
let sessionGroup = null;

// DOMContentLoaded: inicialización general
document.addEventListener("DOMContentLoaded", async () => {
  // 1) Configuración de fechas
  const today    = new Date().toISOString().split("T")[0];
  const nextYear = new Date(new Date().setFullYear(new Date().getFullYear() + 1))
                   .toISOString().split("T")[0];
  document.getElementById("initDate").value = today;
  document.getElementById("endDate").value  = nextYear;

  // Radios para habilitar/deshabilitar endDate
  document.getElementById("noEndDate").addEventListener("change", () => {
    document.getElementById("endDate").disabled = true;
  });
  document.getElementById("setEndDate").addEventListener("change", () => {
    document.getElementById("endDate").disabled = false;
  });

  // Ajustar título de la página
  const pageTitle = mode === "edit"   ? "Editar Grupo"
                      : mode === "visual" ? "Ver Grupo"
                      : "Crear Grupo";
  document.getElementById("pageTitle").textContent = pageTitle;
  /*if (mode === "create") {
  document
    .getElementById("container-students")
    .closest("section")
    .style.display = "none";
  document
    .getElementById("container-wordles")
    .closest("section")
    .style.display = "none";
}*/

  // Exponer en window para popups
  window.removeItemById  = removeItemById;
  window.displayItem     = displayItem;

  // 2) Cargar datos si edit o visual, o inicializar vacío
  if ((mode === "edit" || mode === "visual") && groupId) {
    try {
      sessionGroup = await loadGroupData(groupId);
      window.sessionGroup = sessionGroup;
      displayData(sessionGroup);
    } catch (err) {
      console.error("Error cargando el grupo:", err);
      toastr.error("No se pudo cargar los datos del grupo.");
    }
  } else {
    // Crear nuevo grupo
    sessionGroup = {
      id:       null,
      nombre:   "",
      initDate: today,
      endDate:  null,
      students: [],
      wordles:  []
    };
    window.sessionGroup = sessionGroup;
    displayData(sessionGroup);
  }
});

// loadGroupData: obtiene JSON del servidor y normaliza
async function loadGroupData(groupId) {
  const res = await fetch(`/grupos/${groupId}`);
  if (!res.ok) throw new Error("Error al cargar datos del grupo");
  const g = await res.json();
  return {
    id:       g.id,
    nombre:   g.nombre,
    initDate: g.initDate,
    endDate:  g.endDate,
    students: Array.isArray(g.students)
              ? g.students.map(s => ({ email: s.email, id: s.id }))
              : [],
    wordles: Array.isArray(g.wordles)
              ? g.wordles.map(w => ({ nombre: w.nombre, id: w.id }))
              : []
  };
}

// displayData: rellena la UI según modo y datos
function displayData(group) {
  const saveBtn = document.querySelector(".save-button");
  if (mode === "visual") {
    // Nombre como H1
    document.querySelector(".group-name").innerHTML = `<h1>${group.nombre}</h1>`;
    // Ocultar botón 'Guardar'
    if (saveBtn) saveBtn.remove();
    // Botones editar y borrar
    if (teacherId) {
      const cont = document.querySelector(".container");
      const opts = document.createElement("div");
      opts.classList.add("buttonSection");
      const btnEdit = document.createElement("button");
      btnEdit.textContent = "Editar";
      btnEdit.classList.add("action-button","edit-button");
      btnEdit.onclick = () => {
        const url = new URL(window.location.href);
        url.searchParams.set("mode","edit");
        window.location.href = url;
      };
      const btnDel = document.createElement("button");
      btnDel.textContent = "Eliminar";
      btnDel.classList.add("action-button","delete-button");
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
  displayItems(group.wordles,  "wordles");
}

// displayItems: pinta alumnos o wordles en su contenedor
  function displayItems(items, type) {
  const cont = document.getElementById(`container-${type}`);
  cont.innerHTML = "";
  items.forEach(item => displayItem(item,type));
  if (mode !== "visual" && !cont.querySelector('.add-button')) {
    const btn = document.createElement('div');
    btn.classList.add('add-button');
    btn.textContent = '+';
    btn.onclick = () => openPopup(type);
    cont.appendChild(btn);
  }
}

// displayItem: crea un elemento para un alumno o wordle
function displayItem(item, type) {
  const cont = document.getElementById(`container-${type}`);
  const div  = document.createElement('div');
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
function removeItemById(id,type) {
  const el = document.getElementById(`item-${id}`);
  if (el) el.remove();
  if (window.sessionGroup) {
    window.sessionGroup[type] = window.sessionGroup[type]
      .filter(x => x.id !== id);
  }
}

// displayConfig: inputs de fecha en edit/create
function displayConfig(initDate, endDate) {
  document.getElementById("initDate").value = initDate;
  const end = document.getElementById("endDate");
  if (endDate) { end.value = endDate; end.disabled = false; document.getElementById("setEndDate").checked = true; }
  else      { end.value = ''     ; end.disabled = true ; document.getElementById("noEndDate").checked = true; }
}

// toggleDateDisplay: muestra fechas como div en modo visual
function toggleDateDisplay(group) {
  const inp1 = document.getElementById("initDate"), inp2 = document.getElementById("endDate");
  const no   = document.getElementById("noEndDate"), si   = document.getElementById("setEndDate");
  const d1 = document.createElement('div'), d2 = document.createElement('div');
  d1.classList.add('date-box'); d1.textContent = group.initDate;
  d2.classList.add('date-box'); d2.textContent = group.endDate || 'Fecha no definida';
  inp1.replaceWith(d1); inp2.replaceWith(d2);
  no.parentElement.style.display = 'none'; si.parentElement.style.display = 'none';
}

window.saveGroup = async function() {
  const nombre   = document.getElementById("groupName").value.trim();
  const initDate = document.getElementById("initDate").value;
  const endDate  = document.getElementById("endDate").value || null;

  if (!nombre || !initDate) {
    toastr.error("Nombre y fecha de inicio son obligatorios.");
    return;
  }

  if (!sessionGroup.id) {
    try {
      const res = await fetch('/grupos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, initDate, endDate, teacherId })
      });
      if (!res.ok) throw new Error('Error creando grupo');
      const data = await res.json();
      sessionGroup.id = data.id;             // guardo el nuevo ID
      window.location.href =               // recargo en modo edit
        `groupEditor.html?mode=edit&id=${data.id}&teacherId=${teacherId}`;
      toastr.success("Grupo creado correctamente");
    } catch (e) {
      console.error(e);
      toastr.error(e.message);
    }
    return;
  }
  try {
    const alumnos = sessionGroup.students.map(s => s.id);
    const wordles = sessionGroup.wordles.map(w => w.id);
    const res = await fetch(`/grupos/${sessionGroup.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, initDate, endDate, alumnos, wordles })
    });
    if (!res.ok) throw new Error('Error actualizando grupo');
    toastr.success("Grupo actualizado correctamente");
    setTimeout(() => {
      window.location.href = `list.html?type=group&teacherId=${teacherId}`;
    }, 500);
  } catch (e) {
    console.error(e);
    toastr.error(e.message);
  }
};


// ===============================================================
