//#region networking modules
import '../instrument';
import * as Sentry from '@sentry/node';
import cors from 'cors';
import express, { Express } from 'express';
import rateLimit from 'express-rate-limit';
//#endregion networking modules

//#region routing modules

import teamRoutes from '../routes/teamRoutes';
import userRoutes from '../routes/userRoutes';
import authRoutes from '../routes/authRoutes';
import notificationRoutes from '../routes/notificationRoute';
import actionRoutes from '../routes/actionsRoute';
import wageRoutes from '../routes/wageRoute';
import claimRoutes from '../routes/claimRoute';
import weeklyClaimRoutes from '../routes/weeklyClaimRoute';
import expenseRoutes from '../routes/expenseRoute';
import uploadRoute from '../routes/uploadRoute';
import contractRoutes from '../routes/contractRoutes';
import electionsRoute from '../routes/electionsRoute';
import devRoutes from '../routes/devRoutes';
import statsRoutes from '../routes/statsRoute';
import healthRoutes from '../routes/healthRoutes';
import featureRoutes from '../routes/featureRoutes';

//#endregion routing modules

import { authorizeUser } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/roleMiddleware';
import { errorMessages } from '../utils/serverConfigUtil';

// Swagger import

import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
    },
  },
  apis: ['./src/routes/*.ts'], // Point to route files containing JSDoc comments
};
const swaggerSpec = swaggerJsdoc(options);

class Server {
  private static instance: Server | undefined;
  private app: Express;
  private paths: { [key: string]: string };
  private port: number;

  constructor() {
    this.app = express();
    // Trust proxy headers (needed for correct client IP detection behind load balancers/proxies)
    if (process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production') {
      this.app.set('trust proxy', true);
    }
    this.paths = {
      teams: '/api/teams/',
      member: '/api/member/',
      user: '/api/user/',
      auth: '/api/auth/',
      notification: '/api/notification/',
      actions: '/api/actions/',
      wage: '/api/wage/',
      weeklyClaim: '/api/weeklyclaim/',
      expense: '/api/expense/',
      claim: '/api/claim/',
      upload: '/api/upload/',
      constract: '/api/contract/',
      elections: '/api/elections/',
      stats: '/api/stats/',
      dev: '/api/dev/',
      health: '/api/health/',
      features: '/api/admin/features/',
    };
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100000, // max 100000 requests per windowMs
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
    if (process.env.NODE_ENV === undefined) throw new Error(errorMessages.nodeEnv);
    if (process.env.FRONTEND_URL === undefined) throw new Error(errorMessages.frontendUrl);
    if (process.env.SECRET_KEY === undefined) throw new Error(errorMessages.secretKey);
    if (process.env.DATABASE_URL === undefined) throw new Error(errorMessages.databaseUrl);
    if (process.env.CHAIN_ID === undefined) throw new Error(errorMessages.chainId);
  }

  private middleware() {
    this.app.use(express.json());
    const allowedOrigins = process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map((origin) => origin.trim())
      : [];
    console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
    console.log('Allowed Origins for CORS:', allowedOrigins);

    this.app.use(cors({ origin: allowedOrigins, credentials: true }));
  }

  private routes() {
    // Public health check endpoint (no auth required)
    this.app.use(this.paths.health, healthRoutes);

    this.app.use(this.paths.teams, authorizeUser, teamRoutes);
    this.app.use(this.paths.wage, authorizeUser, wageRoutes);
    this.app.use(this.paths.user, userRoutes);
    this.app.use(this.paths.auth, authRoutes);
    this.app.use(this.paths.notification, notificationRoutes);
    this.app.use(this.paths.actions, authorizeUser, actionRoutes);
    this.app.use(this.paths.claim, authorizeUser, claimRoutes);
    this.app.use(this.paths.expense, authorizeUser, expenseRoutes);
    this.app.use(this.paths.upload, authorizeUser, uploadRoute);
    this.app.use(this.paths.weeklyClaim, authorizeUser, weeklyClaimRoutes);
    this.app.use(this.paths.constract, authorizeUser, contractRoutes);
    this.app.use(this.paths.stats, authorizeUser, requireAdmin, statsRoutes);
    this.app.use(this.paths.features, authorizeUser, featureRoutes);

    // Dev routes - only available in development mode
    if (process.env.NODE_ENV === 'development') {
      this.app.use(this.paths.dev, devRoutes);
      console.log('🔧 Dev routes enabled for development environment');
    }

    this.app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    this.app.use(this.paths.elections, authorizeUser, electionsRoute);
    this.app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    // The error handler must be registered before any other error middleware and after all controllers
    Sentry.setupExpressErrorHandler(this.app);

    // Optional fallthrough error handler
    this.app.use(function onError(
      err: Error,
      _req: express.Request,
      res: express.Response,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _next: express.NextFunction
    ) {
      // The error id is attached to `res.sentry` to be returned
      // and optionally displayed to the user for support.
      console.error('Error:', err);
      res.statusCode = 500;
      res.end((res as { sentry?: string }).sentry + '\n');
    });

    this.app.get('/debug-sentry', function mainHandler() {
      throw new Error('My first Sentry error!');
    });
  }

  public listen() {
    this.app.listen(this.port, () => {
      console.log(`helloworld: listening on port ${this.port}`);
      console.log(`Swagger docs V2 available at http://localhost:${this.port}/docs`);
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
