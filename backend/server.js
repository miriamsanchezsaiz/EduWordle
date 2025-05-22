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
  const { email, password } = req.body;
  db.query(
    'SELECT id FROM profesores WHERE email=? AND password=?',
    [email, password],
    (err, profs) => {
     if (err) return res.status(500).json({ error: 'Error en el servidor' });
      if (profs.length > 0) {
        const prof = profs[0];
        const forceChange = password.length < 8;
        return res.json({
          role:       'profesor',
          forceChange,
          redirect:   forceChange
            ? `/config.html?type=teacher&teacherId=${prof.id}&forceChange=1`
            : `/dashboard.html?type=teacher&teacherId=${prof.id}`
        });
      }
      db.query(
        'SELECT id FROM alumnos WHERE email=? AND password=?',
        [email, password],
        (err, studs) => {
          if (err) return res.status(500).json({ error: 'Error en el servidor' });
          if (studs.length > 0) {
            const stu = studs[0];
            const forceChange = password.length < 8;
            return res.json({
              role:       'alumno',
              forceChange,
              redirect:   forceChange
                ? `/config.html?type=student&studentId=${stu.id}&forceChange=1`
                : `/dashboard.html?type=student&studentId=${stu.id}`
           });
          }
          return res.status(401).json({ error: 'Credenciales incorrectas' });
        }
      );
    }
  );
});



app.get('/wordles', (req, res) => {
  const { teacherId, studentId } = req.query;

  if (teacherId) {
    return db.query(
      'SELECT * FROM wordles WHERE teacher_id = ?',
      [teacherId],
      (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al obtener wordles del profesor' });
        res.json(results);
      }
    );
  }

  if (studentId) {
    const sql = `
      SELECT DISTINCT w.*
        FROM wordles w
        JOIN wordle_groups wg   ON w.id = wg.wordle_id
        JOIN student_groups sg  ON wg.group_id = sg.group_id
       WHERE sg.student_id = ?
    `;
    return db.query(sql, [studentId], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al obtener wordles para el alumno' });
      }
      res.json(results);
    });
  }

  res.status(400).json({ error: 'Se requiere teacherId o studentId' });
});


app.get('/grupos', (req, res) => {
  const { studentId, teacherId } = req.query;

  if (studentId) {
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

  } else if (teacherId) {
    db.query(
      'SELECT * FROM grupos WHERE teacher_id = ?',
      [teacherId],
      (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al obtener los grupos del profesor' });
        return res.json(results);
      }
    );

  } else {
    db.query('SELECT * FROM grupos', (err, results) => {
      if (err) return res.status(500).json({ error: 'Error al obtener los grupos' });
      return res.json(results);
    });
  }
});

  

