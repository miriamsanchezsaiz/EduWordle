const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/backend/utils', express.static(path.join(__dirname, 'utils')));



const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root', 
    database: 'eduwordle'
});

db.connect(err => {
    if (err) {
        console.error('Error de conexión a MySQL:', err);
        return;
    }
    console.log('Conectado a MySQL');
});

app.get('/words', (req, res) => {
    db.query('SELECT word, hint FROM words', (err, results) => {
        if (err) {
            res.status(500).send(err);
            return;
        }
        res.json(results);
    });
});

app.get('/questions', (req, res) => {
    db.query('SELECT question, options, correctAnswer, type FROM questions', (err, results) => {
        if (err) {
            res.status(500).send(err);
            return;
        }

        res.json(results);
    });
});

app.post('/login', (req, res) => {
    console.log('Solicitud recibida en /login');

    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Faltan datos' });
    }

// Autenticación de profesores
db.query('SELECT * FROM profesores WHERE email = ? AND password = ?', [email, password], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error en el servidor' });

    if (results.length > 0) {
        console.log('Profesor autenticado correctamente');
        return res.json({ role: 'profesor', redirect: `http://localhost:3000/dashboard.html?type=teacher&teacherId=${results[0].id}` });
    } else {
        // Autenticación de alumnos
        db.query('SELECT * FROM alumnos WHERE email = ? AND password = ?', [email, password], (err, results) => {
            if (err) return res.status(500).json({ error: 'Error en el servidor' });

            if (results.length > 0) {
                console.log('Alumno autenticado correctamente');
                return res.json({ role: 'alumno', redirect: `http://localhost:3000/dashboard.html?type=student&studentId=${results[0].id}` });
            } else {
                return res.status(401).json({ error: 'Credenciales incorrectas' });
            }
        });
    }
});

});


app.get('/wordles', (req, res) => {
    const teacherId = req.query.teacherId;
    const studentId = req.query.studentId;
    
    if (teacherId) {
        // Wordles asociados a un profesor
        db.query('SELECT * FROM wordles WHERE teacher_id = ?', [teacherId], (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Error al obtener los wordles del profesor' });
            }
            return res.json(results);
        });
    } else if (studentId) {
        // Wordles asociados a un alumno a través de los grupos a los que pertenece.
        const query = `
            SELECT w.* 
            FROM wordles w 
            INNER JOIN student_groups sg ON w.group_id = sg.group_id 
            WHERE sg.student_id = ?
        `;
        db.query(query, [studentId], (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Error al obtener los wordles para el alumno' });
            }
            return res.json(results);
        });
    } else {
        return res.status(400).json({ error: 'Se requiere teacherId o studentId' });
    }
});

app.get('/grupos', (req, res) => {
    const teacherId = req.query.teacherId;
    const studentId = req.query.studentId;
  
    if (teacherId) {
      db.query(
        'SELECT * FROM grupos WHERE teacher_id = ?',
        [teacherId],
        (err, results) => {
          if (err) return res.status(500).json({ error: 'Error al obtener los grupos del profesor' });
          return res.json(results);
        }
      );
    }
    else if (studentId) {
      db.query(
        `SELECT g.* 
           FROM grupos g
           JOIN student_groups sg ON g.id = sg.group_id
          WHERE sg.student_id = ?`,
        [studentId],
        (err, results) => {
          if (err) return res.status(500).json({ error: 'Error al obtener los grupos del alumno' });
          return res.json(results);
        }
      );
    }
    else {
      return res.status(400).json({ error: 'Se requiere teacherId o studentId' });
    }
  });
  

app.get('/grupos/:id', (req, res) => {
    const groupId = req.params.id;
    // Consultar datos del grupo
    db.query(`SELECT 
                id, 
                nombre, 
                DATE_FORMAT(initDate, '%Y-%m-%d') AS initDate, 
                DATE_FORMAT(endDate, '%Y-%m-%d') AS endDate 
                FROM grupos 
                WHERE id = ?`, [groupId], (err, groupResults) => {
        if (err || groupResults.length === 0) {
            return res.status(500).json({ error: 'Error al obtener el grupo' });
        }
        const group = groupResults[0];
        // Consultar alumnos del grupo
        db.query(
            `SELECT a.* 
             FROM alumnos a 
             INNER JOIN student_groups sg ON a.id = sg.student_id 
             WHERE sg.group_id = ?`,
            [groupId],
            (err, studentResults) => {
                if (err) {
                    return res.status(500).json({ error: 'Error al obtener los alumnos' });
                }
                // Consultar wordles asociados al grupo
                db.query(
                    `SELECT w.* 
                       FROM wordles w 
                       JOIN wordle_groups wg ON w.id = wg.wordle_id 
                      WHERE wg.group_id = ?`,
                    [groupId],
                    (err, wordleResults) => {
                      if (err) return res.status(500).json({ error: 'Error al obtener los wordles' });

                    return res.json({
                        id: group.id,
                        nombre: group.nombre,
                        initDate: group.initDate,
                        endDate: group.endDate,
                        students: studentResults,
                        wordles: wordleResults
                    });
                });
            }
        );
    });
});

