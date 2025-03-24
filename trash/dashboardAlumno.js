document.getElementById("logout").addEventListener("click", logout);

function logout() {
    console.log("Sesión cerrada");
    window.location.href = "login.html"; 
}


// document.addEventListener("DOMContentLoaded", async () => {
//     const wordlesList = document.getElementById("wordlesList");

//     // Obtener los wordles del alumno
//     const response = await fetch("/api/alumno/wordles");
//     const wordles = await response.json();

//     // Mostrar los wordles en la lista
//     wordles.forEach(wordle => {
//         const listItem = document.createElement("li");
//         listItem.textContent = wordle.nombre;
//         listItem.dataset.id = wordle.id;
//         listItem.addEventListener("click", () => iniciarPartida(wordle.id));
//         wordlesList.appendChild(listItem);
//     });

//     // Cerrar sesión
//     document.getElementById("logout").addEventListener("click", async () => {
//         await fetch("/api/logout", { method: "POST" });
//         window.location.href = "index.html";
//     });
// });

// // Función para iniciar o cargar la partida
// async function iniciarPartida(wordleId) {
//     const response = await fetch(`/api/alumno/partida/${wordleId}`);
//     const partida = await response.json();
    
//     if (partida.existe) {
//         window.location.href = `jugar.html?wordle=${wordleId}`;
//     } else {
//         await fetch(`/api/alumno/partida/${wordleId}`, { method: "POST" });
//         window.location.href = `jugar.html?wordle=${wordleId}`;
//     }
// }