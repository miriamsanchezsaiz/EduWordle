
# Edu Wordle

Este proyecto es una plataforma educativa basada en Wordle, diseñada para mejorar el aprendizaje mediante juegos interactivos. La aplicación permite a profesores crear wordles personalizados con preguntas y palabras, organizar grupos de alumnos y realizar un seguimiento de su rendimiento. Los alumnos pueden jugar wordles asignados a sus grupos, respondiendo preguntas para mejorar su puntuación y competir en rankings.

La plataforma sigue una arquitectura modular, con un backend basado en Node.js, Express y una base de datos SQL en Docker, garantizando un sistema escalable y mantenible. 

## Características Principales
- **Autenticación y Autorización de Roles:**
Sistema seguro de inicio de sesión con roles diferenciados para Profesores y Alumnos, y protección de rutas mediante JWT (JSON Web Tokens).

- **Gestión de Wordles:**
    - **Creación y Edición:** Los profesores pueden diseñar Wordles personalizados, incluyendo palabras clave y preguntas asociadas (soporte para preguntas 
    de single selection o mulychoice).
    - **Eliminación Segura:** Eliminación de Wordles con cascada automática en la base de datos para todas sus palabras, preguntas y resultados de juego asociados.
    - **Asignación a Grupos:** Asigna Wordles específicos a uno o varios grupos para un acceso controlado por los alumnos.

- **Gestión de Grupos y Alumnos:**
    - **Creación de Grupos:** Los profesores pueden crear grupos de alumnos, asignando Wordles específicos a cada grupo.
    - **Asignación de Alumnos:** Los alumnos pueden ser asignados a grupos, permitiendo una gestión organizada y controlada del acceso a los Wordles. Además, en este punto, será donde se crearán los usuarios de los alumnos en la BD y se les enviará un correo electrónico de bienvenida con sus credenciales.
    - **Visualización de Datos:** Los profesores pueden ver el rendimiento de los alumnos en los Wordles asignados a sus grupos.
    - *Eliminación de Grupos:* Permite eliminar grupos, gestionando adecuadamente los estudiantes asociados (si no pertenecen a otros grupos, se eliminan de la BD).

- **Experiencia de Juego:**
    - **Interfaz Intuitiva:** Interfaz de usuario amigable y accesible, con un diseño responsivo que se adapta a diferentes dispositivos.
    - **Modo Daltonismo:** Un modo especial para mejorar la experiencia de jugadores con necesidades visuales específicas.
- **Resultados y Rankings:**
Almacenamiento persistente de los resultados de cada partida, permitiendo rankings individuales y grupales para poder obtener valores del desempeño de cada alumno.

- **Manejo de Errores:**
Implementación de una clase ApiError personalizada que lanza errores HTTP semánticos (por ejemplo, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 500 Internal Server Error) para una comunicación clara con el cliente.

- **Documentación de API con Swagger:**
Un archivo swagger.yaml que documenta todos los endpoints de la API, facilitando las pruebas y el consumo por parte de otros desarrolladores.

- **Configuración y Persistencia de Datos:**
    - **Docker:** Utiliza Docker para contenerizar la aplicación, facilitando el despliegue y la escalabilidad.
    - **Base de Datos SQL:** Utiliza MySQL como base de datos relacional para la persistencia de todos los datos.
    - **Sequelize ORM:** Manejo de la base de datos a través de Sequelize, con un sistema de migraciones para el control de versiones del esquema y seeders para la población inicial

    - **Transacciones Atómicas:** Operaciones complejas de la base de datos (como la creación o actualización de Wordles con sus componentes) se realizan dentro de transacciones para garantizar la atomicidad y consistencia de los datos.

- **Accesibilidad:**
Incluye un "Daltonismo mode toggle" en la interfaz de usuario para mejorar la experiencia de jugadores con distintas necesidades visuales.


