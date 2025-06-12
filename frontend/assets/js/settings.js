// assets/js/settings.js
import { apiService } from './apiService.js';

const toastr = window.toastr;

const currentUserString = sessionStorage.getItem('currentUser');
let currentUser = null;
if (currentUserString) {
  try {
    currentUser = JSON.parse(currentUserString);
  } catch (e) {
    console.error("Error parsing currentUser from sessionStorage:", e);
  }
}

if (!currentUser || !currentUser.id || !currentUser.role) {
  console.warn("No user found in sessionStorage or incomplete data. Redirecting to login.");
  sessionStorage.clear(); // Limpia cualquier dato corrupto
  window.location.replace('login.html');
}

// Botón y campos
const btnSave = document.getElementById("savePasswordBtn");
const inpOldPass = document.getElementById("old-password");
const inpNewPass = document.getElementById("password");
const inpConfirmNewPass = document.getElementById("confirm-password");

const passwordToggleIcons = document.querySelectorAll('.password-toggle-icon');

passwordToggleIcons.forEach(icon => {
    icon.addEventListener('click', () => {
        // Encontrar el input de contraseña asociado
        const passwordInput = icon.previousElementSibling; // Es el elemento hermano anterior

        if (passwordInput && passwordInput.type) {
            const tipo = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = tipo;
            icon.textContent = tipo === 'password' ? '🐵' : '🙈'; // Cambia el emoji
        }
    });
});


btnSave.addEventListener("click", async () => {
  const oldPass = inpOldPass.value.trim();
  const newPass = inpNewPass.value.trim();
  const confirmNewPass = inpConfirmNewPass.value.trim();

  if (!oldPass || !newPass || !confirmNewPass) {
    toastr.error("Debes rellenar todos los campos de contraseña.");
    return;
  }
  if (newPass !== confirmNewPass) {
    toastr.error("Las nuevas contraseñas no coinciden");
    return;
  }

  if (newPass.length < 8) {
    toastr.error("La contraseña debe tener al menos 8 caracteres");
    return;
  }

  if (oldPass === newPass) {
    toastr.error("La nueva contraseña no puede ser igual a la actual.");
    return;
  }


  try {

    const userId = currentUser.id;
    const userRole = currentUser.role;

    try {
      await apiService.changePassword(userRole, {
        oldPassword: oldPass,
        newPassword: newPass
      });
    } catch (err) {
      if (err.message === "Incorrect old password" || err.message?.includes("old password")) {
        toastr.error("La contraseña actual es incorrecta.");
        return;
      }
      if (err.message === "Sesión expirada") {
        window.sessionExpiredPopup(); // en caso real
        return;
      }

      toastr.error(err.message || "Error al actualizar la contraseña.");
      return;
    }


    toastr.success("Contraseña actualizada con éxito. Redirigiendo...");
    
    let redirectUrl;
    if (userRole === 'student') {
      redirectUrl = `/dashboard.html?type=student&studentId=${userId}`;
    } else if (userRole === 'teacher') {
      redirectUrl = `/dashboard.html?type=teacher&teacherId=${userId}`;
    } else {
      redirectUrl = '/login.html';
    }

    setTimeout(() => {
      window.location.href = redirectUrl;
    }, 1500); // 1.5 segundos para que el mensaje sea visible

    inpOldPass.value = "";
    inpNewPass.value = "";
    inpConfirmNewPass.value = "";

  } catch (e) {
    console.error("Error al guardar contraseña:", e);
    // Si el backend devuelve un error específico (ej. contraseña antigua incorrecta)
    // el apiService ya lo habrá extraído del JSON y lo mostrará.
    toastr.error(e.message || "Error al actualizar la contraseña.");
  }
});
