import type { AddressInfo } from 'node:net';
import { createServer } from 'node:http';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import RedisMock from 'ioredis-mock';
import { GenericContainer, Wait } from 'testcontainers';
import { Server } from 'socket.io';
import { Socket as ClientSocket, io as ioc } from 'socket.io-client';
import { WaitingQueueService } from '../../service/WaitingQueueService.js';
import { setupMatchmaking } from '../handler/matchmaking.js';
import { setupRoomManagement } from '../handler/roomManagement.js';
import { MatchService } from '../../service/MatchService.js';
import { wrapSocketHandler } from '../../utils/wrapSocketHandler.js';
import { SupabaseService } from '../../service/SupabaseService.js';

const ROOM_CLIENT1 = 'roomClient1';
const ROOM_CLIENT2 = 'roomClient2';

const CLIENT1_ID = 'client1Id';
const CLIENT2_ID = 'client2Id';

const FAST_PROMISE = 100;
const SLOW_PROMISE = 200;

describe('Non-blocking socket handlers', async () => {
  let client1: ClientSocket,
    client2: ClientSocket,
    roomClient1: ClientSocket,
    roomClient2: ClientSocket;

  vi.spyOn(SupabaseService, 'partnersNotIgnored').mockResolvedValue(true);

  const container = await new GenericContainer('redis:7.0-alpine')
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
    .start();

  const redisClient = new RedisMock({
    host: container.getHost(),
    port: container.getMappedPort(6379),
  });

  const redisQueue = new WaitingQueueService(redisClient);

  const httpServer = createServer();
  const io = new Server(httpServer);

  httpServer.listen(() => {
    const port = (httpServer.address() as AddressInfo).port;
    roomClient1 = ioc(`http://localhost:${port}`, {
      autoConnect: false,
    });
    roomClient2 = ioc(`http://localhost:${port}`, {
      autoConnect: false,
    });
    client1 = ioc(`http://localhost:${port}`, {
      autoConnect: false,
    });
    client2 = ioc(`http://localhost:${port}`, {
      autoConnect: false,
    });
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    roomClient1.on('disconnecting', () => {
      redisQueue.removeFromQueue(roomClient1.id!, ROOM_CLIENT1);
    });
    roomClient2.on('disconnecting', () => {
      redisQueue.removeFromQueue(roomClient2.id!, ROOM_CLIENT2);
    });
    client1.on('disconnecting', () => {
      redisQueue.removeFromQueue(client1.id!, CLIENT1_ID);
    });
    client2.on('disconnecting', () => {
      redisQueue.removeFromQueue(client2.id!, CLIENT2_ID);
    });

    io.on('connection', (socket) => {
      setupMatchmaking(socket, redisQueue, wrapSocketHandler);
      setupRoomManagement(socket, redisQueue, wrapSocketHandler);
    });

    roomClient1.connect();
    roomClient2.connect();
    client1.connect();
    client2.connect();

    await new Promise<void>((resolve) => {
      const connected = [];
      const setConnected = () => {
        connected.push(true);
        if (connected.length === 4) {
          resolve();
        }
      };

      roomClient1.on('connect', setConnected);
      roomClient2.on('connect', setConnected);
      client1.on('connect', setConnected);
      client2.on('connect', setConnected);
    });
  });

  afterEach(() => {
    roomClient1.disconnect();
    roomClient2.disconnect();
    client1.disconnect();
    client2.disconnect();
  });

  afterAll(async () => {
    await Promise.all([
      redisClient?.disconnect(),
      io?.close(),
      container?.stop(),
    ]);
  });

  it('should not block incoming events even if handlers are slow', async () => {
    const eventsOrder: string[] = [];

    roomClient1.on('match-found', () => {
      eventsOrder.push('match-found-roomClient1');
    });
    roomClient2.on('match-found', () => {
      eventsOrder.push('match-found-roomClient2');
    });
    roomClient1.on('request-browser-signature', () => {
      eventsOrder.push('request-browser-signature-roomClient1');
    });
    client1.on('match-found', () => {
      eventsOrder.push('match-found-client1');
    });
    client2.on('match-found', () => {
      eventsOrder.push('match-found-client2');
    });

    roomClient1.emit('find-match', roomClient1.id, ROOM_CLIENT1);
    await expect.poll(() => redisQueue.getQueueCount()).toBe(1);

    roomClient2.emit('find-match', roomClient2.id, ROOM_CLIENT2);
    await expect.poll(() => redisQueue.getQueueCount()).toBe(0);

    const finMatchSpy = vi
      .spyOn(MatchService, 'findMatch')
      .mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, SLOW_PROMISE));
        return {
          roomId: 'room1',
          partnerSocketId: 'partnerSocketId',
          partnerUserId: 'partnerUserId',
        };
      });
    vi.spyOn(SupabaseService, 'banUserLoginUntilDuration').mockImplementation(
      async () => {
        await new Promise((resolve) => setTimeout(resolve, FAST_PROMISE));
      },
    );

    client1.emit('find-match', client1.id, CLIENT1_ID);
    client2.emit('find-match', client2.id, CLIENT2_ID);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(finMatchSpy).toHaveBeenCalledTimes(2);

    roomClient2.emit('ban-user', {
      partnerUserId: ROOM_CLIENT1,
      partnerSocketId: roomClient1.id,
      banDuration: 24,
    });

    await new Promise((resolve) =>
      setTimeout(resolve, (SLOW_PROMISE + FAST_PROMISE) * 2),
    );

    expect(eventsOrder).toEqual([
      'match-found-roomClient2',
      'match-found-roomClient1',
      'request-browser-signature-roomClient1',
      'match-found-client1',
      'match-found-client2',
    ]);
  });
});