## Estructura de carpetas
```plaintext
📦 EduWordle
│── 📂 .vscode/
│── |   ├── settings.jsom
│── 📂 backend/           # Lógica del servidor (Node.js, Express)
│   ├── 📂 .vscode/        # No sabemos si hay que eliminar esta carpeta
│   │   ├── settings.json  # Aquí se declara el puerto donde queríamos que se ejecutase el liveserver
|   |
│   ├── 📂 config/       # configuración de entorno para docker
│   │   ├── config.js
|   |
│   ├── 📂 docs/        
|   │   ├── 📂 api/              # Documentación de la API   
|   │   │   ├── swagger.yaml  
|   |
│   ├── 📂 migrations/       # Scripts para la creación y evolución del esquema de la base de datos
│   ├── 📂 models/           # Scripts para la población inicial de datos en la base de datos
|   |   
│   ├── 📂 seeders/        
│   │   ├── seed.js
|   |
|   │── 📂 node_modules/      # Dependencias de Node.js  
|   |
|   │── 📂 src/
|   │   ├── 📂 api/        
|   |   │   ├── 📂 controllers/       # Manejadores de rutas que procesan peticiones HTTP
|   |   │   │   ├── authController.js
|   |   │   │   ├── studentController.js
|   |   │   │   ├── teacherController.js  
|   |   |   |
|   |   │   ├── 📂 middlewares/       # Funciones intermedias para autenticación, autorización, validación y manejo de errores
|   |   │   │   ├── authMiddleware.js
|   |   │   │   ├── errorHandler.js
|   |   │   │   ├── userValidation.js
|   |   |   |
|   |   │   ├── 📂 models/        # Definiciones de los modelos de Sequelize y sus asociaciones
|   |   │   │   ├── gameResult.js
|   |   │   │   ├── group.js
|   |   │   │   ├── index.js       # Archivo principal de modelos y asociaciones 
|   |   │   │   ├── question.js
|   |   │   │   ├── studentGroup.js
|   |   │   │   ├── user.js    
|   |   │   │   ├── word.js  
|   |   │   │   ├── wordle.js 
|   |   │   │   ├── wordleGroup.js
|   |   |   |
|   |   │   ├── 📂 routes/     # Definiciones de las rutas de la API (endpoints) 
|   |   │   │   ├── authRoutes.js  
│   │   |   |   ├── index.js     # Ruta principal que agrupa todas las sub-rutas
│   │   |   |   ├── teacherRoutes.js
│   │   |   |   ├── studentRoutes.js
│   │   |   |   
|   |   │   ├── 📂 services/        # Lógica de negocio, interacción con la base de datos y gestión de transacciones
|   |   │   │   ├── authService.js
|   |   │   │   ├── emailService.js
|   |   │   │   ├── gameService.js
|   |   │   │   ├── index.js
|   |   │   │   ├── testEmailSender.js 
|   |   │   │   ├── userService.js
|   |   │   │   ├── groupService.js
|   |   │   │   ├── wordleService.js
│   │   |   
|   │   ├── 📂 config/
|   |   │   ├── database.js  # Configuración de conexión a MySQL
|   |   |
|   │   ├── 📂 utils/      # Utilidades varias para el backend
|   |   │   ├── 📂 email/ 
|   |   │   |   ├── 📂 img
|   |   │   |   |   ├── header.png
|   |   │   |   |   
|   |   │   |   ├── 📂 templates
|   |   │   |   |   ├── welcome.html
|   |   │   |   |   ├── welcomePlain.txt
|   |   |   |  
|   |   │   ├── ApiError.js             # Clase para errores HTTP personalizados (usa factory method)
|   |   │   ├── generateFrontendConfig.js
|   |   │   ├── passwordUtils.js
│   │ 
│   ├── 📜 .babelrc
│   ├── 📜 .sequelizerc
│   ├── 📜 .env           # Variables de entorno para el backend (no incluidas en el control de versiones)
│   ├── 📜 app.js         # Configuración principal de la aplicación Express y enrutamiento
│   ├── 📜 docker-entrypoint.sh   # Script de entrada para el contenedor Docker del backend
│   ├── 📜 Dockerfile    # Definición del contenedor Docker para el backend
│   ├── 📜 index.js      # Punto de entrada principal para el servidor Node.js
│   ├── 📜 package-lock.json
│   ├── 📜 package.json  
│
│── 📂 frontend/          # Interfaz de usuario (HTML, CSS, JS)
│   ├── 📂 assets/        
│   │   ├── 📂 css/       # Estilos de la UI
│   │   ├── 📂 img/       # Imágenes e iconos 
│   │   ├── 📂 js/        # Scripts de la aplicación
│   ├── 📜 classifications.html    # Pantalla de rankings por grupo o wordle
│   ├── 📜 settings.html      # Pantalla de configuración de contraseña
│   ├── 📜 dashboard.html     # Panel de profesores/alumnos
│   ├── 📜 groupEditor.html       # Pantalla de edición//visualización/creación de grupo
│   ├── 📜 game.html      # Pantalla del juego
│   ├── 📜 init.html      # Pantalla del inicio de la aplicación
│   ├── 📜 list.html      # Pantalla de listas de wordles y grupos
│   ├── 📜 login.html     # Pantalla de inicio de sesión
│   ├── 📜 popups.html      # Templates de popups
│   ├── 📜 wordleEditor.html    # Pantalla de edición/visualización/creación de worlde
│
├── 📜 .env            # Variables de entorno globales para Docker Compose 
├── 📜 .gitignore
├── 📜 docker-compose.yml  # Configuración para la orquestación de contenedores Docker (backend, DB)
│── 📜 package.json       # Dependencias y configuración del proyecto  
│── 📜 README.md          # Documentación del proyecto 

```
## Cómo ejecutar el proyecto

Para poner en marcha **EduWordle** en tu entorno local, necesitarás tener **Docker** y **Docker Compose** instalados.

