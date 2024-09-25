#V-Chat P2P monorepo

## Build docker images for web and server

- docker build . --target web --tag web:latest
- docker build . --target server --tag server:latest

## Troubleshooting

- `connect_error`:

  https://socket.io/docs/v3/troubleshooting-connection-issues/#in-nodejs
