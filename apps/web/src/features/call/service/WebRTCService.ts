import { Maybe, PeerMessage } from '@mono/common-dto';
import { Assert } from '@/common/utils/Assert';
import type { DataChannelMessage } from '@/stores/model/DataChannelMessage';
import { ChatSocket } from '@/stores/model/SocketModel';
import { GameData } from '@/stores/model/GameData';
import { webRTCConfig } from './config';

interface Observables {
  socket: Maybe<ChatSocket>;
  localStream: Maybe<MediaStream>;
  roomId: Maybe<string>;
  partnerSocketId: Maybe<string>;
  isPolite: boolean;
}

interface Setters {
  setRemoteStream: (stream: MediaStream) => void;
}

interface Callbacks {
  handlePartnerVideoToggle: (toggle: boolean) => void;
  handlePartnerAudioToggle: (toggle: boolean) => void;
}

interface Injectables {
  handleIncomingGameMessage?: (message: GameData) => void;
  setRemoteCanvasStream?: (stream: MediaStream) => void;
}

interface Params {
  observables: Observables;
  setters: Setters;
  callbacks: Callbacks;
  injectables: Maybe<Injectables>;
}

export class WebRTCService {
  private observables: Observables;
  private setters: Setters;
  private callbacks: Callbacks;
  injectables: Maybe<Injectables>;

  private peerConnection: RTCPeerConnection;

  private makingOffer = false;
  private ignoreOffer = false;

  private canvasSender: RTCRtpSender | null = null;

  private dataChannel: RTCDataChannel | null = null;

  private remoteVideoChatStreamId: Maybe<string>;

  constructor({ callbacks, observables, setters, injectables }: Params) {
    this.observables = observables;
    this.setters = setters;
    this.callbacks = callbacks;
    this.injectables = injectables;

    this.peerConnection = new RTCPeerConnection(webRTCConfig);

    this.setupPeerListeners();
    this.setupSocketListeners();

    this.createDataChannel();

    Assert.isDefined(
      this.observables.localStream,
      'Local stream is not defined',
    );
    for (const track of this.observables.localStream.getTracks()) {
      this.peerConnection.addTrack(track, this.observables.localStream);
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
    Assert.isDefined(this.observables.socket, 'Socket is not defined');
    this.observables.socket.on('peer-message', this.handleOffer);
  }

  private createDataChannel() {
    if (!this.observables.isPolite) {
      this.dataChannel = this.peerConnection.createDataChannel('game');
      this.setupDataChannel();
    }
  }

  private setupDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.debug('Data channel is open and ready to be used.');
      // Send the initial state for stream enabled status
      this.sendMessage({
        type: 'VIDEO_TOGGLE',
        toggle:
          this.observables.localStream?.getVideoTracks()[0].enabled ?? false,
      });
    };

    this.dataChannel.onmessage = this.handleDataChannelMessage;
  }

  private handleNegotiationNeeded = async () => {
    Assert.isDefined(this.observables.roomId, 'roomId is not defined');
    Assert.isDefined(
      this.observables.partnerSocketId,
      'partnerId is not defined',
    );
    try {
      this.makingOffer = true;

      await this.peerConnection.setLocalDescription();

      Assert.isDefined(this.observables.socket, 'socket is not defined');
      this.observables.socket.emit(
        'peer-message',
        { description: this.peerConnection.localDescription },
        this.observables.roomId,
        this.observables.partnerSocketId,
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
    Assert.isDefined(this.observables.socket);
    Assert.isDefined(this.observables.roomId);
    Assert.isDefined(this.observables.partnerSocketId);

    if (event.candidate) {
      this.observables.socket.emit(
        'peer-message',
        { candidate: event.candidate },
        this.observables.roomId,
        this.observables.partnerSocketId,
      );
    }
  };

  private handleTrackEvent = (event: RTCTrackEvent) => {
    event.track.onunmute = () => {
      const remoteStream = event.streams[0];
      const streamId = remoteStream.id;

      if (!this.remoteVideoChatStreamId) {
        this.remoteVideoChatStreamId = streamId;
        this.setters.setRemoteStream(remoteStream);
      } else if (this.remoteVideoChatStreamId !== streamId) {
        this.injectables?.setRemoteCanvasStream?.(remoteStream);
      }
    };
  };

  private handleDataChannelEvent = (event: RTCDataChannelEvent) => {
    this.dataChannel = event.channel;
    this.setupDataChannel();
  };

  private handleOffer = async (peerMessage: PeerMessage, _userId: string) => {
    Assert.isDefined(this.observables.socket);
    Assert.isDefined(this.observables.roomId);
    Assert.isDefined(this.observables.partnerSocketId);

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

        this.ignoreOffer = !this.observables.isPolite && offerCollision;
        if (this.ignoreOffer) return;

        await this.peerConnection.setRemoteDescription(description); // SRD rolls back as needed

        if (description.type === 'offer') {
          await this.peerConnection.setLocalDescription();
          this.observables.socket.emit(
            'peer-message',
            { description: this.peerConnection.localDescription },
            this.observables.roomId,
            this.observables.partnerSocketId,
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
        this.injectables?.handleIncomingGameMessage?.(message.data);
        break;

      case 'VIDEO_TOGGLE':
        this.callbacks.handlePartnerVideoToggle(message.toggle);
        break;

      case 'AUDIO_TOGGLE':
        this.callbacks.handlePartnerAudioToggle(message.toggle);
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
    this.observables.socket?.off('peer-message', this.handleOffer);

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
