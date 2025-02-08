#!/bin/bash

# If running in CI, assume Redis is provided by a service container.
if [ -z "$CI" ]; then
  # Start Redis server in the background
  redis-server &
  REDIS_PID=$!

  # Wait for Redis server to start
  sleep 1

  # Run Redis FLUSHALL command to clear all data
  redis-cli flushall
fi

# Start the development server
npm run dev:server

# If we started Redis locally, kill it when the dev server stops.
if [ -n "$REDIS_PID" ]; then
  kill $REDIS_PID
fi
