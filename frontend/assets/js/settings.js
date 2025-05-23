// assets/js/settings.js

const role      = sessionStorage.getItem('role');
const teacherId = sessionStorage.getItem('teacherId');
const studentId = sessionStorage.getItem('studentId');
if (!role || (!teacherId && !studentId)) {
  window.location.replace('login.html');
}

// Leer params de URL para saber si es alumno o profesor
const params      = new URLSearchParams(window.location.search);

// Botón y campos
const btnSave     = document.getElementById("savePasswordBtn");
const inpPass     = document.getElementById("password");
const inpConfirm  = document.getElementById("confirm-password");

// Toastr ya está cargado en settings.html

btnSave.addEventListener("click", async () => {
  const pass = inpPass.value.trim();
  const confirm = inpConfirm.value.trim();
  if (!pass || !confirm) {
    toastr.error("Debes rellenar ambos campos");
    return;
  }
  if (pass !== confirm) {
    toastr.error("Las contraseñas no coinciden");
    return;
  }

  if (pass.length < 8) {
    toastr.error("La contraseña debe tener al menos 8 caracteres");
    return;
  }

  // Decide ruta según rol
  let url;
  if (teacherId) {
    url = `/profesores/${teacherId}/password`;
  } else if (studentId) {
    url = `/alumnos/${studentId}/password`;
  } else {
    toastr.error("No se ha identificado el usuario");
    return;
  }

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pass })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error al cambiar contraseña");
    }
    toastr.success("Contraseña actualizada");
    // Opcional: limpiar campos
    inpPass.value = "";
    inpConfirm.value = "";
  } catch (e) {
    console.error("Error al guardar contraseña:", e);
    toastr.error(e.message);
  }
});
