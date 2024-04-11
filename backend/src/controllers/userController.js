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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNonce = exports.createUser = void 0;
const client_1 = require("@prisma/client");
const siwe_1 = require("siwe");
const utils_1 = require("../utils/utils");
const prisma = new client_1.PrismaClient();
/**
 *
 * @param req
 * @param res
 * @returns
 */
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { address } = req.params;
    const nonce = (0, siwe_1.generateNonce)();
    try {
        if (address) {
            yield prisma.user.create({
                data: {
                    address,
                    nonce,
                },
            });
            yield prisma.$disconnect();
            res.status(200).json({
                success: true,
                nonce,
            });
        }
        else {
            throw Error(`address empty, please user address`);
        }
    }
    catch (error) {
        yield prisma.$disconnect();
        return (0, utils_1.errorResponse)(500, error, res);
    }
});
exports.createUser = createUser;
/**
 *
 * @param req
 * @param res
 * @returns
 */
const getNonce = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { address } = req.params;
    try {
        if (!address)
            return (0, utils_1.errorResponse)(401, "Get nonce error: Missing user address", res);
        const user = yield prisma.user.findUnique({
            where: {
                address,
            },
        });
        yield prisma.$disconnect();
        if (!user)
            return res.status(200).json({
                success: true,
                nonce: false,
            });
        const nonce = user.nonce;
        return res.status(200).json({
            success: true,
            nonce,
        });
    }
    catch (error) {
        yield prisma.$disconnect();
        return (0, utils_1.errorResponse)(500, error, res);
    }
});
exports.getNonce = getNonce;
