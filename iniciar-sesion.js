// Obtener elementos del DOM
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');

// Evento para alternar la visibilidad de la contraseña
togglePassword.addEventListener('click', function() {
  const currentType = passwordInput.getAttribute('type');
  if (currentType === 'password') {
    passwordInput.setAttribute('type', 'text');
    // Cambiar el ícono a uno de ocultar (puedes poner cualquier otro símbolo si lo prefieres)
    togglePassword.textContent = '🙈';
  } else {
    passwordInput.setAttribute('type', 'password');
    // Cambiar el ícono a uno de mostrar
    togglePassword.textContent = '🐵';
  }
});