# V-Chat P2P monorepo

[![Netlify Status](https://api.netlify.com/api/v1/badges/10d8abbf-5070-453e-91bf-717a0e1699ac/deploy-status)](https://app.netlify.com/sites/vchat-client/deploys)

## Run Locally

`pnpm install`

### Web app

`pnpm run web dev`

### NodeJS server

`redis-server` (see [Redis](#redis))

`pnpm run server dev`

### Redis

- Run in foreground: `redis-server`

- Run in background: `brew services start redis`
- Check status: `brew services info redis`
- Stop background: `brew services stop redis`

# Monitoring

[Grafana](https://pineanas.grafana.net)
