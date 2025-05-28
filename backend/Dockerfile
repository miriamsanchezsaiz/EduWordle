# backend/Dockerfile

FROM node:18-slim

WORKDIR /app/backend

RUN apt-get update && \
    apt-get install -y netcat-openbsd && \
    rm -rf /var/lib/apt/lists/*


COPY backend/package.json ./
COPY backend/package-lock.json ./


RUN npm cache clean --force && npm install
RUN npm install -g sequelize-cli
    
# Vuelve a copiar el código fuente
COPY backend/. ./

# Copia el entrypoint script
COPY backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# Dale permisos de ejecución
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["docker-entrypoint.sh"]
# Si tenías un CMD separado, vuelve a ponerlo también
CMD ["npm", "start"]