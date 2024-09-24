import "dotenv/config";
import { createServer } from "./server.js";
import { setupSocketServer } from "./socket/setupSocketServer.js";
import logger from "./utils/logger.js";

const PORT = process.env.PORT || 8000;

const server = createServer();
setupSocketServer(server);

process.on("uncaughtException", (error) => {
  logger.error({ error }, "Uncaught Exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error({ reason, promise }, "Unhandled Rejection");
});

server.listen(Number(PORT), "0.0.0.0", () => {
  logger.info(`Server is running on port ${PORT}`);
});
