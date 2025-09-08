FROM node:18-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend .
COPY --from=frontend-build /frontend/dist/ ./public/
EXPOSE 3000
ENTRYPOINT ["./start.sh"]
CMD ["node","server.js"]
