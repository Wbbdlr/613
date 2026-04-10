FROM node:20-alpine AS frontend-build
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

COPY app/package.json ./package.json
RUN apk add --no-cache python3 make g++
RUN npm install --omit=dev

COPY app/src ./src
COPY hebcal-service/src ./hebcal-service/src
COPY sefaria-service/src/textStore.js ./legacy/textStore.js
COPY --from=frontend-build /src/frontend/dist ./public

ENV PORT=8613
EXPOSE 8613

CMD ["npm", "start"]