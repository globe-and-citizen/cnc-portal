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
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const utils_1 = require("../utils/utils");
const authenticateToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Extract the authorization header (optional)
        const authHeader = req.headers.authorization;
        // Check if authorization header exists
        if (!authHeader)
            return (0, utils_1.errorResponse)(401, "Unauthorized: Missing authorization header", res);
        // Split the header to separate scheme and token (if present)
        const parts = authHeader.split(" ");
        if (parts.length !== 2 || parts[0] !== "Bearer")
            return (0, utils_1.errorResponse)(401, "Invalid authorization format", res);
        // Extract the token from the second part
        const token = parts[1];
        const secretKey = process.env.SECRET_KEY;
        const payload = jsonwebtoken_1.default.verify(token, secretKey);
        if (!payload) {
            return (0, utils_1.errorResponse)(401, "Unauthorized: Missing jwt payload", res);
        }
        req.address = payload.address;
        next();
    }
    catch (error) {
        return (0, utils_1.errorResponse)(500, error, res);
    }
});
exports.authenticateToken = authenticateToken;
