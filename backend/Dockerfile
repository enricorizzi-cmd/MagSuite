FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend .
COPY --from=frontend-build /frontend/dist/ ./public/
EXPOSE 3000
CMD ["node","server.js"]