app.get('/grupos/:id', (req, res) => {
    const groupId = req.params.id;
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
  db.query(
    'UPDATE grupos SET nombre = ?, initDate = ?, endDate = ? WHERE id = ?',
    [nombre, initDate, endDate, groupId],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al actualizar el grupo' });
      }
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
                syncWordles();
              }
            );
          } else {
            syncWordles();
          }
        }
      );

      function syncWordles() {
        db.query(
          'DELETE FROM wordle_groups WHERE group_id = ?',
          [groupId],
          (err) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ error: 'Error al limpiar asociaciones wordle' });
            }
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
  const { email, nombre } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Falta el email' });
  }
  const nombreAlumno = nombre && nombre.trim()
    ? nombre.trim()
    : email.split('@')[0];

  db.query(
    'SELECT * FROM alumnos WHERE email = ?',
    [email],
    (err, results) => {
      if (err) {
        console.error('Error al buscar alumno:', err);
        return res.status(500).json({ error: 'Error en el servidor' });
      }
      if (results.length > 0) {
        return res.json(results[0]);
      }
      const nuevoAlumno = new Student(email); 
      db.query(
        'INSERT INTO alumnos (email, nombre, password) VALUES (?, ?, ?)',
        [email, nombreAlumno, nuevoAlumno.password],
        (err, result) => {
          if (err) {
            console.error('Error al crear alumno:', err);
            return res.status(500).json({ error: 'Error al crear el alumno' });
          }
          res.json({
            id:       result.insertId,
            email:    email,
            nombre:   nombreAlumno,
            password: nuevoAlumno.password
          });
        }
      );
    }
  );
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
    db.query(
      `SELECT id, nombre, teacher_id, difficulty
         FROM wordles
        WHERE id = ?`,
      [wordleId],
      (err, results) => {
        if (err || results.length === 0) {
          return res.status(404).json({ error: 'Wordle no encontrado' });
        }
        const wordle = results[0];
  
        db.query(
          `SELECT id, word AS tittle, hint
             FROM words
            WHERE wordle_id = ?`,
          [wordleId],
          (err, wordResults) => {
            if (err) return res.status(500).json({ error: 'Error al cargar palabras' });
  
            db.query(
              `SELECT id, question AS statement, options, correctAnswer, type
                 FROM questions
                WHERE wordle_id = ?`,
              [wordleId],
              (err, questionResults) => {
                if (err) return res.status(500).json({ error: 'Error al cargar preguntas' });

                db.query(
                  `SELECT g.id, g.nombre
                     FROM grupos g
                     JOIN wordle_groups wg ON g.id = wg.group_id
                    WHERE wg.wordle_id = ?`,
                  [wordleId],
                  (err, groupResults) => {
                    if (err) return res.status(500).json({ error: 'Error al cargar grupos' });
                    return res.json({
                      id:         wordle.id,
                      nombre:     wordle.nombre,
                      difficulty: wordle.difficulty,
                      words:      wordResults,
                      questions:  questionResults,
                      groups:     groupResults
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
    const wordleId    = req.params.id;
    const { nombre, difficulty } = req.body;
  
    if (!nombre || !['low','high'].includes(difficulty)) {
      return res.status(400).json({ error: 'Falta nombre o difficulty inválida' });
    }
  
    db.query(
      'UPDATE wordles SET nombre = ?, difficulty = ? WHERE id = ?',
      [nombre, difficulty, wordleId],
      (err) => {
        if (err) {
          console.error('Error actualizando wordle:', err);
          return res.status(500).json({ error: 'Error al actualizar wordle' });
        }
        res.json({ success: true });
      }
    );
  });
  
  
app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

app.post('/words', (req, res) => {
  const { word, hint, wordleId } = req.body;
  if (!word || !wordleId) {
    return res.status(400).json({ error: 'Faltan datos: word y wordleId son obligatorios' });
  }
  db.query(
    'INSERT INTO words (word, hint, wordle_id) VALUES (?, ?, ?)',
    [word, hint || null, wordleId],
    (err, result) => {
      if (err) {
        console.error('Error al crear palabra:', err);
        return res.status(500).json({ error: 'Error en el servidor al crear la palabra' });
      }
      res.json({ id: result.insertId, tittle: word, hint });
    }
  );
});

app.post('/questions', (req, res) => {
  const { statement, options, correctAnswers, type, wordleId } = req.body;
  if (!statement || !Array.isArray(options) || !correctAnswers || !wordleId) {
    return res.status(400).json({ error: 'Datos incompletos para crear pregunta' });
  }
  const optsJson = JSON.stringify(options);
  const corrJson = JSON.stringify(correctAnswers);
  db.query(
    'INSERT INTO questions (question, options, correctAnswer, type, wordle_id) VALUES (?, ?, ?, ?, ?)',
    [statement, optsJson, corrJson, type, wordleId],
    (err, result) => {
      if (err) {
        console.error('Error al crear pregunta:', err);
        return res.status(500).json({ error: 'Error en el servidor al crear la pregunta' });
      }
      res.json({
        id: result.insertId,
        statement,
        options,
        correctAnswers,
        type
      });
    }
  );
});

app.delete('/words/:id', (req, res) => {
  const wordId = req.params.id;
  db.query('DELETE FROM words WHERE id = ?', [wordId], err => {
    if (err) {
      console.error('Error al eliminar la palabra:', err);
      return res.status(500).json({ error: 'Error al eliminar la palabra' });
    }
    res.json({ success: true });
  });
});

app.delete('/questions/:id', (req, res) => {
  const qId = req.params.id;
  db.query('DELETE FROM questions WHERE id = ?', [qId], err => {
    if (err) {
      console.error('Error al eliminar la pregunta:', err);
      return res.status(500).json({ error: 'Error al eliminar la pregunta' });
    }
    res.json({ success: true });
  });
});

app.post('/wordle_groups', (req, res) => {
  const { wordleId, groupId } = req.body;
  if (!wordleId || !groupId) {
    return res.status(400).json({ error: 'Faltan datos: wordleId y groupId son obligatorios' });
  }
  db.query(
    'INSERT INTO wordle_groups (wordle_id, group_id) VALUES (?, ?)',
    [wordleId, groupId],
    (err) => {
      if (err) {
        console.error('Error al asociar grupo a wordle:', err);
        return res.status(500).json({ error: 'Error en el servidor al asociar grupo a wordle' });
      }
      res.json({ success: true });
    }
  );
});

app.post('/grupos', (req, res) => {
  const { nombre, initDate, endDate, teacherId } = req.body;
  if (!nombre || !initDate || !teacherId) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }
  db.query(
    'INSERT INTO grupos (nombre, initDate, endDate, teacher_id) VALUES (?, ?, ?, ?)',
    [nombre, initDate, endDate || null, teacherId],
    (err, result) => {
      if (err) {
        console.error('Error al crear grupo:', err);
        return res.status(500).json({ error: 'Error en el servidor' });
      }
      res.json({ id: result.insertId });
    }
  );
});

app.post('/wordles', (req, res) => {
  const { nombre, teacherId, difficulty } = req.body;
  if (!nombre || !teacherId || !['low','high'].includes(difficulty)) {
    return res.status(400).json({ error: 'Faltan datos o difficulty inválida' });
  }
  db.query(
    'INSERT INTO wordles (nombre, teacher_id, difficulty) VALUES (?,?,?)',
    [nombre, teacherId, difficulty],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Error creando wordle' });
      res.json({ id: result.insertId, difficulty });
    }
  );
});


app.get('/wordles/:id/words', (req, res) => {
  const wordleId = req.params.id;
  db.query(
    'SELECT word AS word, hint AS hint FROM words WHERE wordle_id = ?',
    [wordleId],
    (err, results) => {
      if (err) {
        console.error('Error al obtener palabras para wordle', wordleId, err);
        return res.status(500).json({ error: 'Error al obtener palabras' });
      }
      res.json(results);
    }
  );
});

app.get('/wordles/:id/questions', (req, res) => {
  const wordleId = req.params.id;
  db.query(
    'SELECT question AS question, options AS options, correctAnswer AS correctAnswer, type AS type FROM questions WHERE wordle_id = ?',
    [wordleId],
    (err, results) => {
      if (err) {
        console.error('Error al obtener preguntas para wordle', wordleId, err);
        return res.status(500).json({ error: 'Error al obtener preguntas' });
      }
      res.json(results);
    }
  );
});


app.put('/profesores/:id/password', (req, res) => {
  const profId = req.params.id;
  const { password } = req.body;
  if (password.length < 8) {   return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });}
  if (!password) return res.status(400).json({ error: 'Falta nueva contraseña' });
  db.query(
    'UPDATE profesores SET password = ? WHERE id = ?',
    [password, profId],
    (err) => {
      if (err) {
        console.error('Error actualizando clave profesor:', err);
        return res.status(500).json({ error: 'Error en servidor' });
      }
      res.json({ success: true });
    }
  );
});

// Cambiar contraseña de alumno
app.put('/alumnos/:id/password', (req, res) => {
  const alumId = req.params.id;
  const { password } = req.body;
  if (password.length < 8) {   return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });}
  if (!password) return res.status(400).json({ error: 'Falta nueva contraseña' });
  db.query(
    'UPDATE alumnos SET password = ? WHERE id = ?',
    [password, alumId],
    (err) => {
      if (err) {
        console.error('Error actualizando clave alumno:', err);
        return res.status(500).json({ error: 'Error en servidor' });
      }
      res.json({ success: true });
    }
  );
});

app.post('/wordles/:id/words', (req, res) => {
  const wordleId = req.params.id;
  const { word, hint } = req.body;
  if (!word) return res.status(400).json({ error: 'Falta la palabra' });
  db.query(
    'INSERT INTO words (word, hint, wordle_id) VALUES (?,?,?)',
    [word, hint || null, wordleId],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Error al crear palabra' });
      res.json({ id: result.insertId, tittle: word, hint });
    }
  );
});

app.post('/wordles/:id/questions', (req, res) => {
  const wordleId    = req.params.id;
  const { statement, options, correctAnswer, type } = req.body;
  if (!statement || !Array.isArray(options) || !Array.isArray(correctAnswer) || !type) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }
  db.query(
    'INSERT INTO questions (question, options, correctAnswer, type, wordle_id) VALUES (?,?,?,?,?)',
    [statement, JSON.stringify(options), JSON.stringify(correctAnswer), type, wordleId],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Error al crear pregunta' });
      res.json({
        id: result.insertId,
        statement,
        options,
        correctAnswer,
        type
      });
    }
  );
});

