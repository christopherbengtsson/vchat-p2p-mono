import { PeerMessage } from '@mono/common-dto';
import type { DataChannelMessage } from '@/stores/model/DataChannelMessage';
import { RootStore } from '@/stores/RootStore';

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

  dataChannel: RTCDataChannel | null = null;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;

    this.peerConnection = new RTCPeerConnection(configuration);
    this.setupPeerListeners();
    this.setupSocketListeners();

    this.createDataChannel();

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
          !this.rootStore.gameStore.remoteCanvasStream &&
          remoteStream.id !== this.videoStreamId
        ) {
          this.rootStore.gameStore.setRemoteCanvasStream(remoteStream);
        }
      };
    };

    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };
  }

  private setupSocketListeners() {
    this.rootStore.socketStore.socket.on('peer-message', (...data) =>
      this.handleOffer(...data),
    );
  }

  private createDataChannel() {
    if (!this.rootStore.callStore.isPolite) {
      this.dataChannel = this.peerConnection.createDataChannel('game');
      this.setupDataChannel();
    }
  }

  private setupDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('Data channel is open and ready to be used.');
    };

    this.dataChannel.onmessage = this.handleDataChannelMessage;
  }

  private handleDataChannelMessage = (event: MessageEvent) => {
    const message: DataChannelMessage = JSON.parse(event.data);

    switch (message.type) {
      case 'GAME':
        this.rootStore.gameStore.handleIncomingMessage(message.data);
        break;

      // TODO: Add cases for other message types (e.g., chat messages)
      default:
        console.warn('Unknown message:', message);
    }
  };

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

  sendMessage(message: DataChannelMessage) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(message));
    } else {
      console.warn('Data channel is not open. Cannot send message:', message);
    }
  }

  async removeCanvasStream() {
    if (this.canvasStream) {
      // Stop the track associated with the sender
      const track = this.canvasStream.track;
      if (track) {
        track.stop();
      }

      // Remove the sender from the peer connection
      this.peerConnection.removeTrack(this.canvasStream);

      // Nullify the canvasStream reference
      this.canvasStream = null;
    }
  }

  cleanup() {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      const senders = this.peerConnection.getSenders();

      senders.forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
        this.peerConnection.removeTrack(sender);
      });

      this.peerConnection.onnegotiationneeded = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.ondatachannel = null;

      this.peerConnection.close();
    }

    this.rootStore.socketStore.socket.off('peer-message', this.handleOffer);

    this.canvasStream = null;
    this.videoStreamId = null;
  }
}
