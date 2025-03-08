import { action, observable, onBecomeUnobserved } from 'mobx';

export class MediaStore {
  @observable.ref accessor localAudioGameStream: MediaStream | null = null;
  @observable.ref accessor localCallStream: MediaStream | null = null;
  @observable accessor localVideoEnabled = true;
  @observable accessor localAudioEnabled = true;

  constructor() {
    onBecomeUnobserved(
      this,
      'localAudioGameStream',
      this.closeLocalGameAudioStream,
    );
    onBecomeUnobserved(this, 'localCallStream', this.closeLocalCallStream);
  }

  @action
  setGameAudioStream = (stream: MediaStream) => {
    this.localAudioGameStream = stream;
  };

  @action
  setLocalStream = (stream: MediaStream) => {
    this.localCallStream = stream;
    this.localVideoEnabled = stream.getVideoTracks()[0].enabled;
    this.localAudioEnabled = this.localCallStream.getAudioTracks()[0].enabled;
  };

  @action
  setLocalVideoEnabled = (toggle: boolean) => {
    if (!this.localCallStream) {
      return;
    }
    this.localCallStream.getVideoTracks()[0].enabled = toggle;
    this.localVideoEnabled = toggle;
  };

  @action
  setLocalAudioEnabled = (toggle: boolean) => {
    if (!this.localCallStream) {
      return;
    }
    this.localCallStream.getAudioTracks()[0].enabled = toggle;
    this.localAudioEnabled = toggle;
  };

  @action
  closeLocalGameAudioStream = () => {
    this.localAudioGameStream?.getTracks().forEach((track) => {
      track.stop();
    });
    this.localAudioGameStream = null;
  };

  @action
  closeLocalCallStream = () => {
    this.localCallStream?.getTracks().forEach((track) => {
      track.stop();
    });
    this.localCallStream = null;
  };
}

export const mediaStore = new MediaStore();
