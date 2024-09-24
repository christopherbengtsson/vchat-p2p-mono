import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import { Server, type Socket as ServerSocket } from "socket.io";
import { createServer } from "node:http";
import { type AddressInfo } from "node:net";
import logger from "../utils/logger.js";
import { wrapSocketHandler } from "../utils/wrapSocketHandler.js";
import { setupMatchmaking } from "../socket/matchmaking.js";

const CLIENT_ID = "clientId";

describe("Client to Server", () => {
  let io: Server, serverSocket: ServerSocket, firstClientSocket: ClientSocket;

  beforeAll(() => {
    return new Promise<void>(async (resolve) => {
      const httpServer = createServer();
      io = new Server(httpServer);
      httpServer.listen(() => {
        const port = (httpServer.address() as AddressInfo).port;
        firstClientSocket = ioc(`http://localhost:${port}`, {
          autoConnect: false,
        });

        resolve();
      });
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();

    return new Promise<void>((resolve) => {
      firstClientSocket.on("connect", resolve);

      io.on("connection", (socket) => {
        serverSocket = socket;
        setupMatchmaking(serverSocket, wrapSocketHandler);
      });

      firstClientSocket.connect();
    });
  });

  afterEach(() => {
    firstClientSocket.disconnect();
  });

  afterAll(() => {
    io.close();
  });

  it("should put socket in queue", async () => {
    const spy = vi.spyOn(logger, "debug");
    firstClientSocket.emit("find-match", CLIENT_ID);

    await expect
      .poll(() => spy)
      .toHaveBeenCalledWith(expect.any(Object), "User added to waiting queue");
  });

  it("should put socket in queue", async () => {
    const spy = vi.spyOn(logger, "debug");
    firstClientSocket.emit("find-match", CLIENT_ID);

    await expect
      .poll(() => spy)
      .toHaveBeenCalledWith(expect.any(Object), "User added to waiting queue");
  });
});
