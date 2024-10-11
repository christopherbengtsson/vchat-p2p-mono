import { makeAutoObservable } from 'mobx';
import { MediaStreamService } from '../services/MediaStreamService';
import { RootStore } from './RootStore';
import { ErrorState } from './model/ErrorState';

export class MediaStore {
  private _rootStore: RootStore;
  private _stream: MediaStream | null = null;
  private _videoEnabled = true;
  private _audioEnabled = true;

  constructor(rootStore: RootStore) {
    makeAutoObservable(this);
    this._rootStore = rootStore;
    void this.initStreams();
  }

  get maybeStream() {
    return this._stream;
  }

  get stream(): MediaStream {
    if (!this._stream) {
      throw new Error('Local stream is not available');
    }
    return this._stream;
  }
  set stream(stream: MediaStream | null) {
    this._stream = stream;
  }

  get videoEnabled() {
    return this._videoEnabled;
  }
  set videoEnabled(toggle: boolean) {
    this.stream.getVideoTracks()[0].enabled = toggle;
    this._videoEnabled = toggle;
  }

  get audioEnabled() {
    return this._audioEnabled;
  }
  set audioEnabled(toggle: boolean) {
    this.stream.getAudioTracks()[0].enabled = toggle;
    this._audioEnabled = toggle;
  }

  private async initStreams() {
    try {
      const stream = await MediaStreamService.requestAudioAndVideoStream();

      this.stream = stream;
      this.videoEnabled = stream.getVideoTracks()[0].enabled;
      this.audioEnabled = stream.getAudioTracks()[0].enabled;
    } catch (error) {
      console.error(error);
      this._rootStore.mainStore.errorState = ErrorState.MEDIA_STREAM_ERROR;
    }
  }
}
