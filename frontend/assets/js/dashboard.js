// frontend/assets/js/dashboard.js
const authToken = sessionStorage.getItem('authToken');
const currentUserString = sessionStorage.getItem('currentUser'); 


let role = null;
let userId = null;


if (authToken && currentUserString) {
  try {
    const currentUser = JSON.parse(currentUserString); 
    role = currentUser.role; 
    userId = currentUser.id; 
    console.log("Dashboard: User autenticated. Rol:", role, "ID:", userId);
  } catch (e) {
    console.error("Dashboard: Error parsing currentUser from sessionStorage:", e);
    sessionStorage.clear();
    window.location.replace('login.html');
  }
}

if (!authToken || !userId || !role) {
  console.warn("Dashboard: No authenticated user found. Redirecting to login.");
  window.location.replace('login.html');
}


document.addEventListener("DOMContentLoaded", () => {
  // const params = new URLSearchParams(window.location.search);
  // const type = params.get("type");

  let pageTitle = "";
  const mainElement = document.querySelector("main");

  if (role === "teacher") {
    pageTitle = "Dashboard Profesor";
    mainElement.innerHTML = `
      <section class="create-wordle">
        <button onclick="window.location.href='wordleEditor.html?mode=create&userId=${userId}'">Crear Wordle</button>
      </section>
      <section class="menu-options">
        <div class="option" onclick="window.location.href='list.html?type=group&userId=${userId}'">Mis Grupos</div>
        <div class="option" onclick="window.location.href='list.html?type=wordle&userId=${userId}'">Mis Wordles</div>
     <div class="option" onclick="window.location.href='clasificaciones.html?type=user&teacherId=${userId}'">
    Clasificaciones
    </div>
      </section>
      <section id="clasificaciones" class="clasificaciones-section"></section>
    `;
  } else if (role === "student") {
    pageTitle = "Dashboard Alumno";
    mainElement.innerHTML = `
      <section class="menu-options">
        <div class="option" onclick="window.location.href='list.html?type=group&userId=${userId}'">Mis Grupos</div>
        <div class="option" onclick="window.location.href='list.html?type=wordle&userId=${userId}'">Mis Wordles</div>
      </section>
    `;
  } else {
    pageTitle = "Dashboard";
    mainElement.innerHTML = `<p>Tipo de usuario no especificado.</p>`;
    console.error("Dashboard: Unknown user type:", type);
  }

  document.getElementById("pageTitle").textContent = pageTitle;

  const settingsButton = document.querySelector('.settings-icon');
  if (settingsButton) {
      const idParam = role === 'teacher' ? 'teacherId' : 'studentId';
      settingsButton.onclick = () => {
          window.location.href = `settings.html?type=${role}&${idParam}=${userId}`;
      };
  }

  const logoutButton = document.getElementById("logout");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      sessionStorage.clear();
      window.location.replace("login.html");
    });
  }
});


