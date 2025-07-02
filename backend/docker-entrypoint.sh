#!/bin/sh

echo "Waiting for MySQL database..."
until nc -z -w 5 db 3306; do
  echo "MySQL is unavailable - sleeping"
  sleep 2
done

echo "MySQL is up - executing migrations"

# --- REVISION DE LA CARGA DE .env ---
if [ -f "/app/backend/.env" ]; then
  echo "Loading .env variables..."
  # Lee cada línea del archivo .env
  while IFS= read -r line || [ -n "$line" ]; do 
    # Ignorar líneas vacías o que comienzan con '#'
    if [ -z "$line" ] || [ "${line#\#}" != "$line" ]; then
      continue
    fi
    # Si la línea contiene '=', es una asignación de variable
    if echo "$line" | grep -q "="; then
      # Asegura que la variable se exporta correctamente, manejando espacios y comillas
      export "$line"
    fi
  done < "/app/backend/.env"
  echo ".env variables loaded."
else
  echo "Warning: .env file not found at /app/backend/.env"
fi

# Ejecutar las migraciones
/usr/local/bin/npm exec sequelize-cli db:migrate

echo "Executing database seeds..."
/usr/local/bin/npm exec sequelize-cli db:seed:all

echo "Starting Node.js application"
# Asegúrate de que NODE_ENV se establece aquí si no está en .env o si quieres sobrescribir
export NODE_ENV=production

# Ejecutar el script prestart.
node ./src/utils/generateFrontendConfig.js
npm run prestart
# Iniciar la aplicación Node.js
exec npm start
