// src/tests/api/groupRanking.test.js 

const request = require('supertest');
const app = require('../../../app'); // Asume que tu app.js exporta la aplicación Express
const { sequelize, User, Group, Wordle, StudentGroup, WordleGroup, GameResult } = require('../../api/models');
const bcrypt = require('bcrypt');
const { isStrongPassword } = require('../../utils/passwordUtils'); // <--- AÑADE ESTA LÍNEA


// Variables para usuarios y tokens de prueba
let teacherUser, student1, student2;
let teacherAuthToken, student1AuthToken;
let testGroup, testWordle1, testWordle2;

const teacherCredentials = {
    email: 'ranking_teacher@example.com',
    name: 'Ranking Teacher',
    password: 'Password123!',
    role: 'teacher'
};

const student1Credentials = {
    email: 'ranking_student1@example.com',
    name: 'Ranking Student 1',
    password: 'Password123!',
    role: 'student'
};

const student2Credentials = {
    email: 'ranking_student2@example.com',
    name: 'Ranking Student 2',
    password: 'Password123!',
    role: 'student'
};

describe('Group Ranking Endpoints (Teacher Functionality)', () => {

    beforeAll(async () => {
        
        // Limpiar y sincronizar la base de datos de test
        await sequelize.sync({ force: true });

        // Crear usuarios de prueba
        teacherUser = await User.create(teacherCredentials);
        student1 = await User.create(student1Credentials);
        student2 = await User.create(student2Credentials);

        // Obtener tokens de autenticación
        const teacherLoginRes = await request(app).post('/api/auth/login').send(teacherCredentials);
        teacherAuthToken = teacherLoginRes.body.token;

        const student1LoginRes = await request(app).post('/api/auth/login').send(student1Credentials);
        student1AuthToken = student1LoginRes.body.token;
    });

    beforeEach(async () => {
        // Limpiar datos entre tests, pero mantener usuarios base
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
        await GameResult.destroy({ truncate: true, cascade: true });
        await StudentGroup.destroy({ truncate: true, cascade: true });
        await WordleGroup.destroy({ truncate: true, cascade: true });
        await Wordle.destroy({ truncate: true, cascade: true });
        await Group.destroy({ truncate: true, cascade: true });
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

        // Recrear grupo y wordles para cada test
        testGroup = await Group.create({
            name: 'Test Ranking Group',
            initDate: '2024-01-01',
            endDate: '2024-12-31',
            userId: teacherUser.id 
        });

        testWordle1 = await Wordle.create({
            name: 'Easy Wordle',
            word: 'APPLE',
            userId: teacherUser.id 
        });

        testWordle2 = await Wordle.create({
            name: 'Hard Wordle',
            word: 'ORANGE',
            userId: teacherUser.id 
        });

        // Asociar estudiantes al grupo
        await StudentGroup.create({ userId: student1.id, groupId: testGroup.id });
        await StudentGroup.create({ userId: student2.id, groupId: testGroup.id });

        // Asociar wordles al grupo (hacerlos accesibles para el grupo)
        await WordleGroup.create({ wordleId: testWordle1.id, groupId: testGroup.id });
        await WordleGroup.create({ wordleId: testWordle2.id, groupId: testGroup.id });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    it('should return 200 and the student ranking for a given group', async () => {
        // Crear resultados de juego para simular puntuaciones
        // Estudiante 1: 100 en Wordle 1, 50 en Wordle 2 (Total 150)
        await GameResult.create({ userId: student1.id, wordleId: testWordle1.id, score: 100 });
        await GameResult.create({ userId: student1.id, wordleId: testWordle2.id, score: 50 });

        // Estudiante 2: 70 en Wordle 1, 90 en Wordle 2 (Total 160)
        await GameResult.create({ userId: student2.id, wordleId: testWordle1.id, score: 70 });
        await GameResult.create({ userId: student2.id, wordleId: testWordle2.id, score: 90 });

        const res = await request(app)
            .get(`/api/teacher/groups/${testGroup.id}/ranking`)
            .set('Authorization', `Bearer ${teacherAuthToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBe(2);

        // Verificar el orden del ranking
        expect(res.body[0].studentName).toBe(student2.name); // Student 2 (160 points)
        expect(res.body[0].totalScore).toBe('160'); // Sequelize SUM devuelve string

        expect(res.body[1].studentName).toBe(student1.name); // Student 1 (150 points)
        expect(res.body[1].totalScore).toBe('150');
    });

    it('should return an empty array if the group has no students or no accessible wordles', async () => {
        // Crear un grupo sin estudiantes ni wordles
        const emptyGroup = await Group.create({
            name: 'Empty Group',
            initDate: '2024-01-01',
            endDate: '2024-12-31',
            userId: teacherUser.id
        });

        const res = await request(app)
            .get(`/api/teacher/groups/${emptyGroup.id}/ranking`)
            .set('Authorization', `Bearer ${teacherAuthToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual([]);
    });

    it('should return 404 if the group does not exist or does not belong to the teacher', async () => {
        // Intentar acceder a un grupo que no existe
        const resNonExistent = await request(app)
            .get('/api/teacher/groups/99999/ranking')
            .set('Authorization', `Bearer ${teacherAuthToken}`);
        expect(resNonExistent.statusCode).toBe(404);
        expect(resNonExistent.body).toHaveProperty('message', 'Group not found or access denied');

        // Crear un grupo de otro profesor (si tu sistema permite esto en pruebas, si no, puedes omitirlo)
        const otherTeacher = await User.create({
            email: 'other_teacher@example.com', name: 'Other Teacher', password: 'Password123!', role: 'teacher'
        });
        const otherTeacherGroup = await Group.create({
            name: 'Other Teacher Group', initDate: '2024-01-01', endDate: '2024-12-31', userId: otherTeacher.id
        });

        // Intentar acceder a un grupo que no es tuyo
        const resOtherTeacher = await request(app)
            .get(`/api/teacher/groups/${otherTeacherGroup.id}/ranking`)
            .set('Authorization', `Bearer ${teacherAuthToken}`);
        expect(resOtherTeacher.statusCode).toBe(404);
        expect(resOtherTeacher.body).toHaveProperty('message', 'Group not found or access denied');
    });

    it('should return 401 if not authenticated', async () => {
        const res = await request(app)
            .get(`/api/teacher/groups/${testGroup.id}/ranking`); // Sin token de autenticación
        expect(res.statusCode).toBe(401);
    });

    it('should return 403 if authenticated as a student', async () => {
        const res = await request(app)
            .get(`/api/teacher/groups/${testGroup.id}/ranking`)
            .set('Authorization', `Bearer ${student1AuthToken}`); // Autenticado como estudiante
        expect(res.statusCode).toBe(403);
    });
});