import { makeAutoObservable } from 'mobx';
import { toast } from 'sonner';
import { Maybe } from '@mono/common-dto';
import { GameType } from '@/common/model/GameType';
import { AudioAnalyserService } from '../features/flying-ball-game/service/AudioAnalyserService';
import { RootStore } from './RootStore';

export class GameStore {
  private _rootStore: RootStore;

  private _gameActive = false;
  private _gameType: Maybe<GameType>;

  private _partnersTurn = false;
  private _maxRounds = 2;
  private _round = 0;
  private _userScore = 0;
  private _partnerScore = 0;

  private _remoteCanvasStream: Maybe<MediaStream>;
  private _localCanvasStream: Maybe<MediaStream>;
  private _localCanvasAudioStream: Maybe<MediaStream>;

  private _startNewRoundDialogOpen = false;
  private _resultDialogOpen = false;

  constructor(rootStore: RootStore) {
    makeAutoObservable(this);

    this._rootStore = rootStore;
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

  get remoteCanvasStream() {
    return this._remoteCanvasStream;
  }
  set remoteCanvasStream(value: Maybe<MediaStream>) {
    this._remoteCanvasStream = value;
  }

  get localCanvasStream() {
    return this._localCanvasStream;
  }
  set localCanvasStream(value: Maybe<MediaStream>) {
    this._localCanvasStream = value;
  }

  get localCanvasAudioStream() {
    return this._localCanvasAudioStream;
  }
  set localCanvasAudioStream(value: Maybe<MediaStream>) {
    this._localCanvasAudioStream = value;
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

  invitePartnerToGame() {
    this._rootStore.socketStore.socket.emit(
      'send-game-invite',
      this._rootStore.callStore.roomId,
    );
  }

  handleIncomingGameInvitation(acceptInvite: boolean) {
    if (acceptInvite) {
      this.gameActive = true;
      this.partnersTurn = true;
    }

    this._rootStore.socketStore.socket.emit(
      'answer-game-invite',
      this._rootStore.callStore.roomId,
      acceptInvite,
    );
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

    this.localCanvasStream = null;
    this.localCanvasAudioStream = null;

    this.resultDialogOpen = true;

    this._rootStore.socketStore.socket.emit(
      'round-game-over',
      this._rootStore.callStore.roomId,
      this.round,
      this.userScore,
    );
  }

  async handlePartnerRoundCompleted(round: number, partnerScore: number) {
    this.round = round;
    this.partnerScore = partnerScore;
    this.resultDialogOpen = true;

    this._cleanupGameRound();
  }

  cleanupGame() {
    AudioAnalyserService.stop();

    if (this.remoteCanvasStream) {
      this.remoteCanvasStream.getTracks().forEach((track) => track.stop());
    }

    this.gameActive = false;
    this.gameType = undefined;

    this.partnersTurn = false;
    this.round = 0;
    this.userScore = 0;
    this.partnerScore = 0;

    this.remoteCanvasStream = undefined;
    this.localCanvasStream = undefined;
    this.localCanvasAudioStream = undefined;

    this.startNewRoundDialogOpen = false;
    this.resultDialogOpen = false;
  }

  private async _startNewRound() {
    this.localCanvasAudioStream =
      await this._rootStore.mediaStore.requestGameAudioStream();
    AudioAnalyserService.init(this.localCanvasAudioStream);

    this.round++;
  }

  private _cleanupGameRound() {
    this.remoteCanvasStream = null;
    this.localCanvasStream = null;
    this.localCanvasAudioStream = null;
  }

  private _handleUnexpectedGameError() {
    toast.error('Something went wrong... sorry');
    this.cleanupGame();
  }
}
