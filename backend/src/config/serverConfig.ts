//#region networking modules
import cors from "cors";
import express, { Express } from "express";
//#endregion networking modules

//#region routing modules
import teamRoutes from "../routes/teamRoutes";
import memberRoutes from "../routes/memberRoutes";
import userRoutes from "../routes/userRoutes";
import authRoutes from "../routes/authRoutes";
//#endregion routing modules

//import document generation util
import { generateDocs } from "../utils/swagger";
const path = require("path");

class Server {
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
    };
    this.port = parseInt(process.env.PORT as string) || 3000;

    this.init();
  }

  private init() {
    this.middleware();
    this.routes();
  }

  private middleware() {
    this.app.use(express.json());
    this.app.use(cors());
  }

  private routes() {
    this.app.use(this.paths.teams, teamRoutes);
    this.app.use(this.paths.member, memberRoutes);
    this.app.use(this.paths.user, userRoutes);
    this.app.use(this.paths.auth, authRoutes);
  }

  public listen() {
    this.app.get("/api-docs", (req, res) => {
      res.sendFile(path.join(__dirname, "../utils/backend_specs.html"));
    });
    generateDocs();

    this.app.listen(this.port, () => {
      console.log(`helloworld: listening on port ${this.port}`);
    });
  }
}

const server = new Server();

export default server;
