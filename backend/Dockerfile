ARG NODE_VERSION=24-alpine

FROM node:${NODE_VERSION} AS base
WORKDIR /app
ENV PATH=/app/node_modules/.bin:${PATH}
COPY package.json package-lock.json ./

FROM base AS dependencies
RUN npm ci

FROM dependencies AS development
ENV NODE_ENV=development
COPY --chown=node:node . .
USER node
CMD ["node", "--watch", "src/server.js"]

FROM development AS test
ENV NODE_ENV=test
CMD ["npm", "run", "test:all"]

FROM dependencies AS migrate
COPY --chown=node:node migrations ./migrations
USER node
CMD ["npm", "run", "migrate:up"]

FROM base AS production-dependencies
RUN npm ci --omit=dev && npm cache clean --force

FROM node:${NODE_VERSION} AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node src ./src
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
