import type { Server } from 'http';
import helmet from 'helmet';
import { Server as SocketServer } from 'socket.io';
import { instrument } from '@socket.io/admin-ui';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { setupMatchmaking } from './matchmaking.js';
import { setupChat } from './chat.js';
import { setupWebRTC } from './webRtc.js';
import { setupRoomManagement } from './roomManagement.js';
import logger from '../utils/logger.js';
import { wrapSocketHandler } from '../utils/wrapSocketHandler.js';
import { validateJwtMiddleware } from '../middleware/authMiddleware.js';
import { MODE } from '../constants.js';
import { nspEmitters } from './nspEmitters.js';
import type { IncomingMessage } from '../models/IncomingMessage.js';
import type { NextFunction } from 'express';

export function setupSocketServer(httpServer: Server) {
  console.log('setupSocket');
  const io = new SocketServer(httpServer, {
    cors: {
      origin: ['https://admin.socket.io', 'http://localhost:3000'],
      credentials: true,
    },
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
      .consume(socket.id)
      .then(() => {
        next();
      })
      .catch(() => {
        next(new Error('Too many requests'));
      });
  });

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

    setupMatchmaking(socket, wrapSocketHandler);
    setupChat(socket, wrapSocketHandler);
    setupWebRTC(socket, wrapSocketHandler);
    setupRoomManagement(socket, wrapSocketHandler);

    socket.on('disconnecting', () => {
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
