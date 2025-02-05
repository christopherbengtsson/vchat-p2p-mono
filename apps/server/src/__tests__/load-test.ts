import { io } from 'socket.io-client';
import jwt from 'jsonwebtoken';

const URL = 'http://localhost:8000/video-chat';

const MAX_CLIENTS = 1000;
const POLLING_PERCENTAGE = 0.05;
const CLIENT_CREATION_INTERVAL_IN_MS = 10;
//const EMIT_INTERVAL_IN_MS = 1000;

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

if (!SUPABASE_JWT_SECRET) {
  throw new Error('SUPABASE_JWT_SECRET is not defined');
}

let clientCount = 0;
let lastReport = new Date().getTime();
let packetsSinceLastReport = 0;

const createClient = () => {
  const userId = `user_${clientCount}`;
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

  // Mimic real world: some clients stay stuck in HTTP long-polling
  const transports =
    Math.random() < POLLING_PERCENTAGE ? ['polling'] : ['polling', 'websocket'];

  const socket = io(URL, {
    transports,
    extraHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  socket.on('connections-count', () => {
    packetsSinceLastReport++;
  });

  socket.on('disconnect', (reason) => {
    console.log(`Client ${clientCount} disconnected due to ${reason}`);
  });

  if (++clientCount < MAX_CLIENTS) {
    setTimeout(createClient, CLIENT_CREATION_INTERVAL_IN_MS);
  }
};

createClient();

const printReport = () => {
  const now = new Date().getTime();
  const durationSinceLastReport = (now - lastReport) / 1000;
  const packetsPerSeconds = (
    packetsSinceLastReport / durationSinceLastReport
  ).toFixed(2);

  console.log(
    `Client count: ${clientCount} ; Average packets received per second: ${packetsPerSeconds}`,
  );

  packetsSinceLastReport = 0;
  lastReport = now;
};

setInterval(printReport, 5000);
