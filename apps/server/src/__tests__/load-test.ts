/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Socket.IO Load Test
 *
 * Environment Variables:
 * - SERVER_URL: Server URL (default: http://localhost:8000)
 * - SUPABASE_JWT_SECRET: JWT secret for authentication (required)
 * - MAX_CLIENTS: Number of clients to create (default: 200)
 * - SIGNALING_TEST: Enable signaling test (default: true)
 * - MATCHMAKING_INTERVAL_MS: Matchmaking interval (default: 340)
 * - ICE_CANDIDATES: ICE candidates per client (default: 20)
 * - BURST_INTERVAL: Signaling burst interval (default: 50)
 *
 * Usage:
 * Localhost: SUPABASE_JWT_SECRET=your_secret npm run test:load
 * Deployed:  SERVER_URL=https://vcat-service.rest SUPABASE_JWT_SECRET=your_secret npm run test:load
 */
import { io } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { SocketNamespace } from '@mono/common-dto';

const BASE_URL = process.env.SERVER_URL || 'http://localhost:8000';
const URL = `${BASE_URL}${SocketNamespace.VIDEO_CHAT}`;

const MAX_CLIENTS = parseInt(process.env.MAX_CLIENTS || '200');
const POLLING_PERCENTAGE = 0.05;
const CLIENT_CREATION_INTERVAL_IN_MS = 25; // Slower, more realistic

const MATCHMAKING_TEST_ENABLED = true; // Default enabled
const SIGNALING_TEST_ENABLED = process.env.SIGNALING_TEST !== 'false'; // Default enabled
const MATCHMAKING_INTERVAL_MS = parseInt(
  process.env.MATCHMAKING_INTERVAL_MS || '340',
);
const ICE_CANDIDATES_PER_CLIENT = parseInt(process.env.ICE_CANDIDATES || '20');
const SIGNALING_BURST_INTERVAL_MS = parseInt(
  process.env.BURST_INTERVAL || '50',
);
const TEST_DURATION_MS = SIGNALING_TEST_ENABLED ? 30_000 : 60_000; // Shorter for intensive signaling
const AUTO_FINISH_ENABLED = true;
const VERBOSE_LOGGING = false;

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

if (!SUPABASE_JWT_SECRET) {
  throw new Error('SUPABASE_JWT_SECRET is required for testing');
}

// Mock WebRTC signaling data generators
const generateMockOffer = () => ({
  type: 'offer',
  sdp: 'v=0\r\no=- 4611731400430051336 2 IN IP4 127.0.0.1\r\n'.repeat(100), // ~5-6KB payload
});

const generateMockAnswer = () => ({
  type: 'answer',
  sdp: 'v=0\r\no=- 4611731400430051337 2 IN IP4 127.0.0.1\r\n'.repeat(100),
});

const generateMockIceCandidate = () => ({
  type: 'ice-candidate',
  candidate:
    'candidate:842163049 1 udp 1677721855 192.168.1.100 54400 typ srflx raddr 192.168.1.100 rport 54400 generation 0 ufrag 4ZcD network-id 3 network-cost 900',
  sdpMLineIndex: Math.floor(Math.random() * 3),
  sdpMid: Math.random() > 0.5 ? 'audio' : 'video',
});

interface ClientMetrics {
  connectTime: number;
  matchmakingStartTime?: number;
  matchmakingEndTime?: number;
  matchmakingDuration?: number;
  isMatchmaking: boolean;
  requestedMatch: boolean;
  matched: boolean;
  // Signaling metrics
  roomId?: string;
  partnerId?: string;
  signalingStartTime?: number;
  signalingMessages: {
    sent: number;
    received: number;
    latencies: number[];
  };
}

let clientCount = 0;
let connectedClients = 0;
let lastReport = new Date().getTime();
let packetsSinceLastReport = 0;
const connectionTimes: number[] = [];
const matchmakingTimes: number[] = [];
let failedConnections = 0;
const startTime = Date.now();
const clients = new Map<string, ClientMetrics>();

// User behavior tracking
let matchRequestCount = 0;
let matchedClientsCount = 0;
const uniqueRooms = new Set<string>();

// Signaling tracking
let totalSignalingMessages = 0;
const signalingLatencies: number[] = [];

// Auto-finish tracking
let lastMatchTime = 0;
let lastQueueJoinTime = 0;

const startIntensiveSignaling = (
  socket: any,
  metrics: ClientMetrics,
  userId: string,
  roomId: string,
  partnerId: string,
) => {
  if (!SIGNALING_TEST_ENABLED || !metrics.roomId) return;

  // Determine role based on userId (simulate WebRTC caller/callee)
  const isOfferer =
    userId.endsWith('_0') ||
    userId.includes('user_0') ||
    parseInt(userId.split('_')[1]) % 2 === 0;

  // Send SDP offer/answer
  if (isOfferer) {
    // Send offer
    const offer = { ...generateMockOffer(), timestamp: Date.now() };
    socket.emit('peer-message', offer, roomId, partnerId);
    metrics.signalingMessages.sent++;
    totalSignalingMessages++;
  } else {
    // Send answer after brief delay
    setTimeout(() => {
      const answer = { ...generateMockAnswer(), timestamp: Date.now() };
      socket.emit('peer-message', answer, roomId, partnerId);
      metrics.signalingMessages.sent++;
      totalSignalingMessages++;
    }, 50);
  }

  // Send ICE candidates in bursts (both roles)
  let candidateCount = 0;
  const sendIceCandidates = () => {
    if (
      candidateCount >= ICE_CANDIDATES_PER_CLIENT ||
      Date.now() - startTime > TEST_DURATION_MS
    ) {
      return;
    }

    const candidate = {
      ...generateMockIceCandidate(),
      timestamp: Date.now(),
    };

    socket.emit('peer-message', candidate, roomId, partnerId);
    metrics.signalingMessages.sent++;
    totalSignalingMessages++;
    candidateCount++;

    // Staggered ICE candidate sending to simulate real WebRTC behavior
    const nextDelay = Math.random() * SIGNALING_BURST_INTERVAL_MS + 10;
    setTimeout(sendIceCandidates, nextDelay);
  };

  // Start ICE candidate exchange after SDP exchange
  setTimeout(sendIceCandidates, isOfferer ? 100 : 150);
};

const createClient = () => {
  const userId = `user_${clientCount}`;
  const clientId = userId;
  const connectStart = Date.now();

  const token = jwt.sign(
    {
      sub: userId,
      name: `Test User ${clientCount}`,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
    },
    SUPABASE_JWT_SECRET,
    { algorithm: 'HS256' },
  );

  // For signaling tests, force WebSocket-only for pure performance comparison
  // Otherwise mimic real world: some clients stay stuck in HTTP long-polling
  const transports = SIGNALING_TEST_ENABLED
    ? ['websocket']
    : Math.random() < POLLING_PERCENTAGE
      ? ['polling']
      : ['polling', 'websocket'];

  const socket = io(URL, {
    transports,
    extraHeaders: {
      authorization: `Bearer ${token}`, // lowercase 'a' - matches server middleware
    },
  });

  clients.set(clientId, {
    connectTime: connectStart,
    isMatchmaking: false,
    requestedMatch: false,
    matched: false,
    signalingMessages: {
      sent: 0,
      received: 0,
      latencies: [],
    },
  });

  socket.on('connect', () => {
    const connectEnd = Date.now();
    const connectionTime = connectEnd - connectStart;
    connectionTimes.push(connectionTime);
    connectedClients++;

    // Log first few connections to verify socket.id
    if (VERBOSE_LOGGING && connectedClients <= 3) {
      console.log(`Client ${clientCount} connected - socketId: ${socket.id}`);
    }

    const clientMetrics = clients.get(clientId);
    if (clientMetrics) {
      clientMetrics.connectTime = connectionTime;
    }

    // Start matchmaking test for all clients
    if (MATCHMAKING_TEST_ENABLED) {
      // Stagger match requests over matchmaking interval for performance testing
      const matchDelay = Math.random() * MATCHMAKING_INTERVAL_MS;
      setTimeout(() => {
        if (socket.connected && clientMetrics && !clientMetrics.isMatchmaking) {
          clientMetrics.isMatchmaking = true;
          clientMetrics.requestedMatch = true;
          clientMetrics.matchmakingStartTime = Date.now();
          lastQueueJoinTime = Date.now();
          matchRequestCount++;
          socket.emit('find-match', socket.id, userId, []);
        }
      }, matchDelay);
    }
  });

  socket.on('connect_error', (error) => {
    failedConnections++;
    if (VERBOSE_LOGGING) {
      console.log(`Client ${clientCount} connect_error:`, error.message);
    }
  });

  socket.on('connections-count', (count) => {
    packetsSinceLastReport++;
    // Optional: log first few to verify events are received
    if (VERBOSE_LOGGING && packetsSinceLastReport <= 3) {
      console.log(
        `Received connections-count: ${count} (total packets: ${packetsSinceLastReport})`,
      );
    }
  });

  socket.on('match-found', (roomId, _partnerSocketId, partnerUserId) => {
    const clientMetrics = clients.get(clientId);
    if (
      clientMetrics &&
      clientMetrics.matchmakingStartTime &&
      !clientMetrics.matched
    ) {
      clientMetrics.matchmakingEndTime = Date.now();
      clientMetrics.matchmakingDuration =
        clientMetrics.matchmakingEndTime - clientMetrics.matchmakingStartTime;
      matchmakingTimes.push(clientMetrics.matchmakingDuration);
      clientMetrics.isMatchmaking = false;
      clientMetrics.matched = true;
      clientMetrics.roomId = roomId;
      clientMetrics.partnerId = partnerUserId;
      matchedClientsCount++;
      lastMatchTime = Date.now();

      // Track unique rooms to count actual matches (pairs)
      uniqueRooms.add(roomId);

      // Join room immediately
      socket.emit('join-room', roomId, userId);

      // Start intensive signaling if enabled
      if (SIGNALING_TEST_ENABLED) {
        clientMetrics.signalingStartTime = Date.now();
        setTimeout(
          () =>
            startIntensiveSignaling(
              socket,
              clientMetrics,
              userId,
              roomId,
              partnerUserId,
            ),
          100,
        );
      }
    }
  });

  // Handle signaling messages
  socket.on('peer-message', (data: any, partnerId: string) => {
    const clientMetrics = clients.get(clientId);
    if (!clientMetrics || !SIGNALING_TEST_ENABLED) return;

    const receiveTime = Date.now();
    clientMetrics.signalingMessages.received++;

    if (data.timestamp) {
      const latency = receiveTime - data.timestamp;
      clientMetrics.signalingMessages.latencies.push(latency);
      signalingLatencies.push(latency);
    }

    if (VERBOSE_LOGGING && clientMetrics.signalingMessages.received <= 3) {
      console.log(`${userId} received signaling from ${partnerId}:`, data.type);
    }
  });

  socket.on('disconnect', (reason) => {
    connectedClients--;
    if (VERBOSE_LOGGING) {
      console.log(`Client ${clientCount} disconnected due to ${reason}`);
    }
  });

  if (clientCount < MAX_CLIENTS - 1) {
    clientCount++;
    setTimeout(createClient, CLIENT_CREATION_INTERVAL_IN_MS);
  }
};

createClient();

const calculateStats = (values: number[]) => {
  if (values.length === 0) return { min: 0, max: 0, avg: 0, p95: 0, p99: 0 };

  const sorted = values.sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];

  return { min, max, avg, p95, p99 };
};

