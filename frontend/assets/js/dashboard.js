document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    const teacherId = params.get("teacherId");
    const studentId = params.get("studentId");
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
                <div class="option">Clasificaciones</div>
            </section>
        `;
    } else if (type === "student") {
        pageTitle = "Dashboard Alumno";
        // Aquí agregamos dos opciones: una para los grupos a los que pertenece y otra para sus wordles
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
            localStorage.clear();
            window.location.href = "login.html";
        });
    }
});
