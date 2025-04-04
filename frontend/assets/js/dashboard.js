document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    
    // http://127.0.0.1:5500/frontend/dashboard.html?type=teacher
    // http://127.0.0.1:5500/frontend/dashboard.html?type=student
    
    let pageTitle = "";
    
    if (type === "teacher") {
        pageTitle = "Dashboard Profesor";
        const mainElement = document.querySelector("main");

        //TODO: en los botones, pasar el teacherId
        mainElement.innerHTML = `
            <section class="create-wordle">
                <button onclick="window.location.href='wordleEditor.html?mode=create'">Crear Wordle</button>
            </section>
            <section class="menu-options">
                <div class="option" onclick="window.location.href='list.html?type=group&teacherId=111'">Mis Grupos</div>
                <div class="option" onclick="window.location.href='list.html?type=wordle&teacherId=111'">Mis Wordles</div>
                <div class="option">Clasificaciones</div>
            </section>
        `;

        document.getElementById("pageTitle").textContent = pageTitle;
    
    }   

});

document.getElementById("logout").addEventListener("click", logout);

function logout() {
    //TODO: rellenar esta función
    console.log("Sesión cerrada");
    window.location.href = "login.html"; 
}