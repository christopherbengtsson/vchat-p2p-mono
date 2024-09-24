import { makeAutoObservable } from "mobx";
import { io, type Socket } from "socket.io-client";

// Events sent from the client to the server
interface ClientToServerEvents {
  "send-message": (roomId: string, message: string) => void;
  "find-match": (userId: string) => void;
  "skip-user": (roomId: string, userId: string) => void;
  "join-room": (roomId: string, userId: string) => void;
  "leave-room": (roomId: string, userId: string) => void;
  offer: (
    offer: RTCSessionDescriptionInit,
    roomId: string,
    userId: string
  ) => void;
  answer: (
    answer: RTCSessionDescriptionInit,
    roomId: string,
    userId: string
  ) => void;
  "ice-candidate": (
    candidate: RTCIceCandidateInit,
    roomId: string,
    userId: string
  ) => void;
}

// Events sent from the server to the client
interface ServerToClientEvents {
  "receive-message": (message: string) => void;
  "match-found": (
    roomId: string,
    partnerId: string,
    createOffer: boolean
  ) => void;
  "user-skipped": () => void;
  "user-connected": (userId: string) => void;
  "user-disconnected": (userId: string) => void;
  offer: (offer: RTCSessionDescriptionInit, userId: string) => void;
  answer: (answer: RTCSessionDescriptionInit, userId: string) => void;
  "ice-candidate": (candidate: RTCIceCandidateInit, userId: string) => void;
}

export type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export class SocketStore {
  socketIO: Socket<ServerToClientEvents, ClientToServerEvents>;

  constructor(token: string) {
    this.socketIO = io("http://localhost:8000/video-chat", {
      autoConnect: false,
      extraHeaders: {
        authorization: `bearer ${token}`,
      },
    });

    makeAutoObservable(this, {
      socketIO: false,
    });

    this.setupListeners();
  }

  get socket() {
    return this.socketIO;
  }
  get connected() {
    return this.socketIO.connected;
  }
  get id() {
    const id = this.socketIO.id;
    if (!id) {
      throw new Error("Socket id is not defined");
    }
    return id;
  }

  connect() {
    this.socketIO?.connect();
  }

  disconnect() {
    this.socketIO?.disconnect();
  }

  findMatch() {
    this.socketIO.emit("find-match", this.id);
  }

  private setupListeners() {
    this.socketIO.on("connect", this.onConnect);
    this.socketIO.on("disconnect", this.onDisconnect);
  }
  private onConnect() {
    console.log("connected");
  }
  private onDisconnect() {
    console.log("disconnected");
  }
}
