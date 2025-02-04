import { type AddressInfo } from 'node:net';
import { createServer } from 'node:http';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import RedisMock from 'ioredis-mock';
import { type Redis } from 'ioredis';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { Server, type Socket as ServerSocket } from 'socket.io';
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client';
import { WaitingQueueService } from '../service/WaitingQueueService.js';
import { setupMatchmaking } from '../socket/handler/matchmaking.js';
import { wrapSocketHandler } from '../utils/wrapSocketHandler.js';

const CLIENT_ID = 'clientId';

describe('Client to Server', () => {
  let redisClient: Redis;
  let io: Server, serverSocket: ServerSocket, firstClientSocket: ClientSocket;
  let redisQueue: WaitingQueueService;
  let container: StartedTestContainer;

  beforeAll(async () => {
    container = await new GenericContainer('redis')
      .withExposedPorts(6379)
      .start();

    redisClient = new RedisMock({
      host: container.getHost(),
      port: container.getMappedPort(6379),
      lazyConnect: true,
    });
    await redisClient.connect();

    redisQueue = new WaitingQueueService(redisClient);

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
        redisQueue.removeFromQueue(firstClientSocket.id!, CLIENT_ID);
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
    await container.stop();
    io?.close();
    redisClient?.quit();
  });

  it('should remove from queue on disconnect', async () => {
    await expect.poll(() => redisQueue.getQueueCount()).toEqual(0);

    firstClientSocket.emit('find-match', firstClientSocket.id, CLIENT_ID);

    await expect.poll(() => redisQueue.getQueueCount()).toEqual(1);
    await expect
      .poll(() => redisQueue.getFirstInQueue())
      .toEqual({
        socketId: firstClientSocket.id,
        userId: CLIENT_ID,
      });

    firstClientSocket.disconnect();
    await expect.poll(() => redisQueue.getQueueCount()).toEqual(0);
  });
});
