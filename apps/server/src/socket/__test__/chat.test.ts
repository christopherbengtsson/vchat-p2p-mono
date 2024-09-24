import { describe, it, expect, vi } from "vitest";
import { setupChat } from "../chat.js";
import { wrapSocketHandler } from "../../utils/wrapSocketHandler.js";

describe("Chat", () => {
  it("should emit receive-message when send-message is called", () => {
    const emitMock = vi.fn();
    const socket = {
      to: vi.fn(() => ({ emit: emitMock })),
      on: vi.fn(),
    };

    setupChat(socket as any, wrapSocketHandler);

    const [eventName, handler] = socket.on.mock.calls[0];
    expect(eventName).toBe("send-message");

    handler("room1", "Hello, world!");

    expect(socket.to).toHaveBeenCalledWith("room1");
    expect(emitMock).toHaveBeenCalledWith("receive-message", "Hello, world!");
  });
});
