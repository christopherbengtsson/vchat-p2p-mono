import { Server } from 'socket.io';
import type { NextFunction } from 'express';
import type { Redis } from 'ioredis';
import type { IncomingMessage } from '../../../model/IncomingMessage.js';
import { validateJwtMiddleware } from '../../../middleware/authMiddleware.js';
import { nspEmitters } from '../../handler/nspEmitters.js';
import logger from '../../../utils/logger.js';
import { setupMatchmaking } from '../../handler/matchmaking.js';
import { setupChat } from '../../handler/chat.js';
import { setupWebRTC } from '../../handler/webRtc.js';
import { setupRoomManagement } from '../../handler/roomManagement.js';
import { WaitingQueueService } from '../../service/WaitingQueueService.js';
import { wrapSocketHandler } from '../../../utils/wrapSocketHandler.js';

const bootstrap = (io: Server, redisClient: Redis) => {
  const redisQueue = new WaitingQueueService(redisClient);
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
};

export const VideoNsp = {
  bootstrap,
};
