// assets/js/classifications.js
import { apiService } from './apiService.js';

// Verificar sesión
const currentUserString = sessionStorage.getItem('currentUser');

let role = null;
let userId = null;

if (currentUserString) {
    try {
        const currentUser = JSON.parse(currentUserString);
        role = currentUser.role;
        userId = currentUser.id; // Para futuras referencias, si lo necesitas
    } catch (e) {
        console.error('Error al parsear currentUser de sessionStorage:', e);
        // Si hay un error, el rol y userId seguirán siendo null, lo que forzará la redirección.
    }
}


if (role !== 'teacher' || !sessionStorage.getItem('authToken')) {
  console.log('DEBUG: Redirigiendo a login.html. Razón: rol incorrecto o token ausente.');
  window.location.replace('login.html');
}

const cont = document.getElementById('contenedorClasificaciones');
document.getElementById('btnPorGrupo').addEventListener('click', () => loadPorGrupo());
document.getElementById('btnPorWordle').addEventListener('click', () => loadPorWordle());

async function loadPorGrupo() {
  cont.innerHTML = '<h2>Clasificaciones por Grupo</h2>';
  try {
    // 1. Obtener todos los grupos del profesor logueado
    const gruposDelProfesor = await apiService.fetchGroups('teacher');
    if (!gruposDelProfesor || gruposDelProfesor.length === 0) {
      cont.innerHTML += '<p>No hay grupos disponibles para mostrar clasificaciones.</p>';
      return;
    }

    // 2. Para cada grupo, obtener sus resultados de juego
    for (const grp of gruposDelProfesor) {
      try {
        const resultadosGrupo = await apiService.getGameResultsByGroupId(grp.id);

        if (resultadosGrupo && resultadosGrupo.length > 0) {
          const tbl = document.createElement('table');
          tbl.innerHTML = `
                        <caption>Grupo: ${grp.name}</caption>
                        <thead><tr><th>Alumno</th><th>Total Puntos</th></tr></thead>
                        <tbody>
                            ${resultadosGrupo.map(s =>
            `<tr><td>${s.player.name}</td><td>${s.score}</td></tr>` // Ajusta los nombres de las propiedades según la respuesta real del backend
          ).join('')}
                        </tbody>`;
          cont.appendChild(tbl);
        } 
      }
      catch (err) {
        console.error(`Error al obtener clasificaciones para el grupo ${grp.name}:`, err);
        cont.innerHTML += `<p class="error">Error al cargar clasificaciones para el grupo ${grp.name}: ${err.message}</p>`;
      }
    }
  } catch (err) {
    console.error('Error general al cargar grupos para clasificaciones:', err);
    cont.innerHTML += `<p class="error">Error general: ${err.message}</p>`;
  }
}

async function loadPorWordle() {
  cont.innerHTML = '<h2>Clasificaciones por Wordle</h2>';
  try {
    const wordlesDelProfesor = await apiService.fetchWordles('teacher');
    if (!wordlesDelProfesor || wordlesDelProfesor.length === 0) {
      cont.innerHTML += '<p>No hay Wordles disponibles para mostrar clasificaciones.</p>';
      return;
    }

    // Para cada Wordle, obtener sus resultados de juego
    for (const wl of wordlesDelProfesor) {
      try {
        // apiService.getGameResultsByWordleId(wl.id) también usa el token para autenticar.
        const resultadosWordle = await apiService.getGameResultsByWordleId(wl.id);

        if (resultadosWordle && resultadosWordle.length > 0) {
          const tbl = document.createElement('table');
          tbl.innerHTML = `
                        <caption>Wordle: ${wl.name}</caption>
                        <thead><tr><th>Alumno</th><th>Mejor Puntuación</th></tr></thead>
                        <tbody>
                            ${resultadosWordle.map(s =>
            `<tr><td>${s.player.name}</td><td>${s.score}</td></tr>`
          ).join('')}
                        </tbody>`;
          cont.appendChild(tbl);
        } 
      } catch (err) {
        console.error(`Error al obtener clasificaciones para el Wordle ${wl.name}:`, err);
        cont.innerHTML += `<p class="error">Error al cargar clasificaciones para el Wordle ${wl.name}: ${err.message}</p>`;
      }

       }
    } catch (err) {
        console.error('Error general al cargar Wordles para clasificaciones:', err);
        cont.innerHTML += `<p class="error">Error general: ${err.message}</p>`;
    }

  }
