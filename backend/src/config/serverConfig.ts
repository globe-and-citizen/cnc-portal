//#region networking modules
import cors from "cors";
import express, {Express} from "express";
//#endregion networking modules

//#region routing modules
import teamRoutes from "../routes/teamRoutes";
import memberRoutes from "../routes/memberRoutes";
//#endregion routing modules

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class Server {
    private app: Express
    private paths: {[key: string]: string}
    private port: number

    constructor() {
        this.app = express()
        this.paths = {
            teams: "/api/teams/", //recommed defining top level path in config to keep DRY
            member: "/api/member", //recommed defining top level path in config to keep DRY
            auth: "/api/auth/"
        }
        this.port = parseInt(process.env.PORT as string) || 3000;

        this.init()
    }

    private init() {
        this.middleware()
        this.routes()
    }

    private middleware() {
        this.app.use(express.json());
        this.app.use(cors());
    }

    private routes() {
        this.app.use(teamRoutes); //recommend this.app.use(this.paths.teams, teamRoutes)
        this.app.use(memberRoutes); //recommend this.app.use(this.paths.member, memberRoutes)
    }

    public listen() {
        this.app.listen(this.port, () => {
            console.log(`helloworld: listening on port ${this.port}`);
        });
    }
}

const server = new Server()

export default server