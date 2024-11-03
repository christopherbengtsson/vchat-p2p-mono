import type { Server } from 'http';
import { hostname } from 'node:os';
import type { NextFunction } from 'express';
import helmet from 'helmet';
import { instrument, RedisStore } from '@socket.io/admin-ui';
import { createAdapter } from '@socket.io/redis-streams-adapter';
import { Server as SocketServer } from 'socket.io';
import type { Redis } from 'ioredis';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { MODE } from '../constants.js';
import { validateJwtMiddleware } from '../middleware/authMiddleware.js';
import type { IncomingMessage } from '../models/IncomingMessage.js';
import { RedisQueue } from '../services/RedisQueue.js';
import logger from '../utils/logger.js';
import { wrapSocketHandler } from '../utils/wrapSocketHandler.js';
import { setupChat } from './chat.js';
import { setupMatchmaking } from './matchmaking.js';
import { nspEmitters } from './nspEmitters.js';
import { setupRoomManagement } from './roomManagement.js';
import { setupWebRTC } from './webRtc.js';

export function setupSocketServer(httpServer: Server, redisClient: Redis) {
  const io = new SocketServer(httpServer, {
    adapter: createAdapter(redisClient),
    cors: {
      origin: (process.env.CORS_ORIGINS ?? '').split(','),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  io.engine.on('connection_error', (error) => {
    logger.fatal(error, 'Socket.io connection error');
  });

  io.engine.use(helmet());

  const adminNamespace = io.of('/admin');
  instrument(io, {
    auth:
      MODE === 'production'
        ? {
            type: 'basic',
            username: process.env.ADMIN_UI_USERNAME ?? '',
            password: process.env.ADMIN_UI_PASSWORD ?? '',
          }
        : false,
    mode: MODE,
    store: new RedisStore(redisClient),
    serverId: `${hostname()}#${process.pid}`,
  });
  adminNamespace.use((_socket, next) => {
    next();
  });

  const rateLimiter = new RateLimiterMemory({
    points: 15,
    duration: 1,
  });
  io.use((socket, next) => {
    rateLimiter
      .consume(socket.id) // TODO: or socket.handshake.address?
      .then(() => {
        next();
      })
      .catch(() => {
        logger.warn('[io rate limiter]: Too many requests');
        next(new Error('Too many requests'));
      });
  });

  const redisQueue = new RedisQueue(redisClient);

  const videoChat = io.of('/video-chat');
  const videoChatEmitters = nspEmitters(videoChat);

  videoChat.use((socket, next) => {
    validateJwtMiddleware(
      socket.request as IncomingMessage,
      next as NextFunction,
    );
  });

  videoChat.on('connection', (socket) => {
    logger.debug(
      { socketId: socket.id },
      'User connected to video-chat namespace',
    );

    setupMatchmaking(socket, redisQueue, wrapSocketHandler);
    setupChat(socket, wrapSocketHandler);
    setupWebRTC(socket, wrapSocketHandler);
    setupRoomManagement(socket, wrapSocketHandler);

    socket.on('disconnecting', async () => {
      Array.from(socket.rooms.values()).forEach((roomId) => {
        socket.to(roomId).emit('partner-disconnected', socket.id);
      });
    });

    socket.on('disconnect', () => {
      logger.debug('User disconnected');
      videoChatEmitters.connectionsCount();
    });

    socket.on('error', (error) => {
      logger.error({ error }, 'Socket error');
    });

    videoChatEmitters.connectionsCount();
  });

  return io;
}
