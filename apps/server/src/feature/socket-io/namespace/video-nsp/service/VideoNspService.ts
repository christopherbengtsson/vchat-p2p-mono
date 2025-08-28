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
import type { RateLimitOptions } from '../../../../../common/middleware/model/RateLimitOptions.js';

// WebSocket Real-time Rate Limits
// Dev: 300 (Heavy development testing) | Prod: 150 (Video calls generate many signaling events)
// Block Duration: 180s (Shorter timeout for real-time)
const rateLimitOptions: RateLimitOptions = {
  points: process.env.NODE_ENV === 'development' ? 300 : 150,
  duration: 60, // per minute
  blockDuration: 180, // 3 minutes
  keyPrefix: 'video-chat-namespace',
  execEvenly: false, // Real-time communications need immediate responses
};

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

  videoChat.use((socket, next) =>
    ValidateJwtMiddleware.use(
      socket.request as IncomingMessage,
      next as NextFunction,
    ),
  );

  videoChat.use(SocketRateLimiterMiddleware.use(rateLimitOptions));

  videoChat.on('connection', (socket: VChatSocket) => {
    setupListeners(socket, emitSocketCount);
    initNspControllers(socket);
    emitSocketCount();
  });
};

export const VideoNspService = {
  bootstrap,
};
