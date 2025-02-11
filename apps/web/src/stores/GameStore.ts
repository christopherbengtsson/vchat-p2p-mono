import { makeAutoObservable, observable } from 'mobx';
import { toast } from 'sonner';
import { Maybe } from '@mono/common-dto';
import { GameType } from '@/common/model/GameType';
import { AudioFrequencyService } from '../features/flying-ball-game/service/AudioFrequencyService';
import { RootStore } from './RootStore';
import { GameData } from './model/GameData';
import { RoundData } from './model/RoundData';
import { InviteResponse } from './model/InviteResponse';
import { DataChannelMessage } from './model/DataChannelMessage';

export class GameStore {
  private rootStore: RootStore;

  gameActive = false;
  gameType: Maybe<GameType> = undefined;

  inviteDialogOpen = false;
  startNewRoundDialogOpen = false;
  resultDialogOpen = false;

  partnersTurn = false;
  round = 0;
  maxRounds = 2;
  userScore = 0;
  partnerScore = 0;

  audioFrequencyService: Maybe<AudioFrequencyService> = null;
  remoteCanvasStream: Maybe<MediaStream> = null;
  localCanvasAudioStream: Maybe<MediaStream> = null;
  localCanvasStream: Maybe<MediaStream> = null;

  constructor(rootStore: RootStore) {
    makeAutoObservable(this, {
      remoteCanvasStream: observable.ref,
      localCanvasAudioStream: observable.ref,
      localCanvasStream: observable.ref,
      audioFrequencyService: observable.ref, // TODO: False?

      gameType: false,
    });

    this.rootStore = rootStore;
  }

  get gameComplete() {
    return this.round === this.maxRounds;
  }

  invitePartnerToGame() {
    const payload: DataChannelMessage = {
      type: 'GAME',
      data: {
        type: 'INVITE',
      },
    };
    this.sendMessage(payload);
  }
  answerGameInvite(accept: boolean) {
    if (accept) {
      this.gameActive = true;
      this.partnersTurn = true;
    }

    this.inviteDialogOpen = false;

    const payload: DataChannelMessage = {
      type: 'GAME',
      data: {
        type: 'INVITE_RESPONSE',
        response: accept ? 'ACCEPT' : 'DECLINE',
      },
    };
    this.sendMessage(payload);
  }
  handleIncomingMessage(message: GameData) {
    switch (message.type) {
      case 'INVITE':
        this.inviteDialogOpen = true;
        break;

      case 'INVITE_RESPONSE':
        this.onInviteResponse(message.response);
        break;

      case 'ROUND_UPDATE':
        this.onRoundUpdate(message.data);
        break;

      default:
        break;
    }
  }
  async startGame() {
    this.gameActive = true;
    this.partnersTurn = false;
    this.setStartNewRoundDialogOpen(false);
    await this.startNewRound();
  }
  sendCanvasStream(stream: Maybe<MediaStream>) {
    if (!stream || !this.rootStore.callStore.webRtcService) {
      this.handleUnexpectedGameError();
      return;
    }

    this.localCanvasStream = stream;
    this.rootStore.callStore.webRtcService.addCanvasStream(stream);
  }
  roundGameOver(score: number) {
    this.userScore = score;
    this.resultDialogOpen = true;
    this.cleanupGameRound();

    const payload: DataChannelMessage = {
      type: 'GAME',
      data: {
        type: 'ROUND_UPDATE',
        data: {
          round: this.round,
          score: this.userScore,
        },
      },
    };

    this.sendMessage(payload);
  }
  cleanupGame() {
    this.cleanupGameRound();

    this.gameActive = false;
    this.gameType = undefined;

    this.partnersTurn = false;
    this.round = 0;
    this.userScore = 0;
    this.partnerScore = 0;

    this.setStartNewRoundDialogOpen(false);
    this.resultDialogOpen = false;
  }

  setRemoteCanvasStream(stream: Maybe<MediaStream>) {
    this.remoteCanvasStream = stream;
  }
  setLocalCanvasAudioStream(stream: Maybe<MediaStream>) {
    this.localCanvasAudioStream = stream;
  }
  setAudioFrequencyService(audioFrequencyService: AudioFrequencyService) {
    this.audioFrequencyService = audioFrequencyService;
  }
  toggleResultDialog(open: boolean) {
    this.resultDialogOpen = open;
  }
  setStartNewRoundDialogOpen(open: boolean) {
    this.startNewRoundDialogOpen = open;
  }
  incrementRound() {
    this.round++;
  }

  async startNewRound(this: GameStore) {
    const stream = await this.rootStore.mediaStore.requestGameAudioStream();
    const audioFrequencyService = new AudioFrequencyService(stream);
    this.setLocalCanvasAudioStream(stream);
    this.setAudioFrequencyService(audioFrequencyService);
    this.incrementRound();
  }

  onInviteResponse(response: InviteResponse) {
    if (response === 'ACCEPT') {
      this.setStartNewRoundDialogOpen(true);
    } else {
      toast('Invitation was declined');
    }
  }

  onRoundUpdate(data: RoundData) {
    this.round = data.round;
    this.userScore = data.score;
    this.resultDialogOpen = true;
    this.cleanupGameRound();
  }
  sendMessage(message: DataChannelMessage) {
    this.rootStore.callStore.webRtcService?.sendMessage(message);
  }
  cleanupGameRound() {
    this.audioFrequencyService?.close();

    if (this.remoteCanvasStream) {
      this.remoteCanvasStream.getTracks().forEach((track) => track.stop());
      this.setRemoteCanvasStream(null);
    }

    if (this.localCanvasStream) {
      this.localCanvasStream.getTracks().forEach((track) => track.stop());
      this.localCanvasStream = null;
    }

    if (this.localCanvasAudioStream) {
      this.localCanvasAudioStream.getTracks().forEach((track) => track.stop());
      this.setLocalCanvasAudioStream(null);
    }
  }
  handleUnexpectedGameError() {
    toast.error('Something went wrong... sorry');
    this.cleanupGame();
  }
}
