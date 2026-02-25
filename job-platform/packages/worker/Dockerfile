FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/worker/package.json packages/worker/package.json

RUN npm ci

FROM deps AS build

COPY packages/shared packages/shared
COPY packages/worker packages/worker

RUN npm run build -w @jp/shared && npm run build -w @jp/worker

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/packages/worker/dist ./dist
COPY --from=build /app/packages/worker/package.json ./package.json

CMD ["node", "dist/index.js"]
