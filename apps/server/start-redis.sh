#!/bin/bash

# Start Redis server in the background
redis-server &

# Save the PID of the Redis server
REDIS_PID=$!

# Wait for Redis server to start
sleep 1

# Run Redis FLUSHALL command to clear all data
redis-cli flushall

# Start the development server
npm run dev:server

# When the dev server stops, kill the Redis server
kill $REDIS_PID
