import { createServer } from 'node:http';
import { type AddressInfo } from 'node:net';
import { RedisMemoryServer } from 'redis-memory-server';
import { Server, type Socket as ServerSocket } from 'socket.io';
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client';
import { Redis } from 'ioredis';
import { RedisQueue } from '../services/RedisQueue.js';
import { setupMatchmaking } from '../socket/matchmaking.js';
import { wrapSocketHandler } from '../utils/wrapSocketHandler.js';

const CLIENT_ID = 'clientId';

describe('Client to Server', () => {
  let io: Server, serverSocket: ServerSocket, firstClientSocket: ClientSocket;
  let redisQueue: RedisQueue;
  let redisServer: RedisMemoryServer;

  beforeAll(async () => {
    redisServer = new RedisMemoryServer();
    const host = await redisServer.getHost();
    const port = await redisServer.getPort();

    const redisClient = new Redis({ host, port, lazyConnect: true });
    await redisClient.connect();

    redisQueue = new RedisQueue(redisClient);

    return new Promise<void>((resolve) => {
      const httpServer = createServer();
      io = new Server(httpServer);
      httpServer.listen(() => {
        const port = (httpServer.address() as AddressInfo).port;
        firstClientSocket = ioc(`http://localhost:${port}`, {
          autoConnect: false,
        });

        resolve();
      });
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();

    return new Promise<void>((resolve) => {
      firstClientSocket.on('disconnecting', () => {
        redisQueue.removeFromQueue(firstClientSocket.id!);
      });

      firstClientSocket.on('connect', resolve);

      io.on('connection', (socket) => {
        serverSocket = socket;
        setupMatchmaking(serverSocket, redisQueue, wrapSocketHandler);
      });

      firstClientSocket.connect();
    });
  });

  afterEach(() => {
    firstClientSocket.disconnect();
  });

  afterAll(async () => {
    io.close();
    await redisServer.stop();
  });

  it('should remove from queue on disconnect', async () => {
    await expect.poll(() => redisQueue.getQueueCount()).toEqual(0);

    firstClientSocket.emit('find-match', CLIENT_ID);

    await expect.poll(() => redisQueue.getQueueCount()).toEqual(1);
    await expect
      .poll(() => redisQueue.getFirstInQueue())
      .toEqual(firstClientSocket.id);

    firstClientSocket.disconnect();
    await expect.poll(() => redisQueue.getQueueCount()).toEqual(0);
  });
});
