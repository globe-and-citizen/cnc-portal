"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
//#region networking modules
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
//#endregion networking modules
//#region routing modules
const teamRoutes_1 = __importDefault(require("../routes/teamRoutes"));
const memberRoutes_1 = __importDefault(require("../routes/memberRoutes"));
const userRoutes_1 = __importDefault(require("../routes/userRoutes"));
const authRoutes_1 = __importDefault(require("../routes/authRoutes"));
//#endregion routing modules
class Server {
    constructor() {
        this.app = (0, express_1.default)();
        this.paths = {
            teams: "/api/teams/", //recommed defining top level path in config to keep route DRY
            member: "/api/member/", //recommed defining top level path in config to keep route DRY
            user: "/api/user/",
            auth: "/api/auth/",
        };
        this.port = parseInt(process.env.PORT) || 3000;
        this.init();
    }
    init() {
        this.middleware();
        this.routes();
    }
    middleware() {
        this.app.use(express_1.default.json());
        this.app.use((0, cors_1.default)());
    }
    routes() {
        this.app.use(teamRoutes_1.default); //recommend this.app.use(this.paths.teams, teamRoutes)
        this.app.use(memberRoutes_1.default); //recommend this.app.use(this.paths.member, memberRoutes)
        this.app.use(this.paths.user, userRoutes_1.default);
        this.app.use(this.paths.auth, authRoutes_1.default);
    }
    listen() {
        this.app.listen(this.port, () => {
            console.log(`helloworld: listening on port ${this.port}`);
        });
    }
}
const server = new Server();
exports.default = server;
