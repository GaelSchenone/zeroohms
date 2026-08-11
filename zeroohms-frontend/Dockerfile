# Build del frontend
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime: sirve dist/ y el proxy de YouTube API (server.mjs)
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY server.mjs ./
EXPOSE 5174
CMD ["node", "server.mjs"]
