// frontend/assets/js/login.js

import { apiService } from './apiService.js';
// Elementos del DOM
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('error-message');

// Toggle de visibilidad de la contraseña
togglePassword.addEventListener('click', () => {
  const tipo = passwordInput.type === 'password' ? 'text' : 'password';
  passwordInput.type = tipo;
  togglePassword.textContent = tipo === 'password' ? '🐵' : '🙈';
});

// Envío del formulario de login
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorMessage.textContent = '';

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  try {
    // Petición al servidor
    const data = await apiService.login(email, password);
    sessionStorage.setItem('authToken', data.token);
    sessionStorage.setItem('currentUser', JSON.stringify(data.user));

    // Guardar rol e ID en sessionStorage
    // sessionStorage.setItem('role', data.role);
    // const params = new URL(data.redirect, window.location.origin).searchParams;
    // let userId;
    // if (data.role === 'profesor') {
    //   userId = params.get('teacherId');
    //   sessionStorage.setItem('teacherId', userId);
    // } else {
    //   userId = params.get('studentId');
    //   sessionStorage.setItem('studentId', userId);
    // }

    // Decidir a dónde redirigir
    let targetURL;
    const userRole = data.user.role;
    const userId = data.user.id;

    const tipo = userRole;
    const idParam = tipo === 'teacher' ? 'teacherId' : 'studentId';

    if (data.requiresPasswordChange) {
      // Primer login: forzar cambio de contraseña
      targetURL = `settings.html?type=${tipo}&${idParam}=${userId}&forceChange=1`;
    } else {
      // Login normal: ir al dashboard
      targetURL = `dashboard.html?type=${tipo}&${idParam}=${userId}`;
    }

    // Redirigir sin dejar historial
    window.location.replace(targetURL);

  } catch (err) {
    console.error("Login fetch error:", err);
    errorMessage.innerText = err.message;
    errorMessage.style.color = 'red';
  }
});

// === Decorativo: círculos de fondo ===
document.addEventListener("DOMContentLoaded", function () {
  const NUM_CIRCULOS = 40;
  const container = document.body;
  const circles = [];
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const maxDist = Math.hypot(cx, cy);

  function randPos(size) {
    let x, y, overlap;
    let attempts = 0;
    const MAX_ATTEMPTS = 500;
    do {
      x = Math.random() * (window.innerWidth - size);
      y = Math.random() * (window.innerHeight - size);
      overlap = circles.some(c =>
        Math.hypot(c.x - x, c.y - y) < (c.size + size) / 2
      );
      attempts++;
      if (attempts > MAX_ATTEMPTS) {
        return null; // Fallback to center
      }
    } while (overlap);
    circles.push({ x, y, size });
    return { x, y };
  }

  function createCircle() {
    const size = 30 + Math.random() * 120;
    const pos = randPos(size);
    if(pos === null) {
      return; // Skip if no valid position found
    }
    const { x, y } = pos;
    const dist = Math.hypot(x + size / 2 - cx, y + size / 2 - cy);
    const opacity = Math.max(0.2, 1.3 - dist / maxDist);

    const circle = document.createElement("div");
    circle.classList.add("circle");
    Object.assign(circle.style, {
      width: `${size}px`,
      height: `${size}px`,
      left: `${x}px`,
      top: `${y}px`,
      opacity
    });
    container.appendChild(circle);
  }

  for (let i = 0; i < NUM_CIRCULOS; i++) createCircle();
});


// Limpiar inputs al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  emailInput.value = "";
  passwordInput.value = "";
});
