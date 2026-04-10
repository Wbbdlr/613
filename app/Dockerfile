FROM node:20-alpine AS frontend-build
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

COPY app/package.json ./package.json
RUN npm install --omit=dev

COPY app/src ./src
COPY hebcal-service/src ./hebcal-service/src
COPY sefaria-service/src ./sefaria-service/src
COPY --from=frontend-build /src/frontend/dist ./public

ENV PORT=8613
EXPOSE 8613

CMD ["npm", "start"]