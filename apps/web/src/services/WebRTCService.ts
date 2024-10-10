import { PeerMessage } from '@mono/common-dto';
import { ChatSocket } from '../stores/model/SocketModel';

const configuration = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

export class WebRTCService {
  peerConnection: RTCPeerConnection;
  remoteStream: MediaStream | null = null;
  localStream: MediaStream;

  private socket: ChatSocket;
  private onRemoteStream: VoidFunction;
  private isPolite: boolean;
  private roomId: string;
  private partnerId: string;

  private makingOffer = false;
  private ignoreOffer = false;

  constructor(
    socket: ChatSocket,
    mainStream: MediaStream,
    onRemoteStream: VoidFunction,
    roomId: string,
    partnerId: string,
    isPolite: boolean,
  ) {
    this.socket = socket;
    this.localStream = mainStream;
    this.onRemoteStream = onRemoteStream;
    this.roomId = roomId;
    this.partnerId = partnerId;
    this.isPolite = isPolite;

    this.peerConnection = new RTCPeerConnection(configuration);
    this.setupPeerListeners();
    this.setupSocketListeners();

    for (const track of this.localStream.getTracks()) {
      this.peerConnection.addTrack(track, this.localStream);
    }
  }

  private setupPeerListeners() {
    this.peerConnection.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true;

        await this.peerConnection.setLocalDescription();

        this.socket.emit(
          'peer-message',
          { description: this.peerConnection.localDescription },
          this.roomId,
          this.partnerId,
        );
      } catch (err) {
        console.error(err);
      } finally {
        this.makingOffer = false;
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      if (this.peerConnection.iceConnectionState === 'failed') {
        console.log('iceConnectionState failed');
        this.peerConnection.restartIce();
      }
    };

    this.peerConnection.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.socket.emit(
          'peer-message',
          { candidate },
          this.roomId,
          this.partnerId,
        );
      }
    };

    this.peerConnection.ontrack = ({ track, streams }) => {
      console.log('ontrack');
      track.onunmute = () => {
        if (this.remoteStream) {
          return;
        }

        this.remoteStream = streams[0];
        this.onRemoteStream();
      };
    };
  }

  private setupSocketListeners() {
    this.socket.on('peer-message', (...data) => this.handleOffer(...data));
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

        this.ignoreOffer = !this.isPolite && offerCollision;
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
        !!peerMessage.candidate
      ) {
        try {
          console.log('addIceCandidate', peerMessage.candidate);
          await this.peerConnection.addIceCandidate(
            peerMessage.candidate ?? undefined,
          );
          console.log('addIceCandidate success');
        } catch (err) {
          if (!this.ignoreOffer) throw err; // Suppress ignored offer's candidates
        }
      }
    } catch (error) {
      console.warn(error);
    }
  };

  toggleVideo(toggle: boolean) {
    this.localStream.getVideoTracks()[0].enabled = toggle;
  }

  toggleAudio(toggle: boolean) {
    this.localStream.getAudioTracks()[0].enabled = toggle;
  }

  cleanup() {
    this.peerConnection.close();
  }
}