app.post('/scores', (req, res) => {
  const { studentId, wordleId, score } = req.body;
  if (!studentId || !wordleId || typeof score !== 'number') {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  db.query(
    'SELECT score FROM student_wordle_scores WHERE student_id = ? AND wordle_id = ?',
    [studentId, wordleId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error en SELECT' });

      if (rows.length === 0) {
        db.query(
          'INSERT INTO student_wordle_scores (student_id, wordle_id, score) VALUES (?, ?, ?)',
          [studentId, wordleId, score],
          err2 => {
            if (err2) return res.status(500).json({ error: 'Error en INSERT' });
            return res.json({ success: true, action: 'inserted', score });
          }
        );
      } else {
        const best = rows[0].score;
        if (score > best) {
          db.query(
            'UPDATE student_wordle_scores SET score = ? WHERE student_id = ? AND wordle_id = ?',
            [score, studentId, wordleId],
            err3 => {
              if (err3) return res.status(500).json({ error: 'Error en UPDATE' });
              return res.json({ success: true, action: 'updated', score });
            }
          );
        } else {
          return res.json({ success: true, action: 'skipped', best });
        }
      }
    }
  );
});

// 1A) Resumen por grupo: suma de los mejores scores del alumno en cada wordle de ese grupo
app.get('/teachers/:teacherId/group-scores', (req, res) => {
  const teacherId = req.params.teacherId;
  const sql = `
    SELECT 
      g.id           AS groupId,
      g.nombre       AS groupName,
      a.id           AS studentId,
      a.nombre       AS studentName,
      COALESCE(SUM(sws.score), 0) AS totalScore
    FROM grupos g
    JOIN wordle_groups wg
      ON wg.group_id = g.id
    JOIN wordles w
      ON w.id = wg.wordle_id
    JOIN student_groups sg
      ON sg.group_id = g.id
    JOIN alumnos a
      ON a.id = sg.student_id
    LEFT JOIN student_wordle_scores sws
      ON sws.wordle_id  = w.id
     AND sws.student_id = a.id
    WHERE g.teacher_id = ?
    GROUP BY g.id, a.id
    ORDER BY g.id, totalScore DESC;
  `;
  db.query(sql, [teacherId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al obtener clasificaciones por grupo' });
    // Agrupar por grupoId en JSON
    const result = rows.reduce((acc, r) => {
      let grp = acc.find(g => g.groupId === r.groupId);
      if (!grp) {
        grp = { groupId: r.groupId, groupName: r.groupName, students: [] };
        acc.push(grp);
      }
      grp.students.push({
        studentId:   r.studentId,
        studentName: r.studentName,
        totalScore:  r.totalScore
      });
      return acc;
    }, []);
    res.json(result);
  });
});

// 1B) Resumen por wordle: mejor score por alumno en cada wordle
app.get('/teachers/:teacherId/wordle-scores', (req, res) => {
  const teacherId = req.params.teacherId;
  const sql = `
    SELECT 
      w.id           AS wordleId,
      w.nombre       AS wordleName,
      a.id           AS studentId,
      a.nombre       AS studentName,
      sws.score      AS bestScore
    FROM wordles w
    JOIN student_wordle_scores sws ON sws.wordle_id = w.id
    JOIN alumnos a                ON a.id = sws.student_id
    WHERE w.teacher_id = ?
    ORDER BY w.id, bestScore DESC;
  `;
  db.query(sql, [teacherId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al obtener clasificaciones por wordle' });
    const result = rows.reduce((acc, r) => {
      let wl = acc.find(x => x.wordleId === r.wordleId);
      if (!wl) {
        wl = { wordleId: r.wordleId, wordleName: r.wordleName, students: [] };
        acc.push(wl);
      }
      wl.students.push({
        studentId:   r.studentId,
        studentName: r.studentName,
        bestScore:   r.bestScore
      });
      return acc;
    }, []);
    res.json(result);
  });
});


app.listen(3000, () => {
    console.log('Servidor ejecutándose en http://localhost:3000');
});