app.put('/grupos/:id', (req, res) => {
  const groupId    = req.params.id;
  const { nombre, initDate, endDate, alumnos, wordles } = req.body;

  // 1) Actualizar datos básicos del grupo
  db.query(
    'UPDATE grupos SET nombre = ?, initDate = ?, endDate = ? WHERE id = ?',
    [nombre, initDate, endDate, groupId],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al actualizar el grupo' });
      }

      // 2) Gestionar asociaciones alumno ↔ grupo
      db.query(
        'DELETE FROM student_groups WHERE group_id = ?',
        [groupId],
        (err) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al limpiar asociaciones alumno' });
          }

          if (Array.isArray(alumnos) && alumnos.length) {
            const valsAlu = alumnos.map(studentId => [studentId, groupId]);
            db.query(
              'INSERT INTO student_groups (student_id, group_id) VALUES ?',
              [valsAlu],
              (err) => {
                if (err) {
                  console.error(err);
                  return res.status(500).json({ error: 'Error al insertar asociaciones alumno' });
                }
                // Tras actualizar alumnos, pasamos a wordles
                syncWordles();
              }
            );
          } else {
            // No hay alumnos: directamente sincronizamos wordles
            syncWordles();
          }
        }
      );

      // 3) Función interna para sincronizar wordles ↔ grupo
      function syncWordles() {
        // 3.1) Borrar relaciones previas
        db.query(
          'DELETE FROM wordle_groups WHERE group_id = ?',
          [groupId],
          (err) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ error: 'Error al limpiar asociaciones wordle' });
            }

            // 3.2) Insertar nuevas asociaciones
            if (Array.isArray(wordles) && wordles.length) {
              const valsWor = wordles.map(wordleId => [wordleId, groupId]);
              db.query(
                'INSERT INTO wordle_groups (wordle_id, group_id) VALUES ?',
                [valsWor],
                (err) => {
                  if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Error al insertar asociaciones wordle' });
                  }
                  return res.json({ success: true });
                }
              );
            } else {
              // No hay wordles: terminamos aquí
              return res.json({ success: true });
            }
          }
        );
      }
    }
  );
});

const Student = require('./utils/Student');

app.post('/alumnos', (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Falta email' });
    }
    
    const nombre = email.split("@")[0];
    db.query('SELECT * FROM alumnos WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.error('Error al buscar alumno:', err);
            return res.status(500).json({ error: 'Error en el servidor' });
        }
        if (results.length > 0) {
            const alumno = results[0];
            return res.json(alumno);
        } else {
            const nuevoAlumno = new Student(email);
            db.query(
                'INSERT INTO alumnos (email, nombre, password) VALUES (?, ?, ?)',
                [email, nombre, nuevoAlumno.password],
                (err, result) => {
                    if (err) {
                        console.error('Error al crear alumno:', err);
                        return res.status(500).json({ error: 'Error al crear el alumno' });
                    }
                    const insertId = result.insertId;
                    return res.json({ id: insertId, email: email, nombre: nombre, password: nuevoAlumno.password });
                }
            );
        }
    });
});

app.post('/student_groups', (req, res) => {
    const { studentId, groupId } = req.body;
    if (!studentId || !groupId) {
        return res.status(400).json({ error: "Faltan datos: studentId y groupId son obligatorios" });
    }
    db.query(
        "INSERT INTO student_groups (student_id, group_id) VALUES (?, ?)",
        [studentId, groupId],
        (err, result) => {
            if (err) {
                console.error("Error al insertar la relación:", err);
                return res.status(500).json({ error: "Error al insertar la relación del grupo" });
            }
            return res.json({ success: true });
        }
    );
});

app.post('/grupos', (req, res) => {
    const { nombre, initDate, endDate, teacherId } = req.body;
    db.query(
      'INSERT INTO grupos (nombre, initDate, endDate, teacher_id) VALUES (?, ?, ?, ?)',
      [nombre, initDate, endDate, teacherId],
      (err, result) => {
        if (err) return res.status(500).json({ error: 'Error al crear grupo' });
        res.json({ id: result.insertId });
      }
    );
  });

app.get('/wordles/:id', (req, res) => {
    const wordleId = req.params.id;
    // 1) Consultar datos básicos del wordle
    db.query(
      `SELECT id, nombre, teacher_id
         FROM wordles
        WHERE id = ?`,
      [wordleId],
      (err, results) => {
        if (err || results.length === 0) {
          return res.status(404).json({ error: 'Wordle no encontrado' });
        }
        const wordle = results[0];
  
        // 2) Obtener palabras asociadas
        db.query(
          `SELECT id, word AS tittle, hint
             FROM words
            WHERE wordle_id = ?`,
          [wordleId],
          (err, wordResults) => {
            if (err) return res.status(500).json({ error: 'Error al cargar palabras' });
  
            // 3) Obtener preguntas asociadas
            db.query(
              `SELECT id, question AS statement, options, correctAnswer, type
                 FROM questions
                WHERE wordle_id = ?`,
              [wordleId],
              (err, questionResults) => {
                if (err) return res.status(500).json({ error: 'Error al cargar preguntas' });
  
                // 4) Obtener grupos asociados (si usas wordle_groups N-M)
                db.query(
                  `SELECT g.id, g.nombre
                     FROM grupos g
                     JOIN wordle_groups wg ON g.id = wg.group_id
                    WHERE wg.wordle_id = ?`,
                  [wordleId],
                  (err, groupResults) => {
                    if (err) return res.status(500).json({ error: 'Error al cargar grupos' });
  
                    // 5) Devolver JSON completo
                    return res.json({
                      id:        wordle.id,
                      nombre:    wordle.nombre,
                      words:     wordResults,
                      questions: questionResults,
                      groups:    groupResults
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
  
  app.put('/wordles/:id', (req, res) => {
    const wordleId = req.params.id;
    const { nombre } = req.body;
    db.query(
      'UPDATE wordles SET nombre = ? WHERE id = ?',
      [nombre, wordleId],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Error actualizando wordle' });
        }
        return res.json({ success: true });
      }
    );
  });
  


app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

app.listen(3000, () => {
    console.log('Servidor ejecutándose en http://localhost:3000');
});
