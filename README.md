#V-Chat P2P monorepo

## Build docker images for web and server

- docker build . --target web --tag web:latest
- docker build . --target server --tag server:latest

## Troubleshooting

- `connect_error`:

  https://socket.io/docs/v3/troubleshooting-connection-issues/#in-nodejs

# Run Locally

`pnpm install`

`pnpm run web dev`

`redis-server` (see [Redis](#redis))
`pnpm run server dev`

## Redis

- Run in foreground: `redis-server`

- Run in background: `brew services start redis`
- Check status: `brew services info redis`
- Stop background: `brew services stop redis`
