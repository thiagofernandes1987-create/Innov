FROM node:24-alpine AS build
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.15.0 --activate
COPY package.json pnpm-lock.yaml tsconfig.json ./
COPY apps/messaging-gateway ./apps/messaging-gateway
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm exec tsc -p apps/messaging-gateway/tsconfig.json

FROM node:24-alpine AS runtime
RUN addgroup -S -g 10001 gateway && adduser -S -D -H -u 10001 -G gateway gateway
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=10001:10001 /workspace/apps/messaging-gateway/dist ./dist
USER 10001:10001
EXPOSE 8787
STOPSIGNAL SIGTERM
CMD ["node", "dist/index.js"]
