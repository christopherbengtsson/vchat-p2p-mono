# Matchmaking System

This module implements a distributed, concurrency-safe matchmaking system for P2P video chat, using Redis for persistence and BullMQ for job processing.

## Architecture Overview

The matchmaking system consists of these key components:

- **Queue Management**: Handles adding/removing users from a Redis sorted set
- **Atomic Operations**: Ensures concurrency safety with Redis Lua scripts
- **Matching Algorithm**: Efficient O(n) matching with ignore constraints
- **Match Assignments**: Stores active matches for recovery and resilience
- **Socket Notifications**: Notifies matched users with WebRTC roles
- **Maintenance Jobs**: Ensures system health and recovers from failures

## Matchmaking Flow

### Phase 1: Queue Entry

1. **Client initiates matchmaking**

   ```typescript
   // Client-side code
   socket.emit('find-match', socket.id, userId);
   ```

2. **Server handles request**
   - `MatchmakingController` processes the socket event
   - Adds user to appropriate region queue in Redis
   - User is stored in sorted set with timestamp as score
   - User is registered in global tracking set

### Phase 2: Periodic Processing

3. **Matchmaking job triggers**

   - BullMQ scheduler runs `processQueue` periodically
   - Each job receives a unique worker ID for tracking

4. **Worker claims users atomically**

   - Uses Redis Lua script to prevent race conditions
   - Claims have a TTL to prevent deadlocks if worker crashes
   - Early exit if fewer than 2 users are available

5. **Ignore relationships retrieved**

   - System fetches pre-computed ignore matrix
   - Priority users are identified (e.g., waiting longer)
   - Optimized data structures ensure O(1) lookup performance

6. **Matching algorithm runs**
   - Users are sorted by priority
   - FIFO-based pairing with ignore constraints
   - Creates matches with unique room IDs
   - O(n) time complexity with efficient ignore lookups

### Phase 3: Match Processing

7. **Atomic match processing**

   - Matched users are removed from queue
   - Match assignments are stored in Redis
   - Operations batched for efficiency
   - All steps performed atomically via Lua scripts

8. **Real-time notifications**

   - Socket.IO events sent to matched users
   - Each user receives:
     - Room ID for joining
     - Partner's socket ID and user ID
     - WebRTC polite/impolite role assignment

9. **Cleanup operations**
   - Unmatched users are released back to queue
   - Matched users' claims are cleaned up
   - System metrics are updated

### Phase 4: Room Joining and Connection

10. **Clients join room**

    - Clients receive match notification
    - They join the assigned room via Socket.IO
    - Room join events notify both users

11. **WebRTC connection establishment**

    - Clients exchange SDP offers/answers via room
    - ICE candidates are shared through signaling server
    - Polite/impolite roles handle negotiation conflicts
    - Direct P2P connection forms between peers

12. **Video call begins**
    - Media streams flow directly between peers
    - Server only maintains lightweight room state
    - Match assignments provide recovery mechanism

## System Maintenance

The system includes several background jobs:

- **Expired Match Cleanup**: Removes stale assignments
- **Stale Connection Cleanup**: Handles broken connections
- **Orphaned Claim Recovery**: Recovers from worker failures
- **Lost User Recovery**: Returns users missing from both queue and processing
- **Ignore Matrix Maintenance**: Updates and optimizes ignore relationships

## Concurrency and Safety

- All critical operations use atomic Redis transactions
- Worker IDs and TTLs prevent race conditions
- Error recovery at all stages
- Comprehensive metrics for monitoring
- Batched operations for efficiency
