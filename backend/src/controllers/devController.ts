import { Request, Response } from 'express';
import { privateKeyToAccount } from 'viem/accounts';
import { SiweMessage } from 'siwe';
import { errorResponse } from '../utils/utils';
import { DevSignatureRequest, DevSignatureResponse } from '../types';

/**
 * Generates a SIWE message and signature for development/testing purposes
 *
 * This endpoint is only available in development mode and should never be used in production.
 * It receives message parameters and a private key, then generates and signs a SIWE message.
 *
 * @param req - Express request containing messageParams and privateKey in body
 * @param res - Express response
 */
export const generateSiweSignature = async (req: Request, res: Response) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development') {
      return errorResponse(403, 'This endpoint is only available in development mode', res);
    }

    const { messageParams, privateKey }: DevSignatureRequest = req.body;

    // Validate required parameters
    if (!messageParams) {
      return errorResponse(400, 'Missing messageParams in request body', res);
    }

    if (!privateKey) {
      return errorResponse(400, 'Missing privateKey in request body', res);
    }

    const { nonce, address, domain, chainId, statement, uri } = messageParams;

    // Validate messageParams fields
    if (!nonce || !address || !domain || !chainId) {
      return errorResponse(
        400,
        'Missing required fields in messageParams: nonce, address, domain, chainId',
        res
      );
    }

    // Validate private key format
    if (!privateKey.startsWith('0x')) {
      return errorResponse(400, 'Private key must start with 0x', res);
    }

    // Validate address format
    if (!address.startsWith('0x') || address.length !== 42) {
      return errorResponse(400, 'Invalid Ethereum address format', res);
    }

    // Create account from private key
    const account = privateKeyToAccount(privateKey);

    // Verify that the address matches the private key
    if (account.address.toLowerCase() !== address.toLowerCase()) {
      return errorResponse(
        400,
        `Address ${address} does not match the provided private key (account: ${account.address})`,
        res
      );
    }

    const issuedAt = new Date().toISOString();

    // Create SIWE message
    const siweMessage = new SiweMessage({
      domain: domain,
      address: account.address,
      statement:
        statement || 'I accept the MetaMask Terms of Service: https://community.metamask.io/tos',
      uri: uri || `http://${domain}`,
      version: '1',
      chainId: chainId,
      nonce: nonce,
      issuedAt: issuedAt,
    });

    // Prepare the message to sign
    const messageStr = siweMessage.prepareMessage();

    // Sign the message
    const signature = await account.signMessage({ message: messageStr });

    const response: DevSignatureResponse = {
      success: true,
      message: messageStr,
      signature: signature,
      address: account.address,
      nonce: nonce,
      issuedAt: issuedAt,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error generating SIWE signature:', error);

    const response: DevSignatureResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    };

    return res.status(500).json(response);
  }
};

/**
 * Health check endpoint for dev routes
 */
export const devHealthCheck = (req: Request, res: Response) => {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return errorResponse(403, 'This endpoint is only available in development mode', res);
  }

  return res.status(200).json({
    success: true,
    message: 'Dev controller is available',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
};
