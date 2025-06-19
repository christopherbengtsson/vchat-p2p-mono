#!/bin/bash

# Track if cleanup has already run
CLEANUP_DONE=0

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

# Trap function to handle signals
cleanup() {
  # Prevent running cleanup multiple times
  if [ $CLEANUP_DONE -eq 1 ]; then
    return 0
  fi
  CLEANUP_DONE=1
  
  echo "Shutting down gracefully..."
  
  # Kill the Node.js process first with SIGINT to allow graceful shutdown
  if [ -n "$NODE_PID" ] && kill -0 $NODE_PID 2>/dev/null; then
    echo "Sending SIGINT to Node.js process $NODE_PID..."
    kill -SIGINT $NODE_PID
    
    # Wait for up to 10 seconds for Node.js to exit gracefully
    timeout=10
    while kill -0 $NODE_PID 2>/dev/null && [ $timeout -gt 0 ]; do
      echo "Waiting for Node.js process to exit... ${timeout}s remaining"
      sleep 1
      ((timeout--))
    done
    
    # Force kill if it didn't exit
    if kill -0 $NODE_PID 2>/dev/null; then
      echo "Node.js process didn't exit in time, force killing..."
      kill -9 $NODE_PID
    fi
  fi
  
  # Now shut down Redis
  if [ -n "$REDIS_PID" ] && kill -0 $REDIS_PID 2>/dev/null; then
    echo "Shutting down Redis server..."
    kill $REDIS_PID
    wait $REDIS_PID 2>/dev/null
  fi
  
  echo "Cleanup complete"
  exit 0
}

# Set up signal traps
trap cleanup SIGINT SIGTERM

# Start the development server and capture its PID
npm run dev:server &
NODE_PID=$!

# Wait for the development server to finish
wait $NODE_PID

# If the script reaches here normally, also perform cleanup
cleanup
