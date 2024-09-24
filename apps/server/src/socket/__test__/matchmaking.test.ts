import { describe, it, expect, vi } from "vitest";
import { setupMatchmaking } from "../matchmaking.js";
import { wrapSocketHandler } from "../../utils/wrapSocketHandler.js";
import logger from "../../utils/logger.js";

describe("Matchmaking", () => {
  it("should emit match-found when two users are in queue", () => {
    const socket = {
      id: "user1",
      join: vi.fn(),
      to: vi.fn(() => ({ emit: vi.fn() })),
      emit: vi.fn(),
      on: vi.fn(),
    };

    setupMatchmaking(socket as any, wrapSocketHandler);

    // Simulate first user joining
    socket.on.mock.calls[0][1]("user1");

    // Simulate second user joining
    socket.on.mock.calls[0][1]("user2");

    expect(socket.join).toHaveBeenCalledWith(expect.stringContaining("user"));
    expect(socket.to).toHaveBeenCalledWith(expect.stringContaining("user"));
    expect(socket.emit).toHaveBeenCalledWith(
      "match-found",
      "user2-user1",
      "user1",
      true
    );
  });

  it("should handle errors in skip-user event", () => {
    const spyOn = vi.spyOn(logger, "error");
    const socket = {
      on: vi.fn(),
      leave: vi.fn(() => {
        throw new Error("Test error");
      }),
    };

    setupMatchmaking(socket as any, wrapSocketHandler);

    const findMatchHandler = socket.on.mock.calls.find(
      (call) => call[0] === "skip-user"
    )![1];

    findMatchHandler("user1", "roomId");

    expect(spyOn).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(Error) }),
      "Socket handler error"
    );
  });
});
