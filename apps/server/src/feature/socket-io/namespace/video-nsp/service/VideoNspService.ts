import type { NextFunction } from 'express';
import type { Server } from 'socket.io';
import { SocketNamespace } from '@mono/common-dto';
import { SocketRateLimiterMiddleware } from '../../../../../common/middleware/SocketRateLimiterMiddleware.js';
import { ValidateJwtMiddleware } from '../../../../../common/middleware/ValidateJwtMiddleware.js';
import type { IncomingMessage } from '../../../../../common/middleware/model/IncomingMessage.js';
import type { VChatSocket } from '../../../../../common/model/VChatSocket.js';
import { log } from '../../../../../common/util/logger.js';
import { wrapSocketHandler } from '../../../../../common/util/wrapSocketHandler.js';
import { MatchmakingController } from '../../../../matchmaking/controller/MatchmakingController.js';
import { ModerationController } from '../../../../moderation/controller/ModerationController.js';
import { RoomManagementController } from '../../../../room-management/controller/RoomManagementController.js';
import { SignalingController } from '../../../../signaling/controller/SignalingController.js';
import { nspEmitters } from '../../api/namespaceEmitter.js';

const initNspControllers = (socket: VChatSocket) => {
  SignalingController.register(socket, wrapSocketHandler);
  MatchmakingController.register(socket, wrapSocketHandler);
  RoomManagementController.register(socket, wrapSocketHandler);
  ModerationController.register(socket, wrapSocketHandler);
};

const setupListeners = (socket: VChatSocket, emitSocketCount: VoidFunction) => {
  socket.on('disconnect', emitSocketCount);
  socket.on('error', (error) => {
    log.error({ error }, '[Video namespace] Socket error');
  });
};

const bootstrap = (io: Server) => {
  const videoChat = io.of(SocketNamespace.VIDEO_CHAT);
  const emitSocketCount = nspEmitters(videoChat).connectionsCount;

  videoChat.use(SocketRateLimiterMiddleware.use);
  videoChat.use((socket, next) =>
    ValidateJwtMiddleware.use(
      socket.request as IncomingMessage,
      next as NextFunction,
    ),
  );

  videoChat.on('connection', (socket: VChatSocket) => {
    setupListeners(socket, emitSocketCount);
    initNspControllers(socket);
    emitSocketCount();
  });
};

export const VideoNspService = {
  bootstrap,
};
