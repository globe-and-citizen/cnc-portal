import { Request, Response } from 'express';
import { BuilderApiKeyCreds, buildHmacSignature } from '@polymarket/builder-signing-sdk';
import { errorResponse } from '../utils/utils';

const BUILDER_CREDENTIALS: BuilderApiKeyCreds = {
  key: process.env.POLYMARKET_BUILDER_API_KEY!,
  secret: process.env.POLYMARKET_BUILDER_SECRET!,
  passphrase: process.env.POLYMARKET_BUILDER_PASSPHRASE!,
};

/**
 * Controller to sign messages for Polymarket Builder authentication
 */
export const signBuilderMessage = async (req: Request, res: Response) => {
  try {
    const { method, path, body: requestBody } = req.body;

    // Validate Credentials
    if (
      !BUILDER_CREDENTIALS.key ||
      !BUILDER_CREDENTIALS.secret ||
      !BUILDER_CREDENTIALS.passphrase
    ) {
      return res.status(500).json({ error: 'Builder credentials not configured' });
    }

    const sigTimestamp = Date.now().toString();

    const signature = buildHmacSignature(
      BUILDER_CREDENTIALS.secret,
      parseInt(sigTimestamp),
      method,
      path,
      requestBody
    );

    return res.json({
      POLY_BUILDER_SIGNATURE: signature,
      POLY_BUILDER_TIMESTAMP: sigTimestamp,
      POLY_BUILDER_API_KEY: BUILDER_CREDENTIALS.key,
      POLY_BUILDER_PASSPHRASE: BUILDER_CREDENTIALS.passphrase,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

export const fetchMarketData = async (req: Request, res: Response) => {
  const GAMMA_BASE_URL = 'https://gamma-api.polymarket.com';

  const targetUrl = req.query.url;

  try {
    console.log(`Proxying request to: ${targetUrl}`);
    // Use Fetch to make the request to the Polymarket API from the backend
    const response = await fetch(`${GAMMA_BASE_URL}${targetUrl}`);

    // Forward the data received from Polymarket back to the frontend
    res.json(await response.json());
  } catch (error) {
    console.error('Error proxying request:', error);
    // Forward the original status code and error message
    return errorResponse(500, error, res);
  }
};
