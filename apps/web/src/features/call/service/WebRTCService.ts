import { PeerMessage } from '@mono/common-dto';
import { Assert } from '@/common/utils/Assert';
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

  private canvasSender: RTCRtpSender | null = null;
  private videoStreamId: string | null = null;

  private dataChannel: RTCDataChannel | null = null;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;

    this.peerConnection = new RTCPeerConnection(configuration);

    this.setupPeerListeners();
    this.setupSocketListeners();

    this.createDataChannel();

    Assert.isDefined(this.rootStore.mediaStore.stream, 'Stream is not defined');
    for (const track of this.rootStore.mediaStore.stream.getTracks()) {
      this.peerConnection.addTrack(track, this.rootStore.mediaStore.stream);
    }
  }

  private setupPeerListeners() {
    this.peerConnection.onnegotiationneeded = this.handleNegotiationNeeded;
    this.peerConnection.oniceconnectionstatechange =
      this.handleIceConnectionStateChange;
    this.peerConnection.onicecandidate = this.handleIceCandidate;
    this.peerConnection.ontrack = this.handleTrackEvent;
    this.peerConnection.ondatachannel = this.handleDataChannelEvent;
  }

  private setupSocketListeners() {
    Assert.isDefined(
      this.rootStore.socketStore.socket,
      'Socket is not defined',
    );
    this.rootStore.socketStore.socket.on('peer-message', this.handleOffer);
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
      console.debug('Data channel is open and ready to be used.');
    };

    this.dataChannel.onmessage = this.handleDataChannelMessage;
  }

  private handleNegotiationNeeded = async () => {
    Assert.isDefined(this.rootStore.callStore.roomId, 'roomId is not defined');
    Assert.isDefined(
      this.rootStore.callStore.partnerId,
      'partnerId is not defined',
    );
    try {
      this.makingOffer = true;

      await this.peerConnection.setLocalDescription();

      Assert.isDefined(
        this.rootStore.socketStore.socket,
        'socket is not defined',
      );
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

  private handleIceConnectionStateChange = () => {
    if (this.peerConnection.iceConnectionState === 'failed') {
      this.peerConnection.restartIce();
    }
  };

  private handleIceCandidate = (event: RTCPeerConnectionIceEvent) => {
    Assert.isDefined(this.rootStore.socketStore.socket);
    Assert.isDefined(this.rootStore.callStore.roomId);
    Assert.isDefined(this.rootStore.callStore.partnerId);

    if (event.candidate) {
      this.rootStore.socketStore.socket.emit(
        'peer-message',
        { candidate: event.candidate },
        this.rootStore.callStore.roomId,
        this.rootStore.callStore.partnerId,
      );
    }
  };

  private handleTrackEvent = (event: RTCTrackEvent) => {
    event.track.onunmute = () => {
      const remoteStream = event.streams[0];

      if (!this.rootStore.callStore.remoteStream) {
        this.rootStore.callStore.setRemoteStream(remoteStream);
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

  private handleDataChannelEvent = (event: RTCDataChannelEvent) => {
    this.dataChannel = event.channel;
    this.setupDataChannel();
  };

  private handleOffer = async (peerMessage: PeerMessage, _userId: string) => {
    Assert.isDefined(this.rootStore.socketStore.socket);
    Assert.isDefined(this.rootStore.callStore.roomId);
    Assert.isDefined(this.rootStore.callStore.partnerId);

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

        if (description.type === 'offer') {
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

  async addCanvasStream(canvasStream: MediaStream) {
    for (const track of canvasStream.getTracks()) {
      this.canvasSender = this.peerConnection.addTrack(track, canvasStream);
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
    if (this.canvasSender) {
      const track = this.canvasSender.track;
      if (track) {
        track.stop();
      }

      this.peerConnection.removeTrack(this.canvasSender);

      this.canvasSender = null;
    }
  }

  cleanup() {
    this.rootStore.socketStore.socket?.off('peer-message', this.handleOffer);

    this.cleanupDataChannel();

    if (this.peerConnection) {
      this.peerConnection.onnegotiationneeded = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.ondatachannel = null;

      this.peerConnection.close();
    }

    this.canvasSender = null;
    this.videoStreamId = null;
  }

  private cleanupDataChannel() {
    if (this.dataChannel) {
      this.dataChannel.onmessage = null;
      this.dataChannel.onopen = null;
      this.dataChannel.onerror = null;
      this.dataChannel.onclose = null;
      this.dataChannel.close();
      this.dataChannel = null;
    }
  }
}
