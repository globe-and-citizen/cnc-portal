import { Address } from 'viem';

/**
 * Parameters required to generate a SIWE (Sign-In with Ethereum) message
 */
export interface MessageParams {
  /** Random nonce for the SIWE message */
  nonce: string;
  /** Ethereum address of the user */
  address: Address;
  /** Domain of the application (e.g., localhost, example.com) */
  domain: string;
  /** Chain ID of the blockchain network */
  chainId: number;
  /** Optional statement to include in the SIWE message */
  statement?: string;
  /** Optional URI to include in the SIWE message */
  uri?: string;
}

/**
 * Request body for the dev controller endpoint
 */
export interface DevSignatureRequest {
  /** SIWE message parameters */
  messageParams: MessageParams;
  /** Private key to sign the message with (hex string starting with 0x) */
  privateKey: `0x${string}`;
}

/**
 * Response from the dev controller endpoint
 */
export interface DevSignatureResponse {
  /** Whether the operation was successful */
  success: boolean;
  /** The generated SIWE message */
  message?: string;
  /** The signature of the message */
  signature?: string;
  /** The address that signed the message */
  address?: Address;
  /** The nonce used in the message */
  nonce?: string;
  /** ISO timestamp when the message was issued */
  issuedAt?: string;
  /** Error message if operation failed */
  error?: string;
  /** Timestamp of the operation */
  timestamp?: string;
}