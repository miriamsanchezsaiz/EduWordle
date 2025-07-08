# backend/Dockerfile

# backend/Dockerfile
FROM node:18-alpine AS builder

RUN apk add --no-cache \
        netcat-openbsd \
        bash

WORKDIR /app/backend

COPY backend/package*.json ./

RUN npm ci --omit=dev

COPY backend/. .

FROM node:18-alpine

WORKDIR /app/backend

COPY --from=builder /app/backend /app/backend

RUN npm install -g sequelize-cli

COPY backend/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production

EXPOSE 5000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
