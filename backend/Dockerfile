FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
ENTRYPOINT ["./start.sh"]
CMD ["node","server.js"]
