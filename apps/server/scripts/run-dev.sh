#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARN:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ERROR:${NC} $1"
}

# Cleanup function for graceful shutdown
cleanup() {
    echo ""
    log "Shutting down development environment..."
    
    # Kill the dev server if it's running
    if [[ -n "${SERVER_PID:-}" ]]; then
        log "Stopping development server (PID: $SERVER_PID)..."
        kill -TERM "$SERVER_PID" 2>/dev/null || true
        wait "$SERVER_PID" 2>/dev/null || true
    fi
    
    log "Development environment stopped."
    exit 0
}

# Set up signal handlers for graceful shutdown
trap cleanup SIGINT SIGTERM

log "Starting VChat development environment..."

# Change to server directory if not already there
cd "$(dirname "$0")/.."

# Start dependencies
log "Starting Docker services (Redis + Cap.js)..."
docker compose -f docker-compose-dev.yml up -d

# Wait for Redis to be ready
log "Waiting for Redis to start..."
REDIS_READY=false
REDIS_ATTEMPTS=0
MAX_REDIS_ATTEMPTS=30

while [[ "$REDIS_READY" == "false" && $REDIS_ATTEMPTS -lt $MAX_REDIS_ATTEMPTS ]]; do
    if docker exec server-redis-1 redis-cli ping >/dev/null 2>&1; then
        REDIS_READY=true
        log "Redis is ready!"
    else
        ((REDIS_ATTEMPTS++))
        echo -n "."
        sleep 1
    fi
done

if [[ "$REDIS_READY" == "false" ]]; then
    error "Redis failed to start after $MAX_REDIS_ATTEMPTS seconds"
    exit 1
fi

# Flush Redis database
log "Flushing Redis database..."
docker exec server-redis-1 redis-cli flushall

# Wait for Cap.js service to be ready
log "Waiting for Cap.js service to start..."
CAP_READY=false
CAP_ATTEMPTS=0
MAX_CAP_ATTEMPTS=30

while [[ "$CAP_READY" == "false" && $CAP_ATTEMPTS -lt $MAX_CAP_ATTEMPTS ]]; do
    if curl -f -s http://localhost:8001/ >/dev/null 2>&1; then
        CAP_READY=true
        log "Cap.js service is ready!"
    else
        ((CAP_ATTEMPTS++))
        echo -n "."
        sleep 1
    fi
done

if [[ "$CAP_READY" == "false" ]]; then
    warn "Cap.js service not responding after $MAX_CAP_ATTEMPTS seconds, but continuing..."
fi

log "All dependencies ready. Starting development server..."
log "Press Ctrl+C to stop the development environment"

# Start the development server and capture its PID
pnpm run dev:server &
SERVER_PID=$!

# Wait for the server process
wait $SERVER_PID
