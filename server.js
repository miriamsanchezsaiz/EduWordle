const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());

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

app.listen(3000, () => {
    console.log('Servidor ejecutándose en http://localhost:3000');
});
