FROM node:22.13.1-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@9.8

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter=server^... --filter=server run build
RUN pnpm deploy --filter=server --prod /prod/server

FROM base
COPY --from=build /prod/server /app
WORKDIR /app
EXPOSE 8000
CMD [ "pnpm", "start" ]
