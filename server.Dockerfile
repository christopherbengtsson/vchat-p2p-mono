FROM node:22.10-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# https://github.com/pnpm/pnpm/issues/9029#issuecomment-2629866277
RUN npm i -g corepack@latest

RUN corepack enable

FROM base AS deps
WORKDIR /usr/src/app
COPY pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch --ignore-scripts

FROM deps AS builder
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm --filter server... run build
RUN pnpm deploy --filter server --prod /prod/server

FROM base AS server
COPY --from=builder /prod/server /app
WORKDIR /app
EXPOSE 8000
CMD [ "pnpm", "start" ]
