FROM node:22.14.0-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g corepack@latest && corepack enable pnpm

FROM base AS build
# Install build dependencies needed for native modules
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*
COPY . /usr/src/app
WORKDIR /usr/src/app

# Install dependencies without redis-memory-server postinstall to avoid binary download
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    REDISMS_DISABLE_POSTINSTALL=1 \
    pnpm install --frozen-lockfile --ignore-scripts

RUN pnpm --filter=server^... --filter=server run build
RUN pnpm deploy --filter=server --prod /prod/server

FROM base
# Install curl for health checks (needed by deployment scripts)
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
COPY --from=build /prod/server /app
WORKDIR /app
EXPOSE 8000
CMD [ "pnpm", "start" ]
