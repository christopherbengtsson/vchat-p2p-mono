/* eslint-disable @typescript-eslint/no-empty-function */
import { InviteData, RoundData } from '@mono/common-dto';
import { WebRTCStateService } from '../WebRTCStateService.js';
import { AdHocService } from '../AdHocService.js';

describe('AdHocService', () => {
  describe('Injectable Functionality', () => {
    let webRTCState = WebRTCStateService.create();

    // Mock handlers
    const inviteHandler1 = vi.fn((_data: InviteData) => {});
    const inviteHandler2 = vi.fn((_data: InviteData) => {});
    const gameRoundHandler = vi.fn((_data: RoundData) => {});
    const canvasStreamHandler = vi.fn((_stream: MediaStream) => {});

    beforeEach(() => {
      webRTCState = WebRTCStateService.create();
    });
    afterEach(() => {
      vi.clearAllMocks();
    });

    describe('addInjectable', () => {
      it('should add a single message handler to an empty array', () => {
        AdHocService.addInjectable(
          webRTCState,
          'handleIncomingInviteMessage',
          inviteHandler1,
        );

        const state = webRTCState.getState();
        expect(state.injectables?.handleIncomingInviteMessage).toHaveLength(1);
        expect(state.injectables?.handleIncomingInviteMessage?.[0]).toBe(
          inviteHandler1,
        );
      });

      it('should add multiple message handlers to the same array', () => {
        AdHocService.addInjectable(
          webRTCState,
          'handleIncomingInviteMessage',
          inviteHandler1,
        );
        AdHocService.addInjectable(
          webRTCState,
          'handleIncomingInviteMessage',
          inviteHandler2,
        );

        const state = webRTCState.getState();
        expect(state.injectables?.handleIncomingInviteMessage).toHaveLength(2);
        expect(state.injectables?.handleIncomingInviteMessage).toContain(
          inviteHandler1,
        );
        expect(state.injectables?.handleIncomingInviteMessage).toContain(
          inviteHandler2,
        );
      });

      it('should add a game round message handler', () => {
        AdHocService.addInjectable(
          webRTCState,
          'handleGameRoundMessage',
          gameRoundHandler,
        );

        const state = webRTCState.getState();
        expect(state.injectables?.handleGameRoundMessage).toHaveLength(1);
        expect(state.injectables?.handleGameRoundMessage?.[0]).toBe(
          gameRoundHandler,
        );
      });

      it('should set a single-value injectable', () => {
        AdHocService.addInjectable(
          webRTCState,
          'setRemoteCanvasStream',
          canvasStreamHandler,
        );

        const state = webRTCState.getState();
        expect(state.injectables?.setRemoteCanvasStream).toBe(
          canvasStreamHandler,
        );
      });

      it('should replace existing single-value injectables', () => {
        const newCanvasStreamHandler = vi.fn((_stream: MediaStream) => {});

        AdHocService.addInjectable(
          webRTCState,
          'setRemoteCanvasStream',
          canvasStreamHandler,
        );
        AdHocService.addInjectable(
          webRTCState,
          'setRemoteCanvasStream',
          newCanvasStreamHandler,
        );

        const state = webRTCState.getState();
        expect(state.injectables?.setRemoteCanvasStream).toBe(
          newCanvasStreamHandler,
        );
        expect(state.injectables?.setRemoteCanvasStream).not.toBe(
          canvasStreamHandler,
        );
      });
    });

    describe('removeInjectable', () => {
      it('should remove a specific message handler', () => {
        AdHocService.addInjectable(
          webRTCState,
          'handleIncomingInviteMessage',
          inviteHandler1,
        );
        AdHocService.addInjectable(
          webRTCState,
          'handleIncomingInviteMessage',
          inviteHandler2,
        );

        AdHocService.removeInjectable(
          webRTCState,
          'handleIncomingInviteMessage',
          inviteHandler1,
        );

        const state = webRTCState.getState();
        expect(state.injectables?.handleIncomingInviteMessage).toHaveLength(1);
        expect(state.injectables?.handleIncomingInviteMessage?.[0]).toBe(
          inviteHandler2,
        );
        expect(state.injectables?.handleIncomingInviteMessage).not.toContain(
          inviteHandler1,
        );
      });

      it('should completely remove the array when the last message handler is removed', () => {
        AdHocService.addInjectable(
          webRTCState,
          'handleIncomingInviteMessage',
          inviteHandler1,
        );

        AdHocService.removeInjectable(
          webRTCState,
          'handleIncomingInviteMessage',
          inviteHandler1,
        );

        const state = webRTCState.getState();
        expect(state.injectables?.handleIncomingInviteMessage).toBeUndefined();
      });

      it('should remove a game round message handler', () => {
        AdHocService.addInjectable(
          webRTCState,
          'handleGameRoundMessage',
          gameRoundHandler,
        );

        AdHocService.removeInjectable(
          webRTCState,
          'handleGameRoundMessage',
          gameRoundHandler,
        );

        const state = webRTCState.getState();
        expect(state.injectables?.handleGameRoundMessage).toBeUndefined();
      });

      it('should completely remove a single-value injectable', () => {
        AdHocService.addInjectable(
          webRTCState,
          'setRemoteCanvasStream',
          canvasStreamHandler,
        );

        AdHocService.removeInjectable(webRTCState, 'setRemoteCanvasStream');

        const state = webRTCState.getState();
        expect(state.injectables?.setRemoteCanvasStream).toBeUndefined();
      });

      it('should handle removing a non-existent handler gracefully', () => {
        expect(() => {
          AdHocService.removeInjectable(
            webRTCState,
            'handleIncomingInviteMessage',
            inviteHandler1,
          );
        }).not.toThrow();

        const state = webRTCState.getState();
        expect(state.injectables?.handleIncomingInviteMessage).toBeUndefined();
      });
    });
  });
});
