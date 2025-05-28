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
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --no-optional
RUN pnpm --filter=server^... --filter=server run build
RUN pnpm deploy --filter=server --prod /prod/server

FROM base
# Install curl for health checks (needed by deployment scripts)
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
COPY --from=build /prod/server /app
WORKDIR /app
EXPOSE 8000
CMD [ "pnpm", "start" ]
