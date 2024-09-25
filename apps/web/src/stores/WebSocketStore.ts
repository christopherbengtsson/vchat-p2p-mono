import { v4 as uuid } from 'uuid';

export class WebSocketStore {
  id = uuid();

  socket: WebSocket;

  constructor() {
    this.socket = new WebSocket('ws://localhost:8080/ws');
    this.setupListeners();
  }

  emitEvent(eventType: string, ...data: unknown[]) {
    const message = JSON.stringify({
      type: eventType,
      ...data,
    });
    this.socket.send(message);
  }

  findMatch() {
    this.emitEvent('find-match', this.id);
  }

  private setupListeners() {
    this.socket.addEventListener('connect', this.onConnect);
    this.socket.addEventListener('disconnect', this.onDisconnect);
  }
  private onConnect() {
    console.log('connected');
  }
  private onDisconnect() {
    console.log('disconnected');
  }
}
