# Use the Alpine variant for a significantly smaller image footprint
FROM node:21-alpine

# Set the environment to production
ENV NODE_ENV=production

# Create and change to the app directory
WORKDIR /app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Use 'npm ci' for a clean, predictable production install
RUN npm ci --only=production

# Copy the remaining local code to the container image
COPY . .

# Run the web service as a non-root user for better security
USER node

# Run the web service on container startup
CMD [ "node", "index.js" ]