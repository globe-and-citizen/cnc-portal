"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySiwe = void 0;
const client_1 = require("@prisma/client");
const siwe_1 = require("siwe");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const utils_1 = require("../utils/utils");
const prisma = new client_1.PrismaClient();
const verifySiwe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { message, signature, address } = req.body;
        if (!message)
            return (0, utils_1.errorResponse)(401, "Auth error: Missing message", res);
        if (!signature)
            return (0, utils_1.errorResponse)(401, "Auth error: Missing signature", res);
        if (!address)
            return (0, utils_1.errorResponse)(401, "Auth error: Missing address", res);
        const user = yield prisma.user.findUnique({
            where: { address },
        });
        if (!user) {
            yield prisma.$disconnect();
            return (0, utils_1.errorResponse)(403, "Auth error: User not found", res);
        }
        const SIWEObject = new siwe_1.SiweMessage(message);
        yield SIWEObject.verify({ signature, nonce: user.nonce });
        //Update nonce for user
        const nonce = (0, siwe_1.generateNonce)();
        yield prisma.user.update({
            where: { address },
            data: { nonce },
        });
        yield prisma.$disconnect();
        const secretKey = process.env.SECRET_KEY;
        const accessToken = jsonwebtoken_1.default.sign({ address }, secretKey, { expiresIn: "24h" });
        return res.status(200).json({
            success: true,
            accessToken,
        });
    }
    catch (error) {
        yield prisma.$disconnect();
        return (0, utils_1.errorResponse)(500, error, res);
    }
});
exports.verifySiwe = verifySiwe;
