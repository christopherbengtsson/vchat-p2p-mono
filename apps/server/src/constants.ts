import type { NodeEnv } from "./models/NodeEnv.js";

export const MODE = process.env.NODE_ENV as NodeEnv;
