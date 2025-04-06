
# Edu Wordle

Este proyecto es una plataforma educativa basada en Wordle, diseñada para mejorar el aprendizaje mediante juegos interactivos. La aplicación permite a profesores crear wordles personalizados con preguntas y palabras, organizar grupos de alumnos y realizar un seguimiento de su rendimiento. Los alumnos pueden jugar wordles asignados a sus grupos, respondiendo preguntas para mejorar su puntuación y competir en rankings.

La plataforma sigue una arquitectura modular, con un backend basado en Node.js, Express y una base de datos SQL en Docker, garantizando un sistema escalable y mantenible. 


## Notas 
- Todas las funciones y variables se escribirán en **inglés** para evitar problemas con acentos y caracteres especiales
- Para nombrar funciones y variables usaremos **CamelCase**
- ...
## Características

- Autenticación de usuarios (Administrador, Profesor, Alumno)
- Gestión de wordles (creación, edición, eliminación, importación desde XML/CSV)
- Gestión de grupos (creación, eliminación, gestión de alumnos)
- Asignación de wordles a grupos
- Generación automática de contraseñas para nuevos alumnos
- Rankings individuales y grupales basados en el desempeño en wordles
- Persistencia de datos en SQL con Docker
- Interfaz web interactiva desarrollada con HTML, CSS y JavaScript
- Daltonismo mode toggle



## Estructura de carpetas
```plaintext
📦 EduWordle
│── 📂 frontend/          # Interfaz de usuario (HTML, CSS, JS)
│   ├── 📂 assets/        
│   │   ├── 📂 css/       # Estilos de la UI
│   │   ├── 📂 img/       # Imágenes e iconos 
│   │   ├── 📂 js/        # Scripts de la aplicación
│   ├── 📜 config.html      # Pantalla de configuración de contraseña
│   ├── 📜 dashboard.html     # Panel de profesores/alumnos
│   ├── 📜 groupEditor.html       # Pantalla de edición//visualización/creación de grupo
│   ├── 📜 index.html      # Pantalla del juego
│   ├── 📜 init.html      # Pantalla del inicio de la aplicación
│   ├── 📜 list.html      # Pantalla de listas de wordles y grupos
│   ├── 📜 login.html     # Pantalla de inicio de sesión
│   ├── 📜 popups.html      # Templates de popups
│   ├── 📜 wordleEditor.html    # Pantalla de edición/visualización/creación de worlde
│
│── 📂 backend/           # Lógica del servidor (Node.js, Express)
│   ├── 📂 utils/        # Declaración de clases usables (Game es algo así como sesión)
│   │   ├── Game.js
│   │   ├── Group.js
│   │   ├── Question.js
│   │   ├── Session.js
│   │   ├── Student.js    
│   │   ├── Word.js  
│   │   ├── Wordle.js 
│   │  
│   ├── 📂 routes/      # Lógica de negocio y rutas server -> definirán las actuaciones del server según la request (post, get, put, delete...) 
│   │   ├── AuthRoutes.js  
│   │   ├── GameRoutes.js  
│   │   ├── TeacherRoutes.js
│   │   ├── StudentRoutes.js
│   │   ├── RankingRoutes.js   
│   │  
│   ├── 📂 persistence/    # Acceso a la base de datos
│   │   ├── UserPersistence.js  
│   │   ├── GamePersistence.js  
│   │   ├── WordlePersistence.js  
│   │  
│   ├── 📜 server.js      # Configuración del servidor ^
│   ├── 📜 routes.js      # Rutas de la API (en caso de que haya que programar server : puerto por el que el servidor está escuchando)
│   ├── 📜 app.js         # Configuración de Express (declarar rutas y usar -> const authRoutes = require('./routes/auth'); + app.use('/auth', authRoutes);) 
│
│── 📂 database/          # *** Base de datos y configuración Docker ***
│   ├── 📜 init.sql       # Script de creación de tablas
│   ├── 📜 docker-compose.yml  # Configuración de contenedores
│
│── 📂 node_modules/      
│
│── 📜 package-lock.json    
│── 📜 package.json       # Dependencias y configuración del proyecto  
│── 📜 README.md          # Documentación del proyecto 
│── 📜 .env               # Variables de entorno  
│── 📜 .gitignore         # Archivos a ignorar en Git   

```


## Preguntas para Dani o en general

#### Question 1

Answer 1

#### Question 2

Answer 2


## Iniciar Servidor

Para iniciar el servidor, ejecuta el siguiente comando en Visual Studio Code:

```bash
  npx live-server 
```
En caso de no tener instalado live-server, ejecuta el siguiente comando:

```bash
  npm install -g live-server
```
