
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
│   ├── 📜 ranking.html   # Pantallas de rankings grupo/wordle
│   ├── 📜 login.html     # Pantalla de inicio de sesión
│   ├── 📜 game.html      # Pantalla del juego
│   ├── 📜 dashboard.html # Panel de profesores/alumnos
│   ├── 📜 wordle.html    # Pantalla de edición/creación de worlde
│   ├── 📜 group.html     # Pantalla de edición/creación de grupo
│
│── 📂 backend/           # Lógica del servidor (Node.js, Express)
│   ├── 📂 models/        # Declaración de clases 
│   │   ├── User.js  
│   │   ├── Game.js  
│   │   ├── Wordle.js  
│   │  
│   ├── 📂 controllers/   # Controladores (manejo de peticiones HTTP)
│   │   ├── UserController.js  
│   │   ├── GameController.js  
│   │   ├── WordleController.js  
│   │  
│   ├── 📂 services/      # Lógica de negocio
│   │   ├── AuthService.js  
│   │   ├── GameService.js  
│   │   ├── WordleService.js  
│   │  
│   ├── 📂 persistence/    # Acceso a la base de datos
│   │   ├── UserPersistence.js  
│   │   ├── GamePersistence.js  
│   │   ├── WordlePersistence.js  
│   │  
│   ├── 📜 server.js      # Configuración del servidor  
│   ├── 📜 routes.js      # Rutas de la API (en caso de que haya que  programar server)
│   ├── 📜 app.js         # Configuración de Express  
│
│── 📂 database/          # *** Base de datos y configuración Docker ***
│   ├── 📜 init.sql       # Script de creación de tablas
│   ├── 📜 docker-compose.yml  # Configuración de contenedores
│
│── 📂 node_modules/      # ********** Ni idea ***********
│
│── 📜 package-lock.json  # ********** Ni idea ***********  
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