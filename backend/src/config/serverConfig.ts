//#region networking modules
import cors from "cors";
import express, { Express } from "express";
//#endregion networking modules

//#region routing modules
import teamRoutes from "../routes/teamRoutes";
import userRoutes from "../routes/userRoutes";
import authRoutes from "../routes/authRoutes";
import notificationRoutes from "../routes/notificationRoute";
//#endregion routing modules

import { authorizeUser } from "../middleware/authMiddleware";
import { errorMessages } from "../utils/serverConfigUtil";

const path = require("path");

class Server {
  private static instance: Server | undefined;
  private app: Express;
  private paths: { [key: string]: string };
  private port: number;

  constructor() {
    this.app = express();
    this.paths = {
      teams: "/api/teams/",
      member: "/api/member/",
      user: "/api/user/",
      auth: "/api/auth/",
      notification: "/api/notification/",
      apidocs: "/api-docs",
    };
    this.port = parseInt(process.env.PORT as string) || 3000;

    this.init();
  }

  public getApp() {
    return this.app;
  }

  private init() {
    this.checks();
    this.middleware();
    this.routes();
  }

  private checks() {
    if (process.env.NODE_ENV === undefined)
      throw new Error(errorMessages.nodeEnv);
    if (process.env.FRONTEND_URL === undefined)
      throw new Error(errorMessages.frontendUrl);
    if (process.env.SECRET_KEY === undefined)
      throw new Error(errorMessages.secretKey);
    if (process.env.DATABASE_URL === undefined)
      throw new Error(errorMessages.databaseUrl);
  }

  private middleware() {
    this.app.use(express.json());
    this.app.use(cors({ origin: process.env.FRONTEND_URL as string }));
  }

  private routes() {
    this.app.use(this.paths.teams, authorizeUser, teamRoutes);
    this.app.use(this.paths.user, userRoutes);
    this.app.use(this.paths.auth, authRoutes);
    this.app.use(this.paths.notification, notificationRoutes);
    this.app.get(this.paths.apidocs, (req, res) => {
      res.sendFile(path.join(__dirname, "../utils/backend_specs.html"));
    });
  }

  public listen() {
    this.app.listen(this.port, () => {
      console.log(`helloworld: listening on port ${this.port}`);
    });
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new this();
    }

    return this.instance;
  }
}

const server = Server.getInstance();

export default server;
