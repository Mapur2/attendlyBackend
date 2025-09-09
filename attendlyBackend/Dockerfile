FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Install and configure Redis server
RUN apk add --no-cache redis
RUN mkdir -p /var/lib/redis

COPY --from=build /app /app
EXPOSE 3001
CMD ["sh", "-c", "redis-server --daemonize yes && node index.js"]


