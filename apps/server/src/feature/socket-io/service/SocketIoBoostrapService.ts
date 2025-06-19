import type { Server } from 'socket.io';
import { VideoNspService } from '../namespace/video-nsp/service/VideoNspService.js';

const bootstrap = async (io: Server) => {
  VideoNspService.bootstrap(io);
};

export const SocketIoBootstrapService = {
  bootstrap,
};
