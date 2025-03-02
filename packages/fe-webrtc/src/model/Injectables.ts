import { InviteData, RoundData } from '@mono/common-dto';

export type InviteMessageHandler = (message: InviteData) => void;
export type GameRoundMessageHandler = (message: RoundData) => void;
export type InjectedCallback = InviteMessageHandler | GameRoundMessageHandler;

// Type helper for determining what handler to pass for each injectable key
export type InjectableHandler<K extends keyof Injectables> =
  K extends 'handleIncomingInviteMessage'
    ? InviteMessageHandler
    : K extends 'handleGameRoundMessage'
      ? GameRoundMessageHandler
      : NonNullable<Injectables[K]>;

// Type helper for handler parameter in removeInjectable
export type RemovableHandler<K extends keyof Injectables> = K extends
  | 'handleIncomingInviteMessage'
  | 'handleGameRoundMessage'
  ? InjectableHandler<K>
  : undefined;
export interface Injectables {
  handleIncomingInviteMessage?: InviteMessageHandler[];
  handleGameRoundMessage?: GameRoundMessageHandler[];

  setRemoteCanvasStream?: (stream: MediaStream) => void;
}
