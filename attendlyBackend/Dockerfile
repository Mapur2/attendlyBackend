FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=build /app /app
EXPOSE 3001
CMD ["node", "index.js"]


