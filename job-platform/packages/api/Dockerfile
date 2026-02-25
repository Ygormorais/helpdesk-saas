FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/api/package.json packages/api/package.json

RUN npm ci

FROM deps AS build

COPY packages/shared packages/shared
COPY packages/api packages/api

RUN npm run build -w @jp/shared && npm run build -w @jp/api

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/packages/api/dist ./dist
COPY --from=build /app/packages/api/prisma ./prisma
COPY --from=build /app/packages/api/package.json ./package.json

EXPOSE 4010

CMD ["node", "dist/index.js"]