const printProgressReport = () => {
  const now = new Date().getTime();
  const totalDuration = (now - startTime) / 1000;

  if (!VERBOSE_LOGGING) {
    // Clean progress indicator like Artillery/WRK
    const progress = clientCount >= MAX_CLIENTS ? '✓' : '⋯';
    const matchProgress = MATCHMAKING_TEST_ENABLED
      ? `, matches: ${uniqueRooms.size}`
      : '';
    const signalingProgress = SIGNALING_TEST_ENABLED
      ? `, msgs: ${totalSignalingMessages} (${(totalSignalingMessages / totalDuration).toFixed(1)}/sec)`
      : '';
    process.stdout.write(
      `\r${progress} ${totalDuration.toFixed(0)}s, clients: ${connectedClients}/${MAX_CLIENTS}${matchProgress}${signalingProgress}`,
    );
    return;
  }

  // Verbose mode - full detailed report
  const durationSinceLastReport = (now - lastReport) / 1000;
  const packetsPerSeconds = (
    packetsSinceLastReport / durationSinceLastReport
  ).toFixed(2);

  console.log('\n=== PROGRESS REPORT ===');
  console.log(
    `Duration: ${totalDuration.toFixed(1)}s, Clients: ${connectedClients}/${MAX_CLIENTS}`,
  );
  if (MATCHMAKING_TEST_ENABLED) {
    console.log(`Matches: ${uniqueRooms.size}, Requests: ${matchRequestCount}`);
  }
  console.log(`Packets/sec: ${packetsPerSeconds}`);
  console.log('========================\n');

  packetsSinceLastReport = 0;
  lastReport = now;
};

