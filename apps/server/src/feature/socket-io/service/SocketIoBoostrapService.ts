import type { Server } from 'socket.io';
import { VideoNspService } from '../namespace/video-nsp/service/VideoNspService.js';
import { JobType } from '../../job/model/JobType.js';
import { JobManagerService } from '../../job/service/JobManagerService.js';
import { MatchMakingJobEntry } from '../../matchmaking/service/MatchmakingJobEntry.js';

const bootstrap = async (io: Server) => {
  // TODO: Centralized list of jobs to register on startup?
  JobManagerService.registerJob(
    JobType.DEFAULT_MATCHMAKING,
    MatchMakingJobEntry.create(io),
  );

  VideoNspService.bootstrap(io);
};

export const SocketIoBootstrapService = {
  bootstrap,
};
