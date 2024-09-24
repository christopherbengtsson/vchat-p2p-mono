import { makeAutoObservable, runInAction } from "mobx";
import { ChatSocket } from "./model/SocketModel";

const configuration = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

export class WebRtcStore {
  peerConnection: RTCPeerConnection | null = null;
  localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;
  maybeSocket: ChatSocket | null = null;

  roomId: string = "";
  userId: string = "";

  localVideoEnabled: boolean = true;
  localAudioEnabled: boolean = true;

  remoteVideoEnabled: boolean = true;
  remoteAudioEnabled: boolean = true;

  constructor() {
    makeAutoObservable(this); // TODO: Add overrides
  }

  get socket() {
    if (!this.maybeSocket) {
      throw new Error("Socket is not initialized");
    }
    return this.maybeSocket;
  }

  init(socket: ChatSocket) {
    this.maybeSocket = socket;
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    this.socket.on("offer", (...data) => this.handleOffer(...data));
    this.socket.on("answer", (...data) => this.handleAnswer(...data));
    this.socket.on("ice-candidate", (...data) =>
      this.handleIceCandidate(...data)
    );
    this.socket.on("video-toggle", (...data) =>
      this.handleRemoteVideoToggle(...data)
    );
    this.socket.on("audio-toggle", (...data) =>
      this.handleRemoteAudioToggle(...data)
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

  setRoomAndUserId(roomId: string, userId: string) {
    this.roomId = roomId;
    this.userId = userId;
  }

  initializePeerConnection() {
    this.peerConnection = new RTCPeerConnection(configuration);
    this.peerConnection.onicecandidate = (ev) =>
      this.handleLocalIceCandidate(ev);
    this.peerConnection.ontrack = (ev) => this.handleTrack(ev);
  }

  async startLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      this.localStream.getTracks().forEach((track) => {
        if (!this.peerConnection) {
          throw new Error("PeerConnection not initialized");
        }
        this.peerConnection.addTrack(track, this.localStream!);
      });
    } catch (error) {
      console.error("Error accessing media devices:", error);
      throw error;
    }
  }
  async createOffer() {
    console.log("creating offer..");
    if (!this.peerConnection) {
      throw new Error("PeerConnection not initialized");
    }
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      this.socket.emit("offer", offer, this.roomId, this.userId);
    } catch (error) {
      console.error("Error creating offer:", error);
      throw error;
    }
  }

  private handleOffer = async (
    offer: RTCSessionDescriptionInit,
    _userId: string
  ) => {
    console.log("Received offer from user:", _userId);
    if (!this.peerConnection) {
      throw new Error("PeerConnection not initialized");
    }
    try {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.socket.emit("answer", answer, this.roomId, this.userId);
    } catch (error) {
      console.error("Error handling offer:", error);
      throw error;
    }
  };
  private handleAnswer = async (
    answer: RTCSessionDescriptionInit,
    _userId: string
  ) => {
    console.log("Received answer from user:", _userId);
    if (!this.peerConnection) {
      throw new Error("PeerConnection not initialized");
    }
    try {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    } catch (error) {
      console.error("Error handling answer:", error);
      throw error;
    }
  };
  private handleIceCandidate = (
    candidate: RTCIceCandidateInit,
    _userId: string
  ) => {
    if (!this.peerConnection) {
      throw new Error("PeerConnection not initialized");
    }
    try {
      this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("Error handling ICE candidate:", error);
      throw error;
    }
  };
  private handleLocalIceCandidate = (event: RTCPeerConnectionIceEvent) => {
    if (event.candidate) {
      this.socket.emit(
        "ice-candidate",
        event.candidate.toJSON(),
        this.roomId,
        this.userId
      );
    }
  };
  private handleTrack = (event: RTCTrackEvent) => {
    this.remoteStream = event.streams[0];
  };

  cleanup() {
    this.peerConnection?.close();
    this.localStream?.getTracks().forEach((track) => track.stop());
  }
}
