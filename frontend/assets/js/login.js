// Obtener elementos del DOM
const email = document.getElementById('email');
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('error-message');

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


loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('email').value;
  const password = passwordInput.value;

  try {
      const response = await fetch('http://localhost:3000/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
          throw new Error('Credenciales incorrectas');
      }

      const data = await response.json();
      window.location.href = data.redirect; // Redirigir según el rol
  } catch (error) {
      errorMessage.innerText = error.message;
      errorMessage.style.color = 'red';
  }
});




/********************************************** */
/****************** VISUALS ******************* */
/********************************************** */

document.addEventListener("DOMContentLoaded", function () {
  const NUM_CIRCULOS = 40; // Número de círculos
  const circlesContainer = document.body;
  const existingCircles = [];

  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const maxDistance = Math.sqrt(centerX ** 2 + centerY ** 2); // Distancia máxima desde el centro

  function getRandomPosition(size) {
      let overlap = true;
      let x, y;

      while (overlap) {
          x = Math.random() * (window.innerWidth - size);
          y = Math.random() * (window.innerHeight - size);

          // Verificar si se superpone con círculos existentes
          overlap = existingCircles.some(circle => {
              const dx = circle.x - x;
              const dy = circle.y - y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              return distance < (circle.size / 2 + size / 2);
          });
      }

      existingCircles.push({ x, y, size });
      return { x, y };
  }

  function createCircle() {
      const size = Math.random() * (150 - 30) + 30; // Tamaño entre 30px y 120px
      const { x, y } = getRandomPosition(size);

      // Calcular la distancia al centro
      const dx = x + size / 2 - centerX;
      const dy = y + size / 2 - centerY;
      const distance = Math.sqrt(dx ** 2 + dy ** 2);

      // Ajustar opacidad en función de la distancia (más lejos = más transparente)
      const opacity = Math.max(0.2, 1.3 - distance / maxDistance); // Rango entre 0.2 y 1

      const circle = document.createElement("div");
      circle.classList.add("circle");
      circle.style.width = `${size}px`;
      circle.style.height = `${size}px`;
      circle.style.left = `${x}px`;
      circle.style.top = `${y}px`;
      circle.style.opacity = opacity;

      circlesContainer.appendChild(circle);
  }

  for (let i = 0; i < NUM_CIRCULOS; i++) {
      createCircle();
  }
});

document.addEventListener("DOMContentLoaded", function () {
  //limpiar inputs
  email.value = "";
  passwordInput.value = "";
});