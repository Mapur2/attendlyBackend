# Use the official Node.js image.
FROM node:21

# Create and change to the app directory.
WORKDIR /app

# Copy required files for postinstall script
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy remaining local code to the container image
COPY . .

# Run the web service on container startup.
CMD [ "node", "index.js" ]
