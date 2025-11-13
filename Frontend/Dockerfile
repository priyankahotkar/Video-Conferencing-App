FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

EXPOSE 5173

# Start Vite dev server and listen on all interfaces so host can access it
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
