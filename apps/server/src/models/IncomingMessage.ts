import type { IncomingMessage as HttpIncomingMessage } from "http";
import type { JwtPayload } from "jsonwebtoken";

export interface IncomingMessage extends HttpIncomingMessage {
  _query: { sid: string | undefined };
  user: string | JwtPayload | undefined;
}
