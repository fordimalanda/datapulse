FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY apps/gateway/package*.json ./apps/gateway/

RUN npm install

COPY shared/proto ./shared/proto
COPY apps/gateway ./apps/gateway

WORKDIR /app/apps/gateway

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]