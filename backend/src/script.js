"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
// Function to generate a random secret key of specified length
function generateSecretKey(length) {
    return crypto_1.default
        .randomBytes(Math.ceil(length / 2))
        .toString("hex")
        .slice(0, length);
}
// Generate a random secret key of 64 characters (256 bits)
const secretKey = generateSecretKey(64);
console.log("Generated Secret Key", secretKey);
// Example payload
const payload = { user_id: 123456, user_name: "abcdefg" };
// Sign the token
const token = jsonwebtoken_1.default.sign(payload, secretKey, {
    algorithm: "HS256",
    expiresIn: "1s",
});
console.log("Generated Token:", token);
const verifyToken = () => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, secretKey);
        console.log("Decoded Paylod: ", decoded);
    }
    catch (error) {
        console.log("typeof error:", error instanceof Error);
        if ("message" in error)
            console.log("Token verification failed:", error.message);
    }
    /*jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        console.error('Token verification failed:', err.message);
      } else {
        console.log('Decoded Payload:', decoded);
      }
    });*/
};
// Verify the token
setTimeout(verifyToken, 2000);
