import { action, observable } from 'mobx';

export class MediaStore {
  @observable.ref accessor stream: MediaStream | null = null;
  @observable accessor videoEnabled = true;
  @observable accessor audioEnabled = true;

  @action
  setLocalStream = (stream: MediaStream) => {
    this.stream = stream;
    this.videoEnabled = stream.getVideoTracks()[0].enabled;
    this.audioEnabled = this.stream.getAudioTracks()[0].enabled;
  };

  @action
  setVideoEnabled = (toggle: boolean) => {
    if (!this.stream) {
      return;
    }
    this.stream.getVideoTracks()[0].enabled = toggle;
    this.videoEnabled = toggle;
  };

  @action
  setAudioEnabled = (toggle: boolean) => {
    if (!this.stream) {
      return;
    }
    this.stream.getAudioTracks()[0].enabled = toggle;
    this.audioEnabled = toggle;
  };

  @action
  closeAudioAndVideoStream = () => {
    this.stream?.getTracks()?.forEach((track) => {
      track.stop();
    });
    this.stream = null;
  };
}
