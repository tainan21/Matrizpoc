FROM node:22-alpine AS build
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json turbo.json ./
COPY tooling ./tooling
COPY packages ./packages
COPY prisma ./prisma
COPY apps/matriz-identity ./apps/matriz-identity
RUN pnpm install --frozen-lockfile --filter @matriz/app-matriz-identity...
RUN pnpm --filter @matriz/app-matriz-identity build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production PORT=8080
WORKDIR /workspace
USER node
COPY --from=build --chown=node:node /workspace/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/apps/matriz-identity ./apps/matriz-identity
COPY --from=build --chown=node:node /workspace/packages ./packages
COPY --from=build --chown=node:node /workspace/prisma ./prisma
COPY --from=build --chown=node:node /workspace/package.json /workspace/pnpm-workspace.yaml /workspace/tsconfig.base.json ./
EXPOSE 8080
CMD ["./node_modules/.bin/tsx", "apps/matriz-identity/src/server.ts"]
