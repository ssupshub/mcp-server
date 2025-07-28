FROM node:18-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY ./dist ./dist
COPY src ./src

# Set production environment
ENV NODE_ENV=production
EXPOSE 3000

# Start the server
CMD ["node", "dist/index.js"]
