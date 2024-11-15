import { PeerMessage } from '@mono/common-dto';
import { RootStore } from '../../../stores/RootStore';

const configuration = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

export class WebRTCService {
  private rootStore: RootStore;

  private peerConnection: RTCPeerConnection;

  private makingOffer = false;
  private ignoreOffer = false;

  private canvasStream: RTCRtpSender | null = null;
  private videoStreamId: string | null = null;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;

    this.peerConnection = new RTCPeerConnection(configuration);
    this.setupPeerListeners();
    this.setupSocketListeners();

    for (const track of this.rootStore.mediaStore.stream.getTracks()) {
      this.peerConnection.addTrack(track, this.rootStore.mediaStore.stream);
    }
  }

  private setupPeerListeners() {
    this.peerConnection.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true;

        await this.peerConnection.setLocalDescription();

        this.rootStore.socketStore.socket.emit(
          'peer-message',
          { description: this.peerConnection.localDescription },
          this.rootStore.callStore.roomId,
          this.rootStore.callStore.partnerId,
        );
      } catch (err) {
        console.error(err);
      } finally {
        this.makingOffer = false;
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      if (this.peerConnection.iceConnectionState === 'failed') {
        this.peerConnection.restartIce();
      }
    };

    this.peerConnection.onicecandidate = (ev) => {
      if (ev.candidate) {
        this.rootStore.socketStore.socket.emit(
          'peer-message',
          { candidate: ev.candidate },
          this.rootStore.callStore.roomId,
          this.rootStore.callStore.partnerId,
        );
      }
    };

    this.peerConnection.ontrack = ({ track, streams }) => {
      track.onunmute = () => {
        const remoteStream = streams[0];

        if (!this.rootStore.callStore.remoteStream) {
          this.rootStore.callStore.remoteStream = remoteStream;
          this.videoStreamId = remoteStream.id;
        }

        if (
          !this.rootStore.callStore.remoteCanvasStream &&
          remoteStream.id !== this.videoStreamId
        ) {
          this.rootStore.callStore.remoteCanvasStream = remoteStream;
        }
      };
    };
  }

  private setupSocketListeners() {
    this.rootStore.socketStore.socket.on('peer-message', (...data) =>
      this.handleOffer(...data),
    );
  }

  private handleOffer = async (peerMessage: PeerMessage, _userId: string) => {
    if (!this.peerConnection) {
      console.warn(
        'Attempting to handle offer before PeerConnection is initialized',
      );
      return;
    }
    try {
      if (PeerMessage.isDescription(peerMessage) && !!peerMessage.description) {
        const { description } = peerMessage;
        const offerCollision =
          description.type === 'offer' &&
          (this.makingOffer || this.peerConnection.signalingState !== 'stable');

        this.ignoreOffer = !this.rootStore.callStore.isPolite && offerCollision;
        if (this.ignoreOffer) return;

        await this.peerConnection.setRemoteDescription(description); // SRD rolls back as needed

        if (description.type == 'offer') {
          await this.peerConnection.setLocalDescription();
          this.rootStore.socketStore.socket.emit(
            'peer-message',
            { description: this.peerConnection.localDescription },
            this.rootStore.callStore.roomId,
            this.rootStore.callStore.partnerId,
          );
        }
      } else if (
        PeerMessage.isCandidate(peerMessage) &&
        !!peerMessage.candidate
      ) {
        try {
          await this.peerConnection.addIceCandidate(peerMessage.candidate);
        } catch (err) {
          if (!this.ignoreOffer) throw err; // Suppress ignored offer's candidates
        }
      }
    } catch (error) {
      console.warn(error);
    }
  };

  async addCanvasStream(canvasStream: MediaStream) {
    for (const track of canvasStream.getTracks()) {
      this.canvasStream = this.peerConnection.addTrack(track, canvasStream);
    }
  }

  async removeCanvasStream() {
    if (this.canvasStream) {
      this.peerConnection.removeTrack(this.canvasStream);
      this.canvasStream = null;
    }
  }

  cleanup() {
    this.peerConnection.close();
    this.rootStore.socketStore.socket.off('peer-message');
  }
}
