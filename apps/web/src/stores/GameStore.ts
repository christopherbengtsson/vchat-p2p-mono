import { makeAutoObservable, observable, runInAction } from 'mobx';
import { toast } from 'sonner';
import { Maybe } from '@mono/common-dto';
import { GameType } from '@/common/model/GameType';
import { AudioAnalyserService } from '../features/flying-ball-game/service/AudioAnalyserService';
import { RootStore } from './RootStore';
import { GameData } from './model/GameData';
import { RoundData } from './model/RoundData';
import { InviteResponse } from './model/InviteResponse';

export class GameStore {
  private _rootStore: RootStore;

  private _gameActive = false;
  private _gameType: Maybe<GameType>;

  private _inviteDialogOpen = false;

  private _partnersTurn = false;
  private _maxRounds = 2;
  private _round = 0;
  private _userScore = 0;
  private _partnerScore = 0;

  remoteCanvasStream: Maybe<MediaStream> = null;
  localCanvasAudioStream: Maybe<MediaStream> = null;
  localCanvasStream: Maybe<MediaStream> = null;

  private _startNewRoundDialogOpen = false;
  private _resultDialogOpen = false;

  constructor(rootStore: RootStore) {
    makeAutoObservable(this, {
      remoteCanvasStream: observable.ref,
      localCanvasAudioStream: observable.ref,
      localCanvasStream: false,
    });

    this._rootStore = rootStore;
  }

  get inviteDialogOpen() {
    return this._inviteDialogOpen;
  }
  set inviteDialogOpen(value: boolean) {
    this._inviteDialogOpen = value;
  }

  get partnersTurn() {
    return this._partnersTurn;
  }
  set partnersTurn(value: boolean) {
    this._partnersTurn = value;
  }

  get round() {
    return this._round;
  }
  set round(value: number) {
    this._round = value;
  }

  get userScore() {
    return this._userScore;
  }
  set userScore(value: number) {
    this._userScore = value;
  }

  get partnerScore() {
    return this._partnerScore;
  }
  set partnerScore(value: number) {
    this._partnerScore = value;
  }

  get gameType() {
    return this._gameType;
  }
  set gameType(value: Maybe<GameType>) {
    this._gameType = value;
  }

  get maxRounds() {
    return this._maxRounds;
  }

  get gameActive() {
    return this._gameActive;
  }
  set gameActive(value: boolean) {
    this._gameActive = value;
  }

  get startNewRoundDialogOpen() {
    return this._startNewRoundDialogOpen;
  }
  set startNewRoundDialogOpen(value: boolean) {
    this._startNewRoundDialogOpen = value;
  }

  get resultDialogOpen() {
    return this._resultDialogOpen;
  }
  set resultDialogOpen(value: boolean) {
    this._resultDialogOpen = value;
  }

  setRemoteCanvasStream(stream: Maybe<MediaStream>) {
    runInAction(() => {
      this.remoteCanvasStream = stream;
    });
  }

  setLocalCanvasAudioStream(stream: Maybe<MediaStream>) {
    runInAction(() => {
      this.localCanvasAudioStream = stream;
    });
  }

  invitePartnerToGame() {
    this._sendMessage({
      type: 'INVITE',
    });
  }

  answerGameInvite(accept: boolean) {
    if (accept) {
      this.gameActive = true;
      this.partnersTurn = true;
    }

    this.inviteDialogOpen = false;

    this._sendMessage({
      type: 'INVITE_RESPONSE',
      response: accept ? 'ACCEPT' : 'DECLINE',
    });
  }

  handleIncomingMessage(message: GameData) {
    switch (message.type) {
      case 'INVITE':
        this.inviteDialogOpen = true;
        break;

      case 'INVITE_RESPONSE':
        this._onInviteResponse(message.response);
        break;

      case 'ROUND_UPDATE':
        this._onRoundUpdate(message.data);
        break;

      default:
        break;
    }
  }

  async startGame() {
    this.gameActive = true;
    this.partnersTurn = false;
    this.startNewRoundDialogOpen = false;
    await this._startNewRound();
  }

  sendCanvasStream(stream: Maybe<MediaStream>) {
    if (!stream || !this._rootStore.callStore.webRtcService) {
      return this._handleUnexpectedGameError();
    }

    this.localCanvasStream = stream;
    this._rootStore.callStore.webRtcService.addCanvasStream(stream);
  }

  roundGameOver(score: number) {
    this.userScore = score;
    this.resultDialogOpen = true;
    this._cleanupGameRound();

    this._sendMessage({
      type: 'ROUND_UPDATE',
      data: {
        round: this.round,
        score: this.userScore,
      },
    });
  }

  cleanupGame() {
    this._cleanupGameRound();

    this.gameActive = false;
    this.gameType = undefined;

    this.partnersTurn = false;
    this.round = 0;
    this.userScore = 0;
    this.partnerScore = 0;

    this.startNewRoundDialogOpen = false;
    this.resultDialogOpen = false;
  }

  private _onInviteResponse(response: InviteResponse) {
    if (response === 'ACCEPT') {
      this.startNewRoundDialogOpen = true;
    } else {
      toast('Invitation was declined');
    }
  }

  private _onRoundUpdate(data: RoundData) {
    this.round = data.round;
    this.userScore = data.score;
    this.resultDialogOpen = true;
    this._cleanupGameRound();
  }

  private _sendMessage(message: GameData) {
    this._rootStore.callStore.webRtcService?.sendMessage({
      type: 'GAME',
      data: message,
    });
  }

  private async _startNewRound() {
    const stream = await this._rootStore.mediaStore.requestGameAudioStream();

    AudioAnalyserService.init(stream);

    this.setLocalCanvasAudioStream(stream);
    this.round++;
  }

  private _cleanupGameRound() {
    AudioAnalyserService.stop();

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

  private _handleUnexpectedGameError() {
    toast.error('Something went wrong... sorry');
    this.cleanupGame();
  }
}
