import express, { urlencoded, json } from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";

export function createServer(): http.Server {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(json());
  app.use(urlencoded({ extended: true }));

  app.get("/", (_req, res) => {
    res.status(200).json({ msg: "Server is up and running" });
  });

  return http.createServer(app);
}
