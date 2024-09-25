import { describe, it, expect, vi } from 'vitest';
import { setupWebRTC } from '../webRtc.js';
import { wrapSocketHandler } from '../../utils/wrapSocketHandler.js';

describe('WebRTC', () => {
  it('should handle offer event', () => {
    const emitMock = vi.fn();
    const socket = {
      to: vi.fn(() => ({ emit: emitMock })),
      on: vi.fn(),
    };

    setupWebRTC(socket as any, wrapSocketHandler);

    const offerHandler = socket.on.mock.calls.find(
      (call) => call[0] === 'offer',
    )![1];
    offerHandler({ type: 'offer', sdp: 'test-sdp' }, 'room1', 'user1');

    expect(socket.to).toHaveBeenCalledWith('room1');
    expect(emitMock).toHaveBeenCalledWith(
      'offer',
      { type: 'offer', sdp: 'test-sdp' },
      'user1',
    );
  });

  it('should handle answer event', () => {
    const emitMock = vi.fn();
    const socket = {
      to: vi.fn(() => ({ emit: emitMock })),
      on: vi.fn(),
    };

    setupWebRTC(socket as any, wrapSocketHandler);

    const answerHandler = socket.on.mock.calls.find(
      (call) => call[0] === 'answer',
    )![1];
    answerHandler({ type: 'answer', sdp: 'test-sdp' }, 'room1', 'user1');

    expect(socket.to).toHaveBeenCalledWith('room1');
    expect(emitMock).toHaveBeenCalledWith(
      'answer',
      { type: 'answer', sdp: 'test-sdp' },
      'user1',
    );
  });

  it('should handle ice-candidate event', () => {
    const emitMock = vi.fn();
    const socket = {
      to: vi.fn(() => ({ emit: emitMock })),
      on: vi.fn(),
    };

    setupWebRTC(socket as any, wrapSocketHandler);

    const iceCandidateHandler = socket.on.mock.calls.find(
      (call) => call[0] === 'ice-candidate',
    )![1];
    iceCandidateHandler({ candidate: 'test-candidate' }, 'room1', 'user1');

    expect(socket.to).toHaveBeenCalledWith('room1');
    expect(emitMock).toHaveBeenCalledWith(
      'ice-candidate',
      { candidate: 'test-candidate' },
      'user1',
    );
  });
});