const printFinalReport = () => {
  const now = new Date().getTime();
  const totalDuration = (now - startTime) / 1000;

  const connectionStats = calculateStats(connectionTimes);
  const matchmakingStats = calculateStats(matchmakingTimes);
  const signalingStats = calculateStats(signalingLatencies);

  // Calculate match statistics
  const actualUniquePairs = uniqueRooms.size;
  const theoreticalMaxMatches = Math.floor(matchRequestCount / 2);
  const unmatchedClients = matchRequestCount - matchedClientsCount;

  // Calculate clients who never requested a match
  let neverRequestedMatchCount = 0;
  clients.forEach((metrics) => {
    if (!metrics.requestedMatch) {
      neverRequestedMatchCount++;
    }
  });

  // Success rate: percentage of clients who requested matches that actually got matched
  const clientSuccessRate =
    matchRequestCount > 0
      ? ((matchedClientsCount / matchRequestCount) * 100).toFixed(1)
      : '0.0';

  // Matching efficiency: how close we got to the theoretical maximum pairs
  const matchingEfficiency =
    theoreticalMaxMatches > 0
      ? ((actualUniquePairs / theoreticalMaxMatches) * 100).toFixed(1)
      : '0.0';

  // Overall participation rate
  const overallParticipationRate =
    MAX_CLIENTS > 0
      ? ((matchRequestCount / MAX_CLIENTS) * 100).toFixed(1)
      : '0.0';

  if (!VERBOSE_LOGGING) console.log('\n'); // Clear progress line

  console.log(
    '┌─────────────────────────────────────────────────────────────┐',
  );
  console.log('│                     LOAD TEST RESULTS                      │');
  console.log(
    '└─────────────────────────────────────────────────────────────┘',
  );

  console.log('\n📊 CONNECTION PERFORMANCE');
  console.log(`   Duration: ${totalDuration.toFixed(1)}s`);
  console.log(
    `   Clients:  ${connectedClients}/${MAX_CLIENTS} (${failedConnections} failed)`,
  );
  console.log(
    `   Rate:     ${(connectedClients / totalDuration).toFixed(2)} conn/sec`,
  );

  if (connectionTimes.length > 0) {
    console.log('\n⚡ CONNECTION LATENCY');
    console.log(`   Average:  ${connectionStats.avg.toFixed(1)}ms`);
    console.log(`   P95:      ${connectionStats.p95.toFixed(1)}ms`);
    console.log(`   P99:      ${connectionStats.p99.toFixed(1)}ms`);
    console.log(
      `   Range:    ${connectionStats.min.toFixed(1)}ms - ${connectionStats.max.toFixed(1)}ms`,
    );
  }

  if (MATCHMAKING_TEST_ENABLED) {
    console.log('\n🎯 MATCHMAKING PERFORMANCE');
    console.log(
      `   Participation:   ${overallParticipationRate}% (${matchRequestCount}/${MAX_CLIENTS} clients requested matches)`,
    );
    if (neverRequestedMatchCount > 0) {
      console.log(
        `   NeverJoined:    ${neverRequestedMatchCount} client${neverRequestedMatchCount > 1 ? 's' : ''} never requested a match`,
      );
    }
    console.log(
      `   Success Rate:    ${clientSuccessRate}% (${matchedClientsCount}/${matchRequestCount} clients got matched)`,
    );
    console.log(`   Unique Pairs:    ${actualUniquePairs} pairs formed`);
    console.log(
      `   Efficiency:      ${matchingEfficiency}% (${actualUniquePairs}/${theoreticalMaxMatches} theoretical max pairs)`,
    );

    if (unmatchedClients > 0) {
      console.log(
        `   Unmatched:       ${unmatchedClients} client${unmatchedClients > 1 ? 's' : ''} still in queue`,
      );
    }

    if (matchmakingTimes.length > 0) {
      console.log('\n⏱️  MATCHMAKING LATENCY');
      console.log(`   Average:  ${matchmakingStats.avg.toFixed(1)}ms`);
      console.log(`   P95:      ${matchmakingStats.p95.toFixed(1)}ms`);
      console.log(`   P99:      ${matchmakingStats.p99.toFixed(1)}ms`);
      console.log(
        `   Range:    ${matchmakingStats.min.toFixed(1)}ms - ${matchmakingStats.max.toFixed(1)}ms`,
      );
    }
  }

  if (SIGNALING_TEST_ENABLED) {
    // Calculate signaling statistics
    let totalSent = 0;
    let totalReceived = 0;

    clients.forEach((metrics) => {
      totalSent += metrics.signalingMessages.sent;
      totalReceived += metrics.signalingMessages.received;
    });

    console.log('\n🚀 SIGNALING PERFORMANCE');
    console.log(`   Total Messages:    ${totalSignalingMessages}`);
    console.log(
      `   Messages/sec:      ${(totalSignalingMessages / totalDuration).toFixed(1)}`,
    );
    console.log(`   Sent:             ${totalSent}`);
    console.log(`   Received:         ${totalReceived}`);
    console.log(
      `   Message Loss:     ${totalSent > 0 ? (((totalSent - totalReceived) / totalSent) * 100).toFixed(2) : '0.00'}%`,
    );

    if (signalingLatencies.length > 0) {
      console.log('\n⏱️  SIGNALING LATENCY');
      console.log(`   Average:  ${signalingStats.avg.toFixed(1)}ms`);
      console.log(`   P95:      ${signalingStats.p95.toFixed(1)}ms`);
      console.log(`   P99:      ${signalingStats.p99.toFixed(1)}ms`);
      console.log(
        `   Range:    ${signalingStats.min.toFixed(1)}ms - ${signalingStats.max.toFixed(1)}ms`,
      );
    }
  }

  console.log('\n' + '─'.repeat(65));
};

