# Build del admin
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime: sirve dist/ y el proxy hacia el backend (server.mjs)
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY server.mjs ./
EXPOSE 5176
CMD ["node", "server.mjs"]
