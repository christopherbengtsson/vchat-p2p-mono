FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
# RUN apt-get update && apt-get install -y make gcc g++

FROM base AS deps
WORKDIR /usr/src/app
COPY pnpm-lock.yaml ./
RUN pnpm fetch --ignore-scripts

FROM deps AS builder
COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm --filter server... run build

FROM base AS server
WORKDIR /app
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /usr/src/app/packages/common-dto/package.json ./packages/common-dto/package.json
COPY --from=builder /usr/src/app/packages/common-dto/dist ./packages/common-dto/dist
COPY --from=builder /usr/src/app/apps/server/package.json ./apps/server/package.json
COPY --from=builder /usr/src/app/apps/server/dist ./apps/server/dist
WORKDIR /app/apps/server
RUN pnpm install --prod --ignore-scripts
EXPOSE 8001
CMD [ "pnpm", "start" ]