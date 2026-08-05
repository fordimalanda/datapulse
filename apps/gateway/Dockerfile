# apps/gateway/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY apps/gateway/package*.json ./apps/gateway/
RUN npm install

COPY shared/proto ./shared/proto
COPY apps/gateway ./apps/gateway

# Génération du client Prisma
WORKDIR /app/apps/gateway
RUN npx prisma generate

RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start:prod"]