### 1. Clonar el Repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd EduWordle
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env` en el directorio raíz del proyecto (`./EduWordle/.env`) y otro en el directorio `backend` (`./EduWordle/backend/.env`).

#### `./EduWordle/.env` (ejemplo):

```env
MYSQL_ROOT_PASSWORD=your_mysql_root_password
MYSQL_DATABASE=eduwordle
MYSQL_USER=user
MYSQL_PASSWORD=password
BACKEND_PORT=3000
FRONTEND_PORT=80
```

#### `./EduWordle/backend/.env` (ejemplo):

```env
DB_HOST=db
DB_USER=user
DB_PASSWORD=password
DB_NAME=eduwordle
DB_PORT=3306
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1h
EMAIL_SERVICE_ENABLED=false
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
```

> ⚠️ **Importante:** Ajusta las contraseñas y claves secretas a valores seguros y diferentes en tu entorno de producción.

### 3. Construir y Ejecutar los Contenedores Docker

Desde el directorio raíz del proyecto (`./EduWordle`):

```bash
docker-compose up --build
```

Este comando:

- Construirá las imágenes Docker para el backend y la base de datos.
- Creará y levantará los contenedores.
- Ejecutará las migraciones para crear el esquema.
- Ejecutará las semillas para poblar la base de datos inicial.
- Iniciará el servidor backend y el frontend.

### 4. Acceder a la Aplicación

- **Frontend:** [http://localhost:80](http://localhost:80)  
- **API (Swagger UI):** [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

---
## Limpiar Entorno de Desarrollo (Borrar Datos)

Si se necesita reiniciar la base de datos o se experimentan problemas de inconsistencia:

```bash
# Detener y eliminar contenedores, redes y volúmenes
docker-compose down -v
```

Opcionalmente, puedes eliminar imágenes:

```bash
# Eliminar imágenes específicas
docker rmi eduwordle_backend eduwordle_db

# O eliminar todas las imágenes no utilizadas
docker rmi $(docker images -q) -f
```

Después de limpiar, vuelve a ejecutar:

```bash
docker-compose up --build
```

Para ver los logs de los contenedores en tiempo real, puedes usar:

```bash 
docker-compose logs -f
```

---

## Endpoints de la API (Resumen)

### Autenticación (`/api/auth`)

- `POST /login`: Inicio de sesión.
- `POST /logout`: Cierre de sesión.
- `POST /create-user`: **(SOLO DEV/TEST)** Crear usuarios.

### Funcionalidades de Alumno (`/api/student`) — Requiere JWT con rol `student`

- `PUT /change-password`: Cambiar contraseña.
- `GET /groups/active`: Grupos activos del alumno.
- `GET /groups/:groupId`: Detalles de grupo.
- `GET /wordles/accessible`: Wordles accesibles.
- `GET /wordles/:wordleId/game-data`: Datos para jugar.
- `POST /games/:wordleId/save-result`: Guardar resultado.

### Funcionalidades de Profesor (`/api/teacher`) — Requiere JWT con rol `teacher`

#### Gestión de contraseña

- `PUT /change-password`: Cambiar contraseña.

#### Gestión de Grupos

- `POST /groups`: Crear grupo.
- `GET /groups`: Listar grupos.
- `GET /groups/:groupId`: Detalles de grupo.
- `PUT /groups/:groupId`: Actualizar grupo.
- `DELETE /groups/:groupId`: Eliminar grupo.

#### Gestión de Wordles

- `GET /wordles`: Listar Wordles.
- `POST /wordles`: Crear Wordle.
- `GET /wordles/:wordleId`: Detalles de Wordle.
- `PUT /wordles/:wordleId`: Actualizar Wordle.
- `DELETE /wordles/:wordleId`: Eliminar Wordle.

#### Resultados de Juego

- `GET /game-results/student/:userId`: Resultados de un alumno.
- `GET /game-results/wordle/:wordleId`: Resultados de un Wordle.
- `GET /game-results/group/:groupId`: Resultados de un grupo.
- `GET /game-results/:gameResultId`: Detalle de un resultado.

---

## Tecnologías Utilizadas

### Backend

- **Node.js**: Entorno de ejecución.
- **Express.js**: Framework web.
- **Sequelize ORM**: ORM para MySQL.
- **MySQL**: Base de datos relacional.
- **bcryptjs**: Hashing de contraseñas.
- **jsonwebtoken**: Tokens JWT.
- **express-validator**: Validación.
- **Nodemailer**: Envío de emails.

### Contenerización

- **Docker**: Contenedores.
- **Docker Compose**: Orquestación multi-contenedor.

### Frontend

- **HTML5**
- **CSS3**
- **JavaScript (vanilla)**

---

## Normas de Desarrollo

- Todo el código estará en **inglés**.
- Se usará **CamelCase** para nombrar variables y funciones.
- Se evitarán tildes y caracteres especiales.

## DeepWiki
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/miriamsanchezsaiz/EduWordle)