//#region networking modules
import cors from "cors";
import express, { Express } from "express";
import rateLimit from "express-rate-limit";
//#endregion networking modules

//#region routing modules
import teamRoutes from "../routes/teamRoutes";
import userRoutes from "../routes/userRoutes";
import authRoutes from "../routes/authRoutes";
import notificationRoutes from "../routes/notificationRoute";
import actionRoutes from "../routes/actionsRoute";
import wageRoutes from "../routes/wageRoute";
import claimRoutes from "../routes/claimRoute";
import expenseRoutes from "../routes/expenseRoute";
import contractRoutes from "../routes/contractRoutes";
//#endregion routing modules

import { authorizeUser } from "../middleware/authMiddleware";
import { errorMessages } from "../utils/serverConfigUtil";

// Swagger import

import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Documentation",
      version: "1.0.0",
    },
  },
  apis: ["./src/routes/*.ts"], // Point to route files containing JSDoc comments
};
const swaggerSpec = swaggerJsdoc(options);
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
      actions: "/api/actions/",
      wage: "/api/wage/",
      expense: "/api/expense/",
      claim: "/api/claim/",
      constract: "/api/contract/",
      apidocs: "/api-docs",
    };
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // max 1000 requests per windowMs
    });

    this.app.use(limiter);
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
    if (process.env.CHAIN_ID === undefined)
      throw new Error(errorMessages.chainId);
  }

  private middleware() {
    this.app.use(express.json());
    this.app.use(cors({ origin: process.env.FRONTEND_URL as string }));
  }

  private routes() {
    this.app.use(this.paths.teams, authorizeUser, teamRoutes);
    this.app.use(this.paths.wage, authorizeUser, wageRoutes);
    this.app.use(this.paths.user, userRoutes);
    this.app.use(this.paths.auth, authRoutes);
    this.app.use(this.paths.notification, notificationRoutes);
    this.app.use(this.paths.actions, authorizeUser, actionRoutes);
    this.app.use(this.paths.claim, authorizeUser, claimRoutes);
    this.app.use(this.paths.expense, authorizeUser, expenseRoutes);
    this.app.use(this.paths.constract, authorizeUser, contractRoutes);
    this.app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    this.app.get(this.paths.apidocs, (req, res) => {
      res.sendFile(path.join(__dirname, "../utils/backend_specs.html"));
    });
  }

  public listen() {
    this.app.listen(this.port, () => {
      console.log(`helloworld: listening on port ${this.port}`);
      console.log(
        `Swagger docs available at http://localhost:${this.port}/api-docs`
      );
      console.log(
        `Swagger docs V2 available at http://localhost:${this.port}/docs`
      );
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
