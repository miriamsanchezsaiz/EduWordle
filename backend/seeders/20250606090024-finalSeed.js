 'use strict';
 const { User, Group, StudentGroup, Wordle, Word, Question, WordleGroup, GameResult } = require('../src/api/models');
  const bcrypt = require('bcryptjs');
 
  const SALT_ROUNDS = 10;
 
  /**
   * Seeder inicial para la base de datos EduWordle, only para la presentación del TFG.
   * Incluye:
  * - 20 profesores genéricos y 2 profesores específicos (Elena y Miriam).
   * - 20 alumnos genéricos, distribuidos en grupos.
   * - Grupos, Wordles, Palabras, Preguntas y Resultados de Juego centrados en Fundamentos de Ingeniería del Software.
   * - Wordles con múltiples palabras jugables y un rango de preguntas.
   */
  module.exports = {
    async up(queryInterface, Sequelize) {
      console.log('--- Starting initial data seeding for TFG presentation ---');
      const now = new Date();

      const existingUsers = await User.count();
      if (existingUsers > 0) {
        console.log('Ya existen usuarios. Se omite el seeding.');
        return;
      }
 
    //--- 1. Crear Usuarios ---
      console.log('1. Creating users...');
 
    //Contraseñas comunes para la demo, diseñadas para cumplir validaciones (al menos 8 chars, Mayús, Minús, Número, Especial)
      const commonTeacherPassword = await bcrypt.hash("TeacherPass@2025!", SALT_ROUNDS);
      const commonStudentPassword = await bcrypt.hash("StudentPass@2025!", SALT_ROUNDS);
 
      //Contraseñas específicas para las cuentas de presentación
      const hashedPasswordElena = await bcrypt.hash("Elena@Upm2025!", SALT_ROUNDS);
      const hashedPasswordMiriam = await bcrypt.hash("Miriam@Upm2025!", SALT_ROUNDS);
 
      const userEntries = [
        //20 Profesores genéricos
        ...Array.from({ length: 20 }).map((_, i) => ({
          name: `Profesor ${i + 1}`,
          email: `profesor${i + 1}@gmail.com`,
          password: commonTeacherPassword,
          role: 'teacher',
          createdAt: now,
          updatedAt: now,
        })),
        //20 Alumnos genéricos
        ...Array.from({ length: 20 }).map((_, i) => ({
          name: `Alumno ${i + 1}`,
          email: `alumno${i + 1}@gmail.com`,
          password: commonStudentPassword,
          role: 'student',
          createdAt: now,
          updatedAt: now,
        })),
        //Cuentas específicas para la demo de Elena y Miriam
        { name: 'Elena', email: 'elena.cbelda@alumnos.upm.es', password: hashedPasswordElena, role: 'teacher', createdAt: now, updatedAt: now },
        { name: 'Miriam', email: 'miriam.sanchezs@alumnos.upm.es', password: hashedPasswordMiriam, role: 'teacher', createdAt: now, updatedAt: now },
      ];
 
      await queryInterface.bulkInsert('user', userEntries, {});
      console.log('Users inserted. Retrieving IDs...');
 
       //Recuperar instancias de usuario para obtener IDs
      const allUsers = await User.findAll();
      const profesor1 = allUsers.find(u => u.email === 'profesor1@gmail.com');
      const elena = allUsers.find(u => u.email === 'elena.cbelda@alumnos.upm.es');
      const miriam = allUsers.find(u => u.email === 'miriam.sanchezs@alumnos.upm.es');
 
      const demoStudents = allUsers.filter(u => u.role === 'student' && u.name.startsWith('Alumno '));
 
      //--- 2. Crear Grupos para Profesor1 y cuentas personales ---
      console.log('2. Creating groups...');
      const groupEntries = [
        { name: 'Grupo Diseño SW', initDate: '2025-01-15', endDate: '2025-12-31', userId: profesor1.id, createdAt: now, updatedAt: now },
        { name: 'Grupo Pruebas y Calidad', initDate: '2025-02-01', endDate: '2025-11-30', userId: profesor1.id, createdAt: now, updatedAt: now },
        { name: 'Grupo Arquitectura y Patrones', initDate: '2025-03-01', endDate: null, userId: profesor1.id, createdAt: now, updatedAt: now },
        { name: 'Grupo Elena Demo', initDate: '2025-04-01', endDate: null, userId: elena.id, createdAt: now, updatedAt: now },
        { name: 'Grupo Miriam Demo', initDate: '2025-05-01', endDate: null, userId: miriam.id, createdAt: now, updatedAt: now },
      ];
 
      await queryInterface.bulkInsert('group', groupEntries, {});
      console.log('Groups inserted. Retrieving IDs...');
 
      const allGroups = await Group.findAll();
      const grupoDiseno = allGroups.find(g => g.name === 'Grupo Diseño SW' && g.userId === profesor1.id);
      const grupoPruebas = allGroups.find(g => g.name === 'Grupo Pruebas y Calidad' && g.userId === profesor1.id);
      const grupoPatrones = allGroups.find(g => g.name === 'Grupo Arquitectura y Patrones' && g.userId === profesor1.id);
      const grupoElena = allGroups.find(g => g.name === 'Grupo Elena Demo' && g.userId === elena.id);
      const grupoMiriam = allGroups.find(g => g.name === 'Grupo Miriam Demo' && g.userId === miriam.id);
 
 
      //--- 3. Vincular Alumnos a Grupos de Profesor1 ---
      console.log('3. Linking students to groups...');
      const studentGroupEntries = [];
      const numStudentsPerGroup = Math.ceil(demoStudents.length / 3);
 
      demoStudents.forEach((student, index) => {
        //Distribuye todos los alumnos en los 3 grupos del profesor1
        if (index < numStudentsPerGroup) {
          studentGroupEntries.push({ userId: student.id, groupId: grupoDiseno.id, createdAt: now, updatedAt: now });
        } else if (index < 2 * numStudentsPerGroup) {
          studentGroupEntries.push({ userId: student.id, groupId: grupoPruebas.id, createdAt: now, updatedAt: now });
        } else {
          studentGroupEntries.push({ userId: student.id, groupId: grupoPatrones.id, createdAt: now, updatedAt: now });
        }
        //Esto es para que podamos hacer pruebas
        if (index === 0 && grupoElena) {
          studentGroupEntries.push({ userId: student.id, groupId: grupoElena.id, createdAt: now, updatedAt: now });
        }
        if (index === 1 && grupoMiriam) {
          studentGroupEntries.push({ userId: student.id, groupId: grupoMiriam.id, createdAt: now, updatedAt: now });
        }
      });
 
      await queryInterface.bulkInsert('student_group', studentGroupEntries, {});
      console.log('Students linked to groups.');
 
      //--- 4. Crear Wordles, Palabras y Preguntas ---
      console.log('4. Creating Wordles, Words, and Questions...');
 
      //--- Wordle 1: Principios SOLID ---
      const wordleSE1_Name = 'Principios SOLID';
      await queryInterface.bulkInsert('wordle', [{ name: wordleSE1_Name, userId: profesor1.id, difficulty: 'high', createdAt: now, updatedAt: now }], {});
      const wordleIdSE1 = (await Wordle.findOne({ where: { name: wordleSE1_Name, userId: profesor1.id } })).id;
 
      await queryInterface.bulkInsert('word', [
        { word: 'RESPONSABILIDAD', hint: 'El principio S de SOLID: una clase debe tener solo una razón para cambiar.', wordleId: wordleIdSE1, createdAt: now, updatedAt: now },
        { word: 'ABIERTO', hint: 'El principio O de SOLID: abierto para extensión, cerrado para modificación.', wordleId: wordleIdSE1, createdAt: now, updatedAt: now },
        { word: 'LISKOV', hint: 'El principio L de SOLID: los objetos de un tipo base deben poder ser sustituidos por objetos de un subtipo.', wordleId: wordleIdSE1, createdAt: now, updatedAt: now },
        { word: 'INTERFAZ', hint: 'El principio I de SOLID: mejor tener muchas interfaces pequeñas y específicas que una grande.', wordleId: wordleIdSE1, createdAt: now, updatedAt: now },
        { word: 'DEPENDENCIA', hint: 'El principio D de SOLID: los módulos de alto nivel no deben depender de los de bajo nivel, sino de abstracciones.', wordleId: wordleIdSE1, createdAt: now, updatedAt: now },
        { word: 'COHESION', hint: 'Mide cuán relacionadas y enfocadas están las responsabilidades de un módulo. Alta es deseable.', wordleId: wordleIdSE1, createdAt: now, updatedAt: now },
        { word: 'ACOPLAMIENTO', hint: 'Mide la interdependencia entre módulos. Bajo es deseable para facilitar el mantenimiento.', wordleId: wordleIdSE1, createdAt: now, updatedAt: now },
      ], {});
 
      await queryInterface.bulkInsert('question', [
        { question: '¿Qué principio de SOLID dice que una clase debe tener solo una razón para cambiar?', options: JSON.stringify(['Responsabilidad Única', 'Abierto/Cerrado', 'Sustitución Liskov']), correctAnswer: JSON.stringify('Responsabilidad Única'), type: 'single', wordleId: wordleIdSE1, createdAt: now, updatedAt: now },
        { question: 'El principio que indica que las entidades de software deben estar abiertas para extensión, pero cerradas para modificación, es el de:', options: JSON.stringify(['Liskov Substitution', 'Open/Closed', 'Dependency Inversion']), correctAnswer: JSON.stringify('Open/Closed'), type: 'single', wordleId: wordleIdSE1, createdAt: now, updatedAt: now },
        { question: 'Según el principio de Sustitución de Liskov, si S es un subtipo de T, ¿pueden los objetos de tipo T ser reemplazados por objetos de tipo S sin alterar las propiedades del programa?', options: JSON.stringify(['Verdadero', 'Falso']), correctAnswer: JSON.stringify('Verdadero'), type: 'single', wordleId: wordleIdSE1, createdAt: now, updatedAt: now },
        { question: '¿Qué principio de SOLID sugiere que es mejor tener muchas interfaces pequeñas y específicas que una interfaz grande y general?', options: JSON.stringify(['Interface Segregation', 'Dependency Inversion', 'Single Responsibility']), correctAnswer: JSON.stringify('Interface Segregation'), type: 'single', wordleId: wordleIdSE1, createdAt: now, updatedAt: now },
        { question: 'El principio de Inversión de Dependencia (D.I.P.) establece que los módulos de alto nivel no deben depender de módulos de bajo nivel, sino de:', options: JSON.stringify(['Implementaciones concretas', 'Abstracciones', 'Clases base']), correctAnswer: JSON.stringify('Abstracciones'), type: 'single', wordleId: wordleIdSE1, createdAt: now, updatedAt: now },
        { question: '¿Qué letra del acrónimo SOLID se relaciona con la frase "Build abstractions on stable interfaces, not volatile implementations"?', options: JSON.stringify(['S', 'O', 'D']), correctAnswer: JSON.stringify('D'), type: 'single', wordleId: wordleIdSE1, createdAt: now, updatedAt: now },
        { question: 'Un módulo debe ser fácil de extender sin modificar su código fuente. ¿A qué principio SOLID se refiere?', options: JSON.stringify(['Abierto/Cerrado', 'Responsabilidad Única', 'Inversión de Dependencia']), correctAnswer: JSON.stringify('Abierto/Cerrado'), type: 'single', wordleId: wordleIdSE1, createdAt: now, updatedAt: now },
        { question: 'Si una clase cambia por más de un motivo, ¿qué principio de SOLID se está violando?', options: JSON.stringify(['Single Responsibility', 'Liskov Substitution', 'Interface Segregation']), correctAnswer: JSON.stringify('Single Responsibility'), type: 'single', wordleId: wordleIdSE1, createdAt: now, updatedAt: now },
        { question: '¿Cuál de los principios SOLID es el más difícil de entender y aplicar según algunos desarrolladores?', options: JSON.stringify(['S (SRP)', 'L (LSP)', 'D (DIP)']), correctAnswer: JSON.stringify('D (DIP)'), type: 'single', wordleId: wordleIdSE1, createdAt: now, updatedAt: now },
        { question: 'Un buen diseño SOLID lleva a un software más:', options: JSON.stringify(['Acoplado', 'Flexible', 'Rígido']), correctAnswer: JSON.stringify('Flexible'), type: 'single', wordleId: wordleIdSE1, createdAt: now, updatedAt: now },
        { question: '¿Qué principio de SOLID busca reducir el acoplamiento y aumentar la cohesión?', options: JSON.stringify(['Responsabilidad Única', 'Interface Segregation', 'Inversión de Dependencia']), correctAnswer: JSON.stringify('Inversión de Dependencia'), type: 'single', wordleId: wordleIdSE1, createdAt: now, updatedAt: now },
        { question: 'El uso excesivo de herencia de implementación puede llevar a la violación de qué principio SOLID?', options: JSON.stringify(['Open/Closed', 'Liskov Substitution', 'Interface Segregation']), correctAnswer: JSON.stringify('Liskov Substitution'), type: 'single', wordleId: wordleIdSE1, createdAt: now, updatedAt: now },
        { question: 'Si una interfaz tiene demasiados métodos, y las clases que la implementan no necesitan todos ellos, ¿qué principio SOLID se viola?', options: JSON.stringify(['Single Responsibility', 'Interface Segregation', 'Dependency Inversion']), correctAnswer: JSON.stringify('Interface Segregation'), type: 'single', wordleId: wordleIdSE1, createdAt: now, updatedAt: now },
        { question: 'Las dependencias deben ir de lo concreto a lo abstracto. ¿Verdadero o Falso?', options: JSON.stringify(['Falso', 'Verdadero']), correctAnswer: JSON.stringify('Falso'), type: 'single', wordleId: wordleIdSE1, createdAt: now, updatedAt: now },
        { question: 'Cuando un módulo de alto nivel depende de un módulo de bajo nivel concreto, se viola el principio de:', options: JSON.stringify(['Responsabilidad Única', 'Inversión de Dependencia', 'Abierto/Cerrado']), correctAnswer: JSON.stringify('Inversión de Dependencia'), type: 'single', wordleId: wordleIdSE1, createdAt: now, updatedAt: now },
        {
          question: '¿Qué principios de SOLID están relacionados con la mejora del acoplamiento y la cohesión en el diseño de software?',
          options: JSON.stringify(['Single Responsibility Principle (SRP)', 'Liskov Substitution Principle (LSP)', 'Interface Segregation Principle (ISP)', 'Dependency Inversion Principle (DIP)']),
          correctAnswer: JSON.stringify(['Single Responsibility Principle (SRP)', 'Interface Segregation Principle (ISP)', 'Dependency Inversion Principle (DIP)']),
          type: 'multichoice', wordleId: wordleIdSE1, createdAt: now, updatedAt: now
        },
        {
          question: '¿Qué principios de SOLID se consideran los pilares de un diseño de software flexible y extensible?',
          options: JSON.stringify(['Open/Closed Principle (OCP)', 'Liskov Substitution Principle (LSP)', 'Interface Segregation Principle (ISP)']),
          correctAnswer: JSON.stringify(['Open/Closed Principle (OCP)', 'Liskov Substitution Principle (LSP)', 'Interface Segregation Principle (ISP)']),
          type: 'multichoice', wordleId: wordleIdSE1, createdAt: now, updatedAt: now
        },
 
      ], {});
 
      //--- Wordle 2: Patrones de Diseño ---
      const wordleSE2_Name = 'Patrones de Diseño';
      await queryInterface.bulkInsert('wordle', [{ name: wordleSE2_Name, userId: profesor1.id, difficulty: 'low', createdAt: now, updatedAt: now }], {});
      const wordleIdSE2 = (await Wordle.findOne({ where: { name: wordleSE2_Name, userId: profesor1.id } })).id;
 
      await queryInterface.bulkInsert('word', [
        { word: 'FACTORY', hint: 'Patrón creacional que encapsula la lógica de creación de objetos complejos.', wordleId: wordleIdSE2, createdAt: now, updatedAt: now },
        { word: 'BUILDER', hint: 'Patrón creacional que construye objetos complejos paso a paso, permitiendo diferentes representaciones.', wordleId: wordleIdSE2, createdAt: now, updatedAt: now },
        { word: 'SINGLETON', hint: 'Patrón creacional que asegura que una clase tenga una sola instancia y proporciona un punto de acceso global a ella.', wordleId: wordleIdSE2, createdAt: now, updatedAt: now },
        { word: 'PROTOTYPE', hint: 'Patrón creacional que permite crear nuevos objetos clonando instancias existentes sin acoplarse a sus clases concretas.', wordleId: wordleIdSE2, createdAt: now, updatedAt: now },
        { word: 'ABSTRACT', hint: 'Este adjetivo precede al patrón creacional que crea familias de objetos relacionados.', wordleId: wordleIdSE2, createdAt: now, updatedAt: now },
        { word: 'FACTORIA', hint: 'Variante del patrón Factory Method donde se usa un método estático para crear objetos.', wordleId: wordleIdSE2, createdAt: now, updatedAt: now },
        { word: 'COMPLEJOS', hint: 'Los patrones creacionales son útiles para la creación de objetos de este tipo.', wordleId: wordleIdSE2, createdAt: now, updatedAt: now },
      ], {});
 
      await queryInterface.bulkInsert('question', [
        { question: '¿Qué patrón asegura que una clase tenga una sola instancia y proporciona un punto de acceso global a ella?', options: JSON.stringify(['Factory Method', 'Builder', 'Singleton']), correctAnswer: JSON.stringify('Singleton'), type: 'single', wordleId: wordleIdSE2, createdAt: now, updatedAt: now },
        { question: '¿Qué patrón creacional se usa para construir objetos complejos paso a paso?', options: JSON.stringify(['Factory Method', 'Builder', 'Prototype']), correctAnswer: JSON.stringify('Builder'), type: 'single', wordleId: wordleIdSE2, createdAt: now, updatedAt: now },
        { question: '¿Qué patrón creacional permite crear nuevos objetos clonando instancias existentes?', options: JSON.stringify(['Abstract Factory', 'Prototype', 'Singleton']), correctAnswer: JSON.stringify('Prototype'), type: 'single', wordleId: wordleIdSE2, createdAt: now, updatedAt: now },
        { question: '¿Qué patrón creacional define una interfaz para crear un objeto, pero deja que las subclases decidan qué clase instanciar?', options: JSON.stringify(['Abstract Factory', 'Factory Method', 'Builder']), correctAnswer: JSON.stringify('Factory Method'), type: 'single', wordleId: wordleIdSE2, createdAt: now, updatedAt: now },
        { question: '¿Qué patrón creacional proporciona una interfaz para crear familias de objetos relacionados o dependientes sin especificar sus clases concretas?', options: JSON.stringify(['Abstract Factory', 'Factory Method', 'Builder']), correctAnswer: JSON.stringify('Abstract Factory'), type: 'single', wordleId: wordleIdSE2, createdAt: now, updatedAt: now },
        { question: 'El patrón que oculta la lógica de inicialización del objeto es un patrón:', options: JSON.stringify(['Estructural', 'Comportamental', 'Creacional']), correctAnswer: JSON.stringify('Creacional'), type: 'single', wordleId: wordleIdSE2, createdAt: now, updatedAt: now },
        { question: '¿Es el patrón "Lazy Initialization" un patrón creacional?', options: JSON.stringify(['Sí', 'No']), correctAnswer: JSON.stringify('Sí'), type: 'single', wordleId: wordleIdSE2, createdAt: now, updatedAt: now },
        { question: '¿Qué problema intentan resolver los patrones creacionales?', options: JSON.stringify(['Comunicación entre objetos', 'Estructura de objetos', 'Creación de objetos']), correctAnswer: JSON.stringify('Creación de objetos'), type: 'single', wordleId: wordleIdSE2, createdAt: now, updatedAt: now },
        { question: 'El patrón "Object Pool" es un patrón creacional. ¿Verdadero o Falso?', options: JSON.stringify(['Verdadero', 'Falso']), correctAnswer: JSON.stringify('Verdadero'), type: 'single', wordleId: wordleIdSE2, createdAt: now, updatedAt: now },
        { question: '¿Qué patrón se usaría para crear una configuración global en una aplicación web?', options: JSON.stringify(['Builder', 'Singleton', 'Factory']), correctAnswer: JSON.stringify('Singleton'), type: 'single', wordleId: wordleIdSE2, createdAt: now, updatedAt: now },
        { question: 'Cuando la creación de objetos es muy costosa, ¿qué patrón creacional es útil?', options: JSON.stringify(['Factory Method', 'Prototype', 'Abstract Factory']), correctAnswer: JSON.stringify('Prototype'), type: 'single', wordleId: wordleIdSE2, createdAt: now, updatedAt: now },
        { question: 'Un patrón creacional que permite que una clase delegue la creación de objetos a sus subclases es...', options: JSON.stringify(['Singleton', 'Factory Method', 'Builder']), correctAnswer: JSON.stringify('Factory Method'), type: 'single', wordleId: wordleIdSE2, createdAt: now, updatedAt: now },
        { question: '¿Qué patrón facilita la creación de variantes de un mismo producto en diferentes plataformas (ej: Button para Windows y MacOS)?', options: JSON.stringify(['Builder', 'Abstract Factory', 'Factory Method']), correctAnswer: JSON.stringify('Abstract Factory'), type: 'single', wordleId: wordleIdSE2, createdAt: now, updatedAt: now },
        { question: 'El patrón que desacopla la construcción de un objeto de su representación es:', options: JSON.stringify(['Factory', 'Builder', 'Prototype']), correctAnswer: JSON.stringify('Builder'), type: 'single', wordleId: wordleIdSE2, createdAt: now, updatedAt: now },
        { question: 'Este patrón es útil cuando el proceso de creación de un objeto es muy complejo y puede tener diferentes pasos.', options: JSON.stringify(['Singleton', 'Abstract Factory', 'Builder']), correctAnswer: JSON.stringify('Builder'), type: 'single', wordleId: wordleIdSE2, createdAt: now, updatedAt: now },
 
        {
          question: '¿Cuáles de los siguientes son patrones de diseño creacionales del "Gang of Four" (GoF)?',
          options: JSON.stringify(['Adapter', 'Factory Method', 'Singleton', 'Strategy', 'Builder']),
          correctAnswer: JSON.stringify(['Factory Method', 'Singleton', 'Builder']),
          type: 'multichoice', wordleId: wordleIdSE2, createdAt: now, updatedAt: now
        },
        {
          question: 'Un patrón creacional es útil cuando:',
          options: JSON.stringify(['Se desea ocultar la lógica de creación de objetos', 'Se necesita una única instancia de una clase', 'La creación de objetos es un proceso simple y directo']),
          correctAnswer: JSON.stringify(['Se desea ocultar la lógica de creación de objetos', 'Se necesita una única instancia de una clase']),
          type: 'multichoice', wordleId: wordleIdSE2, createdAt: now, updatedAt: now
        },
        {
          question: 'Si necesitas crear diferentes versiones de un producto, cada una con un conjunto diferente de componentes, ¿qué patrones creacionales podrías considerar?',
          options: JSON.stringify(['Builder', 'Abstract Factory', 'Singleton', 'Observer']),
          correctAnswer: JSON.stringify(['Builder', 'Abstract Factory']),
          type: 'multichoice', wordleId: wordleIdSE2, createdAt: now, updatedAt: now
        },
 
      ], {});
 
 
      //--- Wordle 3: Antipatrones de Software ---
      const wordleSE3_Name = 'Antipatrones Comunes SW';
      await queryInterface.bulkInsert('wordle', [{ name: wordleSE3_Name, userId: profesor1.id, difficulty: 'high', createdAt: now, updatedAt: now }], {});
      const wordleIdSE3 = (await Wordle.findOne({ where: { name: wordleSE3_Name, userId: profesor1.id } })).id;
 
      await queryInterface.bulkInsert('word', [
        { word: 'GODCLASS', hint: 'Antipatrón donde una clase acumula demasiadas responsabilidades. También llamada "Clase Dios".', wordleId: wordleIdSE3, createdAt: now, updatedAt: now },
        { word: 'ESPAGUETI', hint: 'Antipatrón que describe código con un flujo de control caótico y difícil de seguir.', wordleId: wordleIdSE3, createdAt: now, updatedAt: now },
        { word: 'BIGBALLOFMUD', hint: 'Antipatrón arquitectónico que describe un sistema sin estructura discernible, que crece de forma ad hoc.', wordleId: wordleIdSE3, createdAt: now, updatedAt: now },
        { word: 'LOCKIN', hint: 'Problema de dependencia excesiva de un proveedor o tecnología específica, impidiendo la migración.', wordleId: wordleIdSE3, createdAt: now, updatedAt: now },
        { word: 'DUPLICACION', hint: 'Antipatrón donde el mismo código o lógica se repite en múltiples lugares.', wordleId: wordleIdSE3, createdAt: now, updatedAt: now },
        { word: 'RIGIDEZ', hint: 'Antipatrón donde el software es difícil de cambiar debido a un diseño inflexible, a menudo resultado de un alto acoplamiento.', wordleId: wordleIdSE3, createdAt: now, updatedAt: now },
        { word: 'FRAGILIDAD', hint: 'Antipatrón donde un pequeño cambio en un lugar inesperadamente causa fallos en muchas otras áreas del sistema.', wordleId: wordleIdSE3, createdAt: now, updatedAt: now },
        { word: 'ORO', hint: 'Se refiere al antipatrón "Martillo de Oro", donde una solución o tecnología se aplica a todos los problemas.', wordleId: wordleIdSE3, createdAt: now, updatedAt: now },
      ], {});
 
      await queryInterface.bulkInsert('question', [
        { question: '¿Cómo se llama el antipatrón donde una clase tiene demasiadas responsabilidades y se vuelve un punto central de la aplicación?', options: JSON.stringify(['Clase Dios', 'Acoplamiento Fuerte', 'Código Espagueti']), correctAnswer: JSON.stringify('Clase Dios'), type: 'single', wordleId: wordleIdSE3, createdAt: now, updatedAt: now },
        { question: 'Un sistema con una estructura indistinta, mal documentada y sin patrones reconocibles se conoce como:', options: JSON.stringify(['Arquitectura de Capas', 'Bola de Barro Gigante', 'Diseño Estructurado']), correctAnswer: JSON.stringify('Bola de Barro Gigante'), type: 'single', wordleId: wordleIdSE3, createdAt: now, updatedAt: now },
        { question: '¿Qué antipatrón describe una base de código donde el flujo de control es caótico y difícil de seguir?', options: JSON.stringify(['Código Ladrillo', 'Código Chicle', 'Código Espagueti']), correctAnswer: JSON.stringify('Código Espagueti'), type: 'single', wordleId: wordleIdSE3, createdAt: now, updatedAt: now },
        { question: 'El antipatrón "Golden Hammer" se refiere al uso indiscriminado de una tecnología o herramienta en todos los problemas. ¿Verdadero o Falso?', options: JSON.stringify(['Verdadero', 'Falso']), correctAnswer: JSON.stringify('Verdadero'), type: 'single', wordleId: wordleIdSE3, createdAt: now, updatedAt: now },
        { question: 'Cuando los cambios en una parte del código afectan a muchas otras partes no relacionadas, estamos ante un problema de:', options: JSON.stringify(['Baja Cohesión', 'Alto Acoplamiento', 'Duplicación de Código']), correctAnswer: JSON.stringify('Alto Acoplamiento'), type: 'single', wordleId: wordleIdSE3, createdAt: now, updatedAt: now },
        { question: '¿Qué antipatrón de diseño se evita aplicando el principio de Responsabilidad Única?', options: JSON.stringify(['Clase Dios', 'Conexión Directa', 'Bloqueo Mutuo']), correctAnswer: JSON.stringify('Clase Dios'), type: 'single', wordleId: wordleIdSE3, createdAt: now, updatedAt: now },
        { question: 'El antipatrón "Copy-Paste Programming" lleva a una violación directa de qué principio de diseño?', options: JSON.stringify(['DRY (Don\'t Repeat Yourself)', 'YAGNI (You Aren\'t Gonna Need It)', 'KISS (Keep It Simple, Stupid)']), correctAnswer: JSON.stringify('DRY (Don\'t Repeat Yourself)'), type: 'single', wordleId: wordleIdSE3, createdAt: now, updatedAt: now },
        { question: 'Si un desarrollador se niega a refactorizar un código por miedo a romperlo, ¿qué antipatrón podría estar sufriendo el proyecto?', options: JSON.stringify(['Rigidez', 'Fragilidad', 'Inmovilidad']), correctAnswer: JSON.stringify('Rigidez'), type: 'single', wordleId: wordleIdSE3, createdAt: now, updatedAt: now },
        { question: '¿Qué antipatrón es el opuesto a un buen diseño modular?', options: JSON.stringify(['Clase Dios', 'Interfaz Inflada', 'Principio de Cierre']), correctAnswer: JSON.stringify('Clase Dios'), type: 'single', wordleId: wordleIdSE3, createdAt: now, updatedAt: now },
        { question: 'Cuando un componente cambia muy a menudo, y eso causa cambios en otros componentes, se le llama:', options: JSON.stringify(['Acoplamiento', 'Cohesión', 'Fragilidad']), correctAnswer: JSON.stringify('Fragilidad'), type: 'single', wordleId: wordleIdSE3, createdAt: now, updatedAt: now },
        { question: 'El antipatrón "Conmutación por error (Fail-Safe)" es un error de seguridad donde un sistema falla de forma insegura. ¿Verdadero o Falso?', options: JSON.stringify(['Verdadero', 'Falso']), correctAnswer: JSON.stringify('Verdadero'), type: 'single', wordleId: wordleIdSE3, createdAt: now, updatedAt: now },
        { question: '¿Cómo se llama la situación en la que dos módulos A y B se llaman entre sí, creando una dependencia circular?', options: JSON.stringify(['Acoplamiento temporal', 'Acoplamiento transitivo', 'Acoplamiento cíclico']), correctAnswer: JSON.stringify('Acoplamiento cíclico'), type: 'single', wordleId: wordleIdSE3, createdAt: now, updatedAt: now },
        { question: 'El antipatrón "Feature Envy" (envidia de características) ocurre cuando un método de una clase está más interesado en los datos de otra clase que en los suyos propios. ¿Verdadero o Falso?', options: JSON.stringify(['Verdadero', 'Falso']), correctAnswer: JSON.stringify('Verdadero'), type: 'single', wordleId: wordleIdSE3, createdAt: now, updatedAt: now },
        { question: '¿Qué antipatrón se describe como una clase que tiene demasiadas dependencias y es difícil de probar y reutilizar?', options: JSON.stringify(['Clase de servicio', 'Clase de utilidad', 'Clase de Dios']), correctAnswer: JSON.stringify('Clase de Dios'), type: 'single', wordleId: wordleIdSE3, createdAt: now, updatedAt: now },
 
        {
          question: '¿Qué características son comunes en un "Big Ball of Mud"?',
          options: JSON.stringify(['Buena documentación', 'Falta de estructura discernible', 'Fácil de mantener', 'Crecimiento ad hoc']),
          correctAnswer: JSON.stringify(['Falta de estructura discernible', 'Crecimiento ad hoc']),
          type: 'multichoice', wordleId: wordleIdSE3, createdAt: now, updatedAt: now
        },
        {
          question: 'El "Código Espagueti" se caracteriza por:',
          options: JSON.stringify(['Flujo de control caótico', 'Alto acoplamiento funcional', 'Baja cohesión', 'Manejo de errores centralizado']),
          correctAnswer: JSON.stringify(['Flujo de control caótico', 'Baja cohesión']),
          type: 'multichoice', wordleId: wordleIdSE3, createdAt: now, updatedAt: now
        },
        {
          question: '¿Cuáles de los siguientes son efectos negativos de un alto acoplamiento?',
          options: JSON.stringify(['Rigidez', 'Facilidad de refactorización', 'Fragilidad', 'Reutilización']),
          correctAnswer: JSON.stringify(['Rigidez', 'Fragilidad']),
          type: 'multichoice', wordleId: wordleIdSE3, createdAt: now, updatedAt: now
        },
 
 
      ], {});
 
 
      //--- Wordle 4: Pruebas de Software ---
      const wordleSE4_Name = 'Tipos y Técnicas de Pruebas SW';
      await queryInterface.bulkInsert('wordle', [{ name: wordleSE4_Name, userId: profesor1.id, difficulty: 'low', createdAt: now, updatedAt: now }], {});
      const wordleIdSE4 = (await Wordle.findOne({ where: { name: wordleSE4_Name, userId: profesor1.id } })).id;
 
      await queryInterface.bulkInsert('word', [
        { word: 'UNITARIAS', hint: 'Pruebas que verifican el comportamiento de componentes individuales de forma aislada.', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
        { word: 'INTEGRACION', hint: 'Pruebas que verifican la interacción entre diferentes módulos o sistemas.', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
        { word: 'CAJANEGRA', hint: 'Tipo de prueba que ignora la estructura interna del código y se enfoca en la funcionalidad externa.', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
        { word: 'CAJABLANCA', hint: 'Tipo de prueba que evalúa la estructura interna y el funcionamiento del código.', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
        { word: 'REGRESION', hint: 'Pruebas que se realizan para asegurar que los cambios recientes no han introducido nuevos defectos en funcionalidades existentes.', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
        { word: 'ACEPTACION', hint: 'Pruebas finales para validar que el sistema cumple con los requisitos del usuario o del cliente.', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
        { word: 'SISTEMA', hint: 'Pruebas que evalúan el sistema completo e integrado para verificar que cumple los requisitos funcionales y no funcionales.', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
        { word: 'COBERTURA', hint: 'Métrica que indica la proporción de código ejecutado durante las pruebas.', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
        { word: 'MOCK', hint: 'Objeto de prueba que simula el comportamiento de un componente y registra las interacciones para verificación.', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
      ], {});
 
      await queryInterface.bulkInsert('question', [
        { question: '¿Qué tipo de pruebas verifican el comportamiento de componentes individuales de forma aislada?', options: JSON.stringify(['Unitarias', 'Integración', 'Sistema']), correctAnswer: JSON.stringify('Unitarias'), type: 'single', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
        { question: 'Las pruebas que verifican la interacción entre diferentes módulos o sistemas son:', options: JSON.stringify(['Funcionales', 'De Integración', 'De Carga']), correctAnswer: JSON.stringify('De Integración'), type: 'single', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
        { question: '¿Qué tipo de pruebas se realizan para asegurar que los cambios recientes no han introducido nuevos defectos en funcionalidades existentes?', options: JSON.stringify(['De Humo', 'De Regresión', 'De Sanidad']), correctAnswer: JSON.stringify('De Regresión'), type: 'single', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
        { question: 'Las pruebas de caja negra se centran en:', options: JSON.stringify(['La estructura interna del código', 'La funcionalidad desde la perspectiva del usuario', 'Los caminos de ejecución del código']), correctAnswer: JSON.stringify('La funcionalidad desde la perspectiva del usuario'), type: 'single', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
        { question: '¿Qué técnica de caja blanca se asegura de que cada línea de código sea ejecutada al menos una vez?', options: JSON.stringify(['Cobertura de Decisión', 'Cobertura de Sentencia', 'Cobertura de Condición']), correctAnswer: JSON.stringify('Cobertura de Sentencia'), type: 'single', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
        { question: '¿Cuál es el objetivo principal de las pruebas de aceptación?', options: JSON.stringify(['Encontrar errores internos del código', 'Validar que el sistema cumple los requisitos del usuario', 'Medir el rendimiento bajo carga']), correctAnswer: JSON.stringify('Validar que el sistema cumple los requisitos del usuario'), type: 'single', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
        { question: 'El "Test Driven Development" (TDD) es una práctica que prioriza la escritura de pruebas ____ antes de la escritura de código.', options: JSON.stringify(['De Integración', 'Unitarias', 'De Sistema']), correctAnswer: JSON.stringify('Unitarias'), type: 'single', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
        { question: 'Las pruebas de ____ intentan descubrir defectos explotando las vulnerabilidades del sistema.', options: JSON.stringify(['Usabilidad', 'Seguridad', 'Rendimiento']), correctAnswer: JSON.stringify('Seguridad'), type: 'single', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
        { question: 'Cuando un sistema se somete a un volumen muy alto de peticiones para ver su comportamiento, estamos hablando de pruebas de:', options: JSON.stringify(['Estrés', 'Carga', 'Integración']), correctAnswer: JSON.stringify('Carga'), type: 'single', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
        { question: '¿Es el "Exploratory Testing" un tipo de prueba formal?', options: JSON.stringify(['Sí', 'No']), correctAnswer: JSON.stringify('No'), type: 'single', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
        { question: '¿Qué tipo de prueba se realiza con el propósito de garantizar que el software se puede desplegar y operar en un nuevo entorno sin problemas?', options: JSON.stringify(['Pruebas de Usabilidad', 'Pruebas de Migración', 'Pruebas de Recuperación']), correctAnswer: JSON.stringify('Pruebas de Migración'), type: 'single', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
        { question: 'Una prueba de caja blanca se basa en la estructura interna del software. ¿Verdadero o Falso?', options: JSON.stringify(['Verdadero', 'Falso']), correctAnswer: JSON.stringify('Verdadero'), type: 'single', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
        { question: '¿Qué se utiliza para simular el comportamiento de componentes aún no desarrollados en pruebas unitarias?', options: JSON.stringify(['Stubs', 'Drivers', 'Monitores']), correctAnswer: JSON.stringify('Stubs'), type: 'single', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
        { question: 'El proceso de encontrar la causa raíz de un defecto se conoce como:', options: JSON.stringify(['Debugging', 'Testing', 'Verification']), correctAnswer: JSON.stringify('Debugging'), type: 'single', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
        { question: 'Las pruebas de ____ se centran en verificar que el sistema es fácil de usar y aprender.', options: JSON.stringify(['Rendimiento', 'Seguridad', 'Usabilidad']), correctAnswer: JSON.stringify('Usabilidad'), type: 'single', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
        { question: '¿Qué tipo de prueba se realiza después de un parche o actualización para asegurar que el sistema sigue funcionando como se espera?', options: JSON.stringify(['Sanity Test', 'Smoke Test', 'Regression Test']), correctAnswer: JSON.stringify('Regression Test'), type: 'single', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
        { question: '¿Qué principio de pruebas sugiere que no es posible probar exhaustivamente todas las combinaciones de entrada?', options: JSON.stringify(['Principio de Pareto', 'Paradoja del Pesticida', 'Exhaustividad es imposible']), correctAnswer: JSON.stringify('Exhaustividad es imposible'), type: 'single', wordleId: wordleIdSE4, createdAt: now, updatedAt: now },
 
 
        {
          question: '¿Qué elementos son característicos de las pruebas de caja negra?',
          options: JSON.stringify(['Basadas en la especificación de requisitos', 'Ignoran la estructura interna del código', 'Requieren acceso al código fuente', 'Se enfocan en el comportamiento externo']),
          correctAnswer: JSON.stringify(['Basadas en la especificación de requisitos', 'Ignoran la estructura interna del código', 'Se enfocan en el comportamiento externo']),
          type: 'multichoice', wordleId: wordleIdSE4, createdAt: now, updatedAt: now
        },
        {
          question: '¿Cuáles de los siguientes son tipos de pruebas no funcionales?',
          options: JSON.stringify(['Pruebas de Usabilidad', 'Pruebas de Integración', 'Pruebas de Rendimiento', 'Pruebas de Regresión']),
          correctAnswer: JSON.stringify(['Pruebas de Usabilidad', 'Pruebas de Rendimiento']),
          type: 'multichoice', wordleId: wordleIdSE4, createdAt: now, updatedAt: now
        },
        {
          question: 'Las pruebas unitarias son beneficiosas porque:',
          options: JSON.stringify(['Ayudan a encontrar errores temprano', 'Facilitan la refactorización', 'Miden la satisfacción del usuario', 'Aseguran el rendimiento del sistema']),
          correctAnswer: JSON.stringify(['Ayudan a encontrar errores temprano', 'Facilitan la refactorización']),
          type: 'multichoice', wordleId: wordleIdSE4, createdAt: now, updatedAt: now
        },
 
 
      ], {});
 
      //--- Wordle 5: Procesos de Desarrollo y Gestión de Proyectos ---
      const wordleSE5_Name = 'Modelos y Procesos SW';
      await queryInterface.bulkInsert('wordle', [{ name: wordleSE5_Name, userId: profesor1.id, difficulty: 'low', createdAt: now, updatedAt: now }], {});
      const wordleIdSE5 = (await Wordle.findOne({ where: { name: wordleSE5_Name, userId: profesor1.id } })).id;
 
      await queryInterface.bulkInsert('word', [
        { word: 'CASCADA', hint: 'Modelo de ciclo de vida del software lineal y secuencial, donde cada fase debe completarse antes de que comience la siguiente.', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
        { word: 'AGIL', hint: 'Conjunto de metodologías de desarrollo de software que enfatizan la colaboración, la entrega incremental y la adaptación al cambio.', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
        { word: 'SCRUM', hint: 'Framework ágil iterativo e incremental para gestionar proyectos de desarrollo de software.', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
        { word: 'KANBAN', hint: 'Método visual para gestionar el flujo de trabajo, centrado en limitar el trabajo en progreso y maximizar la eficiencia.', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
        { word: 'SPRINT', hint: 'Período de tiempo fijo y corto (generalmente 1-4 semanas) durante el cual un equipo de Scrum trabaja para completar un conjunto de trabajo.', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
        { word: 'BACKLOG', hint: 'Listas de tareas o requisitos pendientes en metodologías ágiles (ej. Product Backlog, Sprint Backlog).', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
        { word: 'ITERATIVO', hint: 'Característica de los procesos ágiles donde el desarrollo se realiza en ciclos repetitivos.', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
        { word: 'INCREMENTAL', hint: 'Característica de los procesos ágiles donde el producto se construye en pequeñas partes funcionales y se entrega regularmente.', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
        { word: 'DEVOPS', hint: 'Cultura y práctica que unifica el desarrollo de software (Dev) y las operaciones de software (Ops).', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
        { word: 'XP', hint: 'Una de las metodologías ágiles, conocida por prácticas como programación en parejas y TDD.', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
      ], {});
 
      await queryInterface.bulkInsert('question', [
        { question: '¿Qué modelo de ciclo de vida del software se caracteriza por etapas secuenciales y rigurosas, con poco retorno a fases anteriores?', options: JSON.stringify(['Espiral', 'Ágil', 'Cascada']), correctAnswer: JSON.stringify('Cascada'), type: 'single', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
        { question: 'En Scrum, ¿cómo se llama el período de tiempo fijo y corto durante el cual un equipo trabaja para completar un incremento de producto?', options: JSON.stringify(['Fase', 'Sprint', 'Iteración']), correctAnswer: JSON.stringify('Sprint'), type: 'single', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
        { question: '¿Qué rol en Scrum es responsable de maximizar el valor del producto y gestionar el Product Backlog?', options: JSON.stringify(['Scrum Master', 'Development Team', 'Product Owner']), correctAnswer: JSON.stringify('Product Owner'), type: 'single', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
        { question: 'Un proceso de desarrollo que se adapta a los cambios y enfatiza la colaboración con el cliente es de tipo:', options: JSON.stringify(['Lineal', 'Predictivo', 'Ágil']), correctAnswer: JSON.stringify('Ágil'), type: 'single', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
        { question: '¿Qué modelo de ciclo de vida del software incorpora gestión de riesgos en cada iteración?', options: JSON.stringify(['Cascada', 'Espiral', 'V-Model']), correctAnswer: JSON.stringify('Espiral'), type: 'single', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
        { question: 'La frase "Las personas y sus interacciones sobre los procesos y herramientas" pertenece al manifiesto:', options: JSON.stringify(['XP', 'Scrum', 'Ágil']), correctAnswer: JSON.stringify('Ágil'), type: 'single', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
        { question: '¿Qué artefacto de Scrum describe el trabajo que el equipo realizará durante el Sprint?', options: JSON.stringify(['Product Backlog', 'Sprint Backlog', 'Incremento']), correctAnswer: JSON.stringify('Sprint Backlog'), type: 'single', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
        { question: 'El concepto de "Minimum Viable Product" (MVP) se asocia comúnmente con metodologías:', options: JSON.stringify(['Cascada', 'Ágiles', 'En V']), correctAnswer: JSON.stringify('Ágiles'), type: 'single', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
        { question: '¿Qué ceremonia de Scrum se realiza al final de cada Sprint para inspeccionar el incremento y adaptar el Product Backlog?', options: JSON.stringify(['Daily Scrum', 'Sprint Planning', 'Sprint Review']), correctAnswer: JSON.stringify('Sprint Review'), type: 'single', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
        { question: '¿Cuál es el principal enfoque del "DevOps"?', options: JSON.stringify(['Desarrollo rápido', 'Integración y despliegue continuos', 'Documentación exhaustiva']), correctAnswer: JSON.stringify('Integración y despliegue continuos'), type: 'single', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
        { question: 'En un modelo en cascada, las fases de diseño y desarrollo se superponen para permitir retroalimentación temprana. ¿Verdadero o Falso?', options: JSON.stringify(['Verdadero', 'Falso']), correctAnswer: JSON.stringify('Falso'), type: 'single', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
        { question: '¿Qué proceso se enfoca en entregar software en pequeñas partes funcionales de forma regular?', options: JSON.stringify(['Cascada', 'Iterativo e Incremental', 'Big Bang']), correctAnswer: JSON.stringify('Iterativo e Incremental'), type: 'single', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
        { question: '¿Qué tipo de planificación es característica de las metodologías ágiles, centrándose en períodos cortos?', options: JSON.stringify(['Planificación a largo plazo', 'Planificación adaptativa', 'Planificación predictiva']), correctAnswer: JSON.stringify('Planificación adaptativa'), type: 'single', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
        { question: 'El objetivo de la retrospectiva en Scrum es:', options: JSON.stringify(['Planificar el siguiente Sprint', 'Revisar el incremento del producto', 'Mejorar el proceso de trabajo del equipo']), correctAnswer: JSON.stringify('Mejorar el proceso de trabajo del equipo'), type: 'single', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
        { question: '¿Qué modelo de desarrollo se conoce por su forma de "V" al representar las fases de verificación y validación?', options: JSON.stringify(['Espiral', 'Cascada', 'V-Model']), correctAnswer: JSON.stringify('V-Model'), type: 'single', wordleId: wordleIdSE5, createdAt: now, updatedAt: now },
 
 
        {
          question: '¿Qué artefactos principales se utilizan en Scrum?',
          options: JSON.stringify(['Diagrama de Gantt', 'Product Backlog', 'Sprint Backlog', 'Plan de Proyecto Detallado', 'Incremento']),
          correctAnswer: JSON.stringify(['Product Backlog', 'Sprint Backlog', 'Incremento']),
          type: 'multichoice', wordleId: wordleIdSE5, createdAt: now, updatedAt: now
        },
        {
          question: 'Las ventajas de los modelos ágiles de desarrollo incluyen:',
          options: JSON.stringify(['Rigidez en el cambio de requisitos', 'Mayor colaboración con el cliente', 'Entrega temprana y continua de software', 'Menor necesidad de comunicación']),
          correctAnswer: JSON.stringify(['Mayor colaboración con el cliente', 'Entrega temprana y continua de software']),
          type: 'multichoice', wordleId: wordleIdSE5, createdAt: now, updatedAt: now
        },
        {
          question: '¿Qué roles principales existen en el marco de trabajo Scrum?',
          options: JSON.stringify(['Jefe de Proyecto', 'Product Owner', 'Scrum Master', 'Equipo de Desarrollo', 'Analista de Negocio']),
          correctAnswer: JSON.stringify(['Product Owner', 'Scrum Master', 'Equipo de Desarrollo']),
          type: 'multichoice', wordleId: wordleIdSE5, createdAt: now, updatedAt: now
        },
 
 
      ], {});
 
      console.log('Wordles, words, and questions created.');

      //--- Wordle 6: Diseño Patrones Miriam ---
      const wordleMiriam_Name = 'Patrones de Diseño';
      await queryInterface.bulkInsert('wordle', [{ name: wordleMiriam_Name, userId: miriam.id, difficulty: 'low', createdAt: now, updatedAt: now }], {});
      const wordleIdMiriam = (await Wordle.findOne({ where: { name: wordleMiriam_Name, userId: miriam.id } })).id;
 
      await queryInterface.bulkInsert('word', [
        { word: 'FACTORY', hint: 'Patrón creacional que encapsula la lógica de creación de objetos complejos.', wordleId: wordleIdMiriam, createdAt: now, updatedAt: now },
        { word: 'BUILDER', hint: 'Patrón creacional que construye objetos complejos paso a paso, permitiendo diferentes representaciones.', wordleId: wordleIdMiriam, createdAt: now, updatedAt: now },
        { word: 'SINGLETON', hint: 'Patrón creacional que asegura que una clase tenga una sola instancia y proporciona un punto de acceso global a ella.', wordleId: wordleIdMiriam, createdAt: now, updatedAt: now },
        { word: 'PROTOTYPE', hint: 'Patrón creacional que permite crear nuevos objetos clonando instancias existentes sin acoplarse a sus clases concretas.', wordleId: wordleIdMiriam, createdAt: now, updatedAt: now },
        { word: 'ABSTRACT', hint: 'Este adjetivo precede al patrón creacional que crea familias de objetos relacionados.', wordleId: wordleIdMiriam, createdAt: now, updatedAt: now },
        { word: 'FACTORIA', hint: 'Variante del patrón Factory Method donde se usa un método estático para crear objetos.', wordleId: wordleIdMiriam, createdAt: now, updatedAt: now },
        { word: 'COMPLEJOS', hint: 'Los patrones creacionales son útiles para la creación de objetos de este tipo.', wordleId: wordleIdMiriam, createdAt: now, updatedAt: now },
      ], {});

      await queryInterface.bulkInsert('question', [
        { question: '¿Qué patrón asegura que una clase tenga una sola instancia y proporciona un punto de acceso global a ella?', options: JSON.stringify(['Factory Method', 'Builder', 'Singleton']), correctAnswer: JSON.stringify('Singleton'), type: 'single', wordleId: wordleIdMiriam, createdAt: now, updatedAt: now },
        { question: '¿Qué patrón creacional se usa para construir objetos complejos paso a paso?', options: JSON.stringify(['Factory Method', 'Builder', 'Prototype']), correctAnswer: JSON.stringify('Builder'), type: 'single', wordleId: wordleIdMiriam, createdAt: now, updatedAt: now },
        { question: '¿Qué patrón creacional permite crear nuevos objetos clonando instancias existentes?', options: JSON.stringify(['Abstract Factory', 'Prototype', 'Singleton']), correctAnswer: JSON.stringify('Prototype'), type: 'single', wordleId: wordleIdMiriam, createdAt: now, updatedAt: now },
        { question: '¿Qué patrón creacional define una interfaz para crear un objeto, pero deja que las subclases decidan qué clase instanciar?', options: JSON.stringify(['Abstract Factory', 'Factory Method', 'Builder']), correctAnswer: JSON.stringify('Factory Method'), type: 'single', wordleId: wordleIdMiriam, createdAt: now, updatedAt: now },
        { question: '¿Qué patrón creacional proporciona una interfaz para crear familias de objetos relacionados o dependientes sin especificar sus clases concretas?', options: JSON.stringify(['Abstract Factory', 'Factory Method', 'Builder']), correctAnswer: JSON.stringify('Abstract Factory'), type: 'single', wordleId: wordleIdMiriam, createdAt: now, updatedAt: now },
        { question: 'El patrón que oculta la lógica de inicialización del objeto es un patrón:', options: JSON.stringify(['Estructural', 'Comportamental', 'Creacional']), correctAnswer: JSON.stringify('Creacional'), type: 'single', wordleId: wordleIdMiriam, createdAt: now, updatedAt: now },
        { question: '¿Es el patrón "Lazy Initialization" un patrón creacional?', options: JSON.stringify(['Sí', 'No']), correctAnswer: JSON.stringify('Sí'), type: 'single', wordleId: wordleIdMiriam, createdAt: now, updatedAt: now },
        { question: '¿Qué problema intentan resolver los patrones creacionales?', options: JSON.stringify(['Comunicación entre objetos', 'Estructura de objetos', 'Creación de objetos']), correctAnswer: JSON.stringify('Creación de objetos'), type: 'single', wordleId: wordleIdMiriam, createdAt: now, updatedAt: now },
        { question: 'El patrón "Object Pool" es un patrón creacional. ¿Verdadero o Falso?', options: JSON.stringify(['Verdadero', 'Falso']), correctAnswer: JSON.stringify('Verdadero'), type: 'single', wordleId: wordleIdMiriam, createdAt: now, updatedAt: now },
        { question: '¿Qué patrón se usaría para crear una configuración global en una aplicación web?', options: JSON.stringify(['Builder', 'Singleton', 'Factory']), correctAnswer: JSON.stringify('Singleton'), type: 'single', wordleId: wordleIdMiriam, createdAt: now, updatedAt: now },
        { question: 'Cuando la creación de objetos es muy costosa, ¿qué patrón creacional es útil?', options: JSON.stringify(['Factory Method', 'Prototype', 'Abstract Factory']), correctAnswer: JSON.stringify('Prototype'), type: 'single', wordleId: wordleIdMiriam, createdAt: now, updatedAt: now },
        { question: 'Un patrón creacional que permite que una clase delegue la creación de objetos a sus subclases es...', options: JSON.stringify(['Singleton', 'Factory Method', 'Builder']), correctAnswer: JSON.stringify('Factory Method'), type: 'single', wordleId: wordleIdMiriam, createdAt: now, updatedAt: now },
        { question: '¿Qué patrón facilita la creación de variantes de un mismo producto en diferentes plataformas (ej: Button para Windows y MacOS)?', options: JSON.stringify(['Builder', 'Abstract Factory', 'Factory Method']), correctAnswer: JSON.stringify('Abstract Factory'), type: 'single', wordleId: wordleIdMiriam, createdAt: now, updatedAt: now },
        { question: 'El patrón que desacopla la construcción de un objeto de su representación es:', options: JSON.stringify(['Factory', 'Builder', 'Prototype']), correctAnswer: JSON.stringify('Builder'), type: 'single', wordleId: wordleIdMiriam, createdAt: now, updatedAt: now },
        { question: 'Este patrón es útil cuando el proceso de creación de un objeto es muy complejo y puede tener diferentes pasos.', options: JSON.stringify(['Singleton', 'Abstract Factory', 'Builder']), correctAnswer: JSON.stringify('Builder'), type: 'single', wordleId: wordleIdMiriam, createdAt: now, updatedAt: now },

        {
          question: '¿Cuáles de los siguientes son patrones de diseño creacionales del "Gang of Four" (GoF)?',
          options: JSON.stringify(['Adapter', 'Factory Method', 'Singleton', 'Strategy', 'Builder']),
          correctAnswer: JSON.stringify(['Factory Method', 'Singleton', 'Builder']),
          type: 'multichoice',
          wordleId: wordleIdMiriam,
          createdAt: now,
          updatedAt: now
        },
        {
          question: 'Un patrón creacional es útil cuando:',
          options: JSON.stringify(['Se desea ocultar la lógica de creación de objetos', 'Se necesita una única instancia de una clase', 'La creación de objetos es un proceso simple y directo']),
          correctAnswer: JSON.stringify(['Se desea ocultar la lógica de creación de objetos', 'Se necesita una única instancia de una clase']),
          type: 'multichoice',
          wordleId: wordleIdMiriam,
          createdAt: now,
          updatedAt: now
        },
        {
          question: 'Si necesitas crear diferentes versiones de un producto, cada una con un conjunto diferente de componentes, ¿qué patrones creacionales podrías considerar?',
          options: JSON.stringify(['Builder', 'Abstract Factory', 'Singleton', 'Observer']),
          correctAnswer: JSON.stringify(['Builder', 'Abstract Factory']),
          type: 'multichoice',
          wordleId: wordleIdMiriam,
          createdAt: now,
          updatedAt: now
        },
      ], {});

      //--- Wordle 7: Principios Solid Elena ---
      const wordleElena_Name = 'Principios SOLID';
      await queryInterface.bulkInsert('wordle', [{ name: wordleElena_Name, userId: elena.id, difficulty: 'high', createdAt: now, updatedAt: now }], {});
      const wordleIdElena = (await Wordle.findOne({ where: { name: wordleElena_Name, userId: elena.id } })).id;

      await queryInterface.bulkInsert('word', [
        { word: 'RESPONSABILIDAD', hint: 'El principio S de SOLID: una clase debe tener solo una razón para cambiar.', wordleId: wordleIdElena, createdAt: now, updatedAt: now },
        { word: 'ABIERTO', hint: 'El principio O de SOLID: abierto para extensión, cerrado para modificación.', wordleId: wordleIdElena, createdAt: now, updatedAt: now },
        { word: 'LISKOV', hint: 'El principio L de SOLID: los objetos de un tipo base deben poder ser sustituidos por objetos de un subtipo.', wordleId: wordleIdElena, createdAt: now, updatedAt: now },
        { word: 'INTERFAZ', hint: 'El principio I de SOLID: mejor tener muchas interfaces pequeñas y específicas que una grande.', wordleId: wordleIdElena, createdAt: now, updatedAt: now },
        { word: 'DEPENDENCIA', hint: 'El principio D de SOLID: los módulos de alto nivel no deben depender de los de bajo nivel, sino de abstracciones.', wordleId: wordleIdElena, createdAt: now, updatedAt: now },
        { word: 'COHESION', hint: 'Mide cuán relacionadas y enfocadas están las responsabilidades de un módulo. Alta es deseable.', wordleId: wordleIdElena, createdAt: now, updatedAt: now },
        { word: 'ACOPLAMIENTO', hint: 'Mide la interdependencia entre módulos. Bajo es deseable para facilitar el mantenimiento.', wordleId: wordleIdElena, createdAt: now, updatedAt: now },
      ], {});

      await queryInterface.bulkInsert('question', [
        { question: '¿Qué principio de SOLID dice que una clase debe tener solo una razón para cambiar?', options: JSON.stringify(['Responsabilidad Única', 'Abierto/Cerrado', 'Sustitución Liskov']), correctAnswer: JSON.stringify('Responsabilidad Única'), type: 'single', wordleId: wordleIdElena, createdAt: now, updatedAt: now },
        { question: 'El principio que indica que las entidades de software deben estar abiertas para extensión, pero cerradas para modificación, es el de:', options: JSON.stringify(['Liskov Substitution', 'Open/Closed', 'Dependency Inversion']), correctAnswer: JSON.stringify('Open/Closed'), type: 'single', wordleId: wordleIdElena, createdAt: now, updatedAt: now },
        { question: 'Según el principio de Sustitución de Liskov, si S es un subtipo de T, ¿pueden los objetos de tipo T ser reemplazados por objetos de tipo S sin alterar las propiedades del programa?', options: JSON.stringify(['Verdadero', 'Falso']), correctAnswer: JSON.stringify('Verdadero'), type: 'single', wordleId: wordleIdElena, createdAt: now, updatedAt: now },
        { question: '¿Qué principio de SOLID sugiere que es mejor tener muchas interfaces pequeñas y específicas que una interfaz grande y general?', options: JSON.stringify(['Interface Segregation', 'Dependency Inversion', 'Single Responsibility']), correctAnswer: JSON.stringify('Interface Segregation'), type: 'single', wordleId: wordleIdElena, createdAt: now, updatedAt: now },
        { question: 'El principio de Inversión de Dependencia (D.I.P.) establece que los módulos de alto nivel no deben depender de módulos de bajo nivel, sino de:', options: JSON.stringify(['Implementaciones concretas', 'Abstracciones', 'Clases base']), correctAnswer: JSON.stringify('Abstracciones'), type: 'single', wordleId: wordleIdElena, createdAt: now, updatedAt: now },
        { question: '¿Qué letra del acrónimo SOLID se relaciona con la frase "Build abstractions on stable interfaces, not volatile implementations"?', options: JSON.stringify(['S', 'O', 'D']), correctAnswer: JSON.stringify('D'), type: 'single', wordleId: wordleIdElena, createdAt: now, updatedAt: now },
        { question: 'Un módulo debe ser fácil de extender sin modificar su código fuente. ¿A qué principio SOLID se refiere?', options: JSON.stringify(['Abierto/Cerrado', 'Responsabilidad Única', 'Inversión de Dependencia']), correctAnswer: JSON.stringify('Abierto/Cerrado'), type: 'single', wordleId: wordleIdElena, createdAt: now, updatedAt: now },
        { question: 'Si una clase cambia por más de un motivo, ¿qué principio de SOLID se está violando?', options: JSON.stringify(['Single Responsibility', 'Liskov Substitution', 'Interface Segregation']), correctAnswer: JSON.stringify('Single Responsibility'), type: 'single', wordleId: wordleIdElena, createdAt: now, updatedAt: now },
        { question: '¿Cuál de los principios SOLID es el más difícil de entender y aplicar según algunos desarrolladores?', options: JSON.stringify(['S (SRP)', 'L (LSP)', 'D (DIP)']), correctAnswer: JSON.stringify('D (DIP)'), type: 'single', wordleId: wordleIdElena, createdAt: now, updatedAt: now },
        { question: 'Un buen diseño SOLID lleva a un software más:', options: JSON.stringify(['Acoplado', 'Flexible', 'Rígido']), correctAnswer: JSON.stringify('Flexible'), type: 'single', wordleId: wordleIdElena, createdAt: now, updatedAt: now },
        { question: '¿Qué principio de SOLID busca reducir el acoplamiento y aumentar la cohesión?', options: JSON.stringify(['Responsabilidad Única', 'Interface Segregation', 'Inversión de Dependencia']), correctAnswer: JSON.stringify('Inversión de Dependencia'), type: 'single', wordleId: wordleIdElena, createdAt: now, updatedAt: now },
        { question: 'El uso excesivo de herencia de implementación puede llevar a la violación de qué principio SOLID?', options: JSON.stringify(['Open/Closed', 'Liskov Substitution', 'Interface Segregation']), correctAnswer: JSON.stringify('Liskov Substitution'), type: 'single', wordleId: wordleIdElena, createdAt: now, updatedAt: now },
        { question: 'Si una interfaz tiene demasiados métodos, y las clases que la implementan no necesitan todos ellos, ¿qué principio SOLID se viola?', options: JSON.stringify(['Single Responsibility', 'Interface Segregation', 'Dependency Inversion']), correctAnswer: JSON.stringify('Interface Segregation'), type: 'single', wordleId: wordleIdElena, createdAt: now, updatedAt: now },
        { question: 'Las dependencias deben ir de lo concreto a lo abstracto. ¿Verdadero o Falso?', options: JSON.stringify(['Falso', 'Verdadero']), correctAnswer: JSON.stringify('Falso'), type: 'single', wordleId: wordleIdElena, createdAt: now, updatedAt: now },
        { question: 'Cuando un módulo de alto nivel depende de un módulo de bajo nivel concreto, se viola el principio de:', options: JSON.stringify(['Responsabilidad Única', 'Inversión de Dependencia', 'Abierto/Cerrado']), correctAnswer: JSON.stringify('Inversión de Dependencia'), type: 'single', wordleId: wordleIdElena, createdAt: now, updatedAt: now },
        {
          question: '¿Qué principios de SOLID están relacionados con la mejora del acoplamiento y la cohesión en el diseño de software?',
          options: JSON.stringify(['Single Responsibility Principle (SRP)', 'Liskov Substitution Principle (LSP)', 'Interface Segregation Principle (ISP)', 'Dependency Inversion Principle (DIP)']),
          correctAnswer: JSON.stringify(['Single Responsibility Principle (SRP)', 'Interface Segregation Principle (ISP)', 'Dependency Inversion Principle (DIP)']),
          type: 'multichoice',
          wordleId: wordleIdElena,
          createdAt: now,
          updatedAt: now
        },
        {
          question: '¿Qué principios de SOLID se consideran los pilares de un diseño de software flexible y extensible?',
          options: JSON.stringify(['Open/Closed Principle (OCP)', 'Liskov Substitution Principle (LSP)', 'Interface Segregation Principle (ISP)']),
          correctAnswer: JSON.stringify(['Open/Closed Principle (OCP)', 'Liskov Substitution Principle (LSP)', 'Interface Segregation Principle (ISP)']),
          type: 'multichoice',
          wordleId: wordleIdElena,
          createdAt: now,
          updatedAt: now
        },
      ], {});

      
 
      //--- 5. Vincular Wordles de Profesor1 a sus Grupos ---
      console.log('5. Linking Wordles to Groups...');
      await queryInterface.bulkInsert('wordle_group', [
        { wordleId: wordleIdSE1, groupId: grupoDiseno.id, createdAt: now, updatedAt: now },
        { wordleId: wordleIdSE1, groupId: grupoPatrones.id, createdAt: now, updatedAt: now },
        { wordleId: wordleIdSE2, groupId: grupoPatrones.id, createdAt: now, updatedAt: now },
        { wordleId: wordleIdSE3, groupId: grupoDiseno.id, createdAt: now, updatedAt: now },
        { wordleId: wordleIdSE4, groupId: grupoPruebas.id, createdAt: now, updatedAt: now },
        { wordleId: wordleIdSE5, groupId: grupoDiseno.id, createdAt: now, updatedAt: now },
        { wordleId: wordleIdSE5, groupId: grupoPruebas.id, createdAt: now, updatedAt: now },
        //Para pruebas
        { wordleId: wordleIdElena, groupId: grupoElena.id, createdAt: now, updatedAt: now },
        { wordleId: wordleIdMiriam, groupId: grupoMiriam.id, createdAt: now, updatedAt: now },
      ], {});
      console.log('Wordles linked to groups.');
      console.log('Primeros demoStudents:', demoStudents.map(s => ({ id: s.id, email: s.email })));

      //--- 6. Crear Resultados de Juego ---
      console.log('6. Creating game results...');
      const studentGroups = await StudentGroup.findAll(); 
      const wordleGroups = await WordleGroup.findAll();  

      const groupToWordles = {};
      wordleGroups.forEach(wg => {
        if (!groupToWordles[wg.groupId]) {
          groupToWordles[wg.groupId] = new Set();
        }
        groupToWordles[wg.groupId].add(wg.wordleId);
      });

      const userToWordles = {};
      studentGroups.forEach(sg => {
        const wordleIds = groupToWordles[sg.groupId];
        if (!wordleIds) return;
        if (!userToWordles[sg.userId]) {
          userToWordles[sg.userId] = new Set();
        }
        wordleIds.forEach(wid => userToWordles[sg.userId].add(wid));
      });

      const gameResultEntries = [];
      Object.entries(userToWordles).forEach(([userId, wordleSet]) => {
        wordleSet.forEach(wordleId => {
          gameResultEntries.push({
            userId: parseInt(userId),
            wordleId,
            score: Math.floor(Math.random() * 6) + 5,
            createdAt: new Date(now.getTime() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)),
            updatedAt: now,
          });
        });
      });


      console.log('Ejemplo de datos de GameResults:', gameResultEntries.slice(0, 5));
      await queryInterface.bulkInsert('game', gameResultEntries, {});
      console.log('Game results created.');
 
      console.log('--- Initial data seeding completed successfully for TFG presentation ---');
    },
 
    async down(queryInterface, Sequelize) {
      console.log('--- Reverting initial data seed for TFG presentation ---');
 
      await queryInterface.bulkDelete('game', null, {});
      await queryInterface.bulkDelete('wordle_group', null, {});
      await queryInterface.bulkDelete('question', null, {});
      await queryInterface.bulkDelete('word', null, {});
      await queryInterface.bulkDelete('student_group', null, {});
 
      await queryInterface.bulkDelete('wordle', null, {});
      await queryInterface.bulkDelete('group', null, {});
 
      await queryInterface.bulkDelete('user', null, {});
 
      console.log('--- Initial data seed reverted successfully ---');
    }
  };
