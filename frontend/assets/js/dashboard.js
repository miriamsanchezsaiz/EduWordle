const role      = sessionStorage.getItem('role');
const teacherId = sessionStorage.getItem('teacherId');
const studentId = sessionStorage.getItem('studentId');
if (!role || (!teacherId && !studentId)) {
  window.location.replace('login.html');
}

document.addEventListener("DOMContentLoaded", () => {
  const params    = new URLSearchParams(window.location.search);
  const type      = params.get("type");
  // Preferimos tomar teacherId / studentId de sessionStorage
  const teacherId = sessionStorage.getItem('teacherId');
  const studentId = sessionStorage.getItem('studentId');
  let pageTitle = "";
  const mainElement = document.querySelector("main");

  if (type === "teacher") {
    pageTitle = "Dashboard Profesor";
    mainElement.innerHTML = `
      <section class="create-wordle">
        <button onclick="window.location.href='wordleEditor.html?mode=create&teacherId=${teacherId}'">Crear Wordle</button>
      </section>
      <section class="menu-options">
        <div class="option" onclick="window.location.href='list.html?type=group&teacherId=${teacherId}'">Mis Grupos</div>
        <div class="option" onclick="window.location.href='list.html?type=wordle&teacherId=${teacherId}'">Mis Wordles</div>
     <div class="option" onclick="window.location.href='clasificaciones.html?type=teacher&teacherId=${teacherId}'">
    Clasificaciones
    </div>
      </section>
      <section id="clasificaciones" class="clasificaciones-section"></section>
    `;
  } else if (type === "student") {
    pageTitle = "Dashboard Alumno";
    mainElement.innerHTML = `
      <section class="menu-options">
        <div class="option" onclick="window.location.href='list.html?type=group&studentId=${studentId}'">Mis Grupos</div>
        <div class="option" onclick="window.location.href='list.html?type=wordle&studentId=${studentId}'">Mis Wordles</div>
      </section>
    `;
  } else {
    pageTitle = "Dashboard";
    mainElement.innerHTML = `<p>Tipo de usuario no especificado.</p>`;
  }

  document.getElementById("pageTitle").textContent = pageTitle;

  const logoutButton = document.getElementById("logout");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      sessionStorage.clear();
      window.location.replace("login.html");
    });
  }
});


