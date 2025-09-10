FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend .
COPY supabase/migrations ./supabase/migrations
RUN chmod +x start.sh
EXPOSE 3000
CMD ["./start.sh","node","server.js"]
