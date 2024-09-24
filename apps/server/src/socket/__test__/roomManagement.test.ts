import { describe, it, expect, vi } from "vitest";
import { setupRoomManagement } from "../roomManagement.js";
import { wrapSocketHandler } from "../../utils/wrapSocketHandler.js";

describe("Room Management", () => {
  it("should handle join-room event", () => {
    const emitMock = vi.fn();
    const socket = {
      join: vi.fn(),
      to: vi.fn(() => ({ emit: emitMock })),
      on: vi.fn(),
    };

    setupRoomManagement(socket as any, wrapSocketHandler);

    const joinRoomHandler = socket.on.mock.calls.find(
      (call) => call[0] === "join-room"
    )![1];
    joinRoomHandler("room1", "user1");

    expect(socket.join).toHaveBeenCalledWith("room1");
    expect(socket.to).toHaveBeenCalledWith("room1");
    expect(emitMock).toHaveBeenCalledWith("user-connected", "user1");
  });

  it("should handle leave-room event", () => {
    const emitMock = vi.fn();
    const socket = {
      leave: vi.fn(),
      to: vi.fn(() => ({ emit: emitMock })),
      on: vi.fn(),
    };

    setupRoomManagement(socket as any, wrapSocketHandler);

    const leaveRoomHandler = socket.on.mock.calls.find(
      (call) => call[0] === "leave-room"
    )![1];
    leaveRoomHandler("room1", "user1");

    expect(socket.leave).toHaveBeenCalledWith("room1");
    expect(socket.to).toHaveBeenCalledWith("room1");
    expect(emitMock).toHaveBeenCalledWith("user-disconnected", "user1");
  });
});
