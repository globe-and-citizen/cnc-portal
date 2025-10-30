import { z } from "zod";

/**
 * Authentication-related validation schemas
 * For SIWE (Sign-In with Ethereum) and JWT token validation
 */

// SIWE message validation schema
export const siweMessageSchema = z
  .string({ message: "SIWE message is required" })
  .min(100, "SIWE message is too short")
  .max(2000, "SIWE message is too long")
  .refine(
    (message) => {
      // Basic SIWE message format validation
      const requiredFields = [
        "wants you to sign in with your Ethereum account:",
        "URI:",
        "Version:",
        "Chain ID:",
        "Nonce:",
        "Issued At:",
      ];
      return requiredFields.every(field => message.includes(field));
    },
    {
      message: "Invalid SIWE message format. Message must contain required SIWE fields.",
    }
  )
  .refine(
    (message) => {
      // Validate Ethereum address format in message
      const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
      return addressMatch !== null;
    },
    {
      message: "SIWE message must contain a valid Ethereum address.",
    }
  );

// Ethereum signature validation schema
export const ethereumSignatureSchema = z
  .string({ message: "Signature is required" })
  .regex(
    /^0x[a-fA-F0-9]{130}$/,
    "Invalid signature format. Expected format: 0x followed by 130 hexadecimal characters"
  );

// SIWE authentication request body schema
export const siweAuthRequestSchema = z.object({
  message: siweMessageSchema,
  signature: ethereumSignatureSchema,
});

// JWT token validation schema
export const jwtTokenSchema = z
  .string({ message: "JWT token is required" })
  .min(1, "JWT token cannot be empty")
  .regex(
    /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
    "Invalid JWT token format"
  );

// Authorization header schema
export const authorizationHeaderSchema = z
  .string({ message: "Authorization header is required" })
  .regex(
    /^Bearer [A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
    "Invalid authorization header format. Expected format: 'Bearer <token>'"
  );

// Nonce validation schema
export const nonceSchema = z
  .string({ message: "Nonce is required" })
  .min(8, "Nonce must be at least 8 characters long")
  .max(64, "Nonce cannot exceed 64 characters")
  .regex(
    /^[a-zA-Z0-9]+$/,
    "Nonce must contain only alphanumeric characters"
  );

// Export types for TypeScript
export type SiweAuthRequest = z.infer<typeof siweAuthRequestSchema>;
export type EthereumSignature = z.infer<typeof ethereumSignatureSchema>;
export type SiweMessage = z.infer<typeof siweMessageSchema>;
export type JwtToken = z.infer<typeof jwtTokenSchema>;
export type AuthorizationHeader = z.infer<typeof authorizationHeaderSchema>;
export type Nonce = z.infer<typeof nonceSchema>;