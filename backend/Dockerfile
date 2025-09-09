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
COPY supabase/migrations ./supabase/migrations
RUN chmod +x start.sh
COPY --from=frontend-build /frontend/dist/ ./public/
EXPOSE 3000
CMD ["./start.sh","node","server.js"]
