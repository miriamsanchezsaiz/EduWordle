// assets/js/clasificaciones.js

// Verificar sesión
const role      = sessionStorage.getItem('role');
const teacherId = sessionStorage.getItem('teacherId');
if (role !== 'profesor' || !teacherId) {
  window.location.replace('login.html');
}

const cont = document.getElementById('contenedorClasificaciones');
document.getElementById('btnPorGrupo').addEventListener('click', () => loadPorGrupo());
document.getElementById('btnPorWordle').addEventListener('click', () => loadPorWordle());

async function loadPorGrupo() {
  cont.innerHTML = '<h2>Por Grupo</h2>';
  try {
    const res = await fetch(`/teachers/${teacherId}/group-scores`);
    if (!res.ok) throw new Error(res.statusText);
    const grupos = await res.json();
    grupos.forEach(grp => {
      const tbl = document.createElement('table');
      tbl.innerHTML = `
        <caption>Grupo: ${grp.groupName}</caption>
        <thead><tr><th>Alumno</th><th>Total Puntos</th></tr></thead>
        <tbody>
          ${grp.students.map(s =>
            `<tr><td>${s.studentName}</td><td>${s.totalScore}</td></tr>`
          ).join('')}
        </tbody>`;
      cont.appendChild(tbl);
    });
  } catch (err) {
    cont.innerHTML += `<p class="error">Error: ${err.message}</p>`;
  }
}

async function loadPorWordle() {
  cont.innerHTML = '<h2>Por Wordle</h2>';
  try {
    const res = await fetch(`/teachers/${teacherId}/wordle-scores`);
    if (!res.ok) throw new Error(res.statusText);
    const wordles = await res.json();
    wordles.forEach(wl => {
      const tbl = document.createElement('table');
      tbl.innerHTML = `
        <caption>Wordle: ${wl.wordleName}</caption>
        <thead><tr><th>Alumno</th><th>Mejor Puntuación</th></tr></thead>
        <tbody>
          ${wl.students.map(s =>
            `<tr><td>${s.studentName}</td><td>${s.bestScore}</td></tr>`
          ).join('')}
        </tbody>`;
      cont.appendChild(tbl);
    });
  } catch (err) {
    cont.innerHTML += `<p class="error">Error: ${err.message}</p>`;
  }
}
