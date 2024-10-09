import { makeAutoObservable, runInAction } from 'mobx';
import { PeerMessage } from '@mono/common-dto';
import { ChatSocket } from './model/SocketModel';

const configuration = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

// https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
export class WebRtcStore {
  peerConnection: RTCPeerConnection | null = null;
  localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;
  maybeSocket: ChatSocket | null = null;

  polite = false;
  makingOffer = false;
  ignoreOffer = false;

  roomId = '';
  partnerId = '';

  localVideoEnabled = true;
  localAudioEnabled = true;

  remoteVideoEnabled = true;
  remoteAudioEnabled = true;

  constructor() {
    makeAutoObservable(this, {
      polite: false,
      makingOffer: false,
      ignoreOffer: false,
    }); // TODO: Add overrides
  }

  get socket() {
    if (!this.maybeSocket) {
      throw new Error('Socket is not initialized');
    }
    return this.maybeSocket;
  }

  init(socket: ChatSocket) {
    this.maybeSocket = socket;
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    this.socket.on('peer-message', (...data) => this.handleOffer(...data));

    this.socket.on('video-toggle', (...data) =>
      this.handleRemoteVideoToggle(...data),
    );
    this.socket.on('audio-toggle', (...data) =>
      this.handleRemoteAudioToggle(...data),
    );
  }

  handleRemoteVideoToggle(enabled: boolean) {
    runInAction(() => {
      this.remoteVideoEnabled = enabled;
    });
  }
  handleRemoteAudioToggle(enabled: boolean) {
    runInAction(() => {
      this.remoteAudioEnabled = enabled;
    });
  }

  async start(roomId: string, userId: string, polite: boolean) {
    this.roomId = roomId;
    this.partnerId = userId;
    this.polite = polite;

    const pc = this.initializePeerConnection();

    const stream = await this.startLocalStream();
    for (const track of stream.getTracks()) {
      pc.addTrack(track, stream);
    }

    this.peerConnection = pc;
    this.localStream = stream;
  }

  private initializePeerConnection() {
    const peerConnection = new RTCPeerConnection(configuration);

    peerConnection.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true;

        await peerConnection.setLocalDescription();

        this.socket.emit(
          'peer-message',
          { description: peerConnection.localDescription },
          this.roomId,
          this.partnerId,
        );
      } catch (err) {
        console.error(err);
      } finally {
        this.makingOffer = false;
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      if (peerConnection.iceConnectionState === 'failed') {
        peerConnection.restartIce();
      }
    };

    peerConnection.onicecandidate = ({ candidate }) => {
      this.socket.emit(
        'peer-message',
        { candidate },
        this.roomId,
        this.partnerId,
      );
    };

    peerConnection.ontrack = ({ track, streams }) => {
      track.onunmute = () => {
        if (this.remoteStream) {
          return;
        }
        runInAction(() => {
          this.remoteStream = streams[0];
        });
      };
    };

    return peerConnection;
  }

  private async startLocalStream() {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000, // High quality audio
        channelCount: 1, // Mono audio
      },
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { min: 10, ideal: 30, max: 30 },
      },
    });
  }

  private handleOffer = async (peerMessage: PeerMessage, _userId: string) => {
    if (!this.peerConnection) {
      console.warn(
        'Attempting to handle offer before PeerConnection is initialized',
      );
      return;
    }

    try {
      if (PeerMessage.isDescription(peerMessage) && peerMessage.description) {
        const { description } = peerMessage;
        const offerCollision =
          description.type === 'offer' &&
          (this.makingOffer || this.peerConnection.signalingState !== 'stable');

        this.ignoreOffer = !this.polite && offerCollision;
        if (this.ignoreOffer) return;

        await this.peerConnection.setRemoteDescription(description); // SRD rolls back as needed

        if (description.type == 'offer') {
          await this.peerConnection.setLocalDescription();
          this.socket.emit(
            'peer-message',
            { description: this.peerConnection.localDescription },
            this.roomId,
            this.partnerId,
          );
        }
      } else if (
        PeerMessage.isCandidate(peerMessage) &&
        peerMessage.candidate
      ) {
        try {
          await this.peerConnection.addIceCandidate(
            peerMessage.candidate ?? undefined,
          );
        } catch (err) {
          if (!this.ignoreOffer) throw err; // Suppress ignored offer's candidates
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  cleanup() {
    this.peerConnection?.close();
    this.localStream?.getTracks().forEach((track) => track.stop());
  }
}
