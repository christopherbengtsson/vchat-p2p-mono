# V-Chat P2P monorepo

[![Netlify Status](https://api.netlify.com/api/v1/badges/10d8abbf-5070-453e-91bf-717a0e1699ac/deploy-status)](https://app.netlify.com/sites/vchat-client/deploys)

## Run Locally

### Prerequisites

- Node
- pnpm
- Docker + docker compose

Install dependencies:

```zsh
pnpm install
```

Build local libraries:

```zsh
pnpm --filter "./packages/*" build
```

Run server:

```zsh
pnpm run server dev
```

Run client:

```zsh
pnpm run web dev
```

# Monitoring

[Grafana](https://pineanas.grafana.net)