const finishTest = (reason: string) => {
  clearInterval(reportInterval);
  if (autoFinishTimeout) clearInterval(autoFinishTimeout);
  clearTimeout(maxDurationTimeout);

  console.log(`\n\n🎯 Test completed (${reason})!`);
  printFinalReport();
  process.exit(0);
};

const checkAutoFinish = () => {
  if (!AUTO_FINISH_ENABLED || !MATCHMAKING_TEST_ENABLED) return;

  const now = Date.now();
  const timeSinceLastMatch = now - lastMatchTime;
  const timeSinceLastQueueJoin = now - lastQueueJoinTime;
  const timeSinceStart = now - startTime;

  // Auto-finish conditions:
  // 1. All clients created AND
  // 2. No new matches in 10 seconds AND
  // 3. No new queue joins in 15 seconds AND
  // 4. Been running for at least 30 seconds
  if (
    clientCount >= MAX_CLIENTS &&
    timeSinceLastMatch > 10000 &&
    timeSinceLastQueueJoin > 15000 &&
    timeSinceStart > 30000
  ) {
    finishTest('auto-detected completion');
  }
};

const reportInterval = setInterval(printProgressReport, 5000);
const autoFinishTimeout = AUTO_FINISH_ENABLED
  ? setInterval(checkAutoFinish, 2000)
  : null;

// Auto-exit after test duration
const maxDurationTimeout = setTimeout(() => {
  finishTest('max duration reached');
}, TEST_DURATION_MS);
