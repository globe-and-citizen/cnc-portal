import { Response } from 'express';

export const errorResponse = (code: number, error: Error, res: Response) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log('process.env.NODE_ENV', process.env.NODE_ENV);
    if (error instanceof Error) console.log(error.stack);
    else console.log(error);
  }

  if (code !== 500 && typeof error === 'string')
    return res.status(code).json({
      message: error,
    });
  else if (code !== 500 && error instanceof Error) {
    return res.status(code).json({
      message: error.message,
    });
  } else {
    return res.status(code).json({
      message: 'Internal server error has occured',
      error: error.message ? error.message : '',
    });
  }
};

export const extractAddressAndNonce = (message: string) => {
  // Split the string into lines
  const lines = message.split('\n');

  // Iterate over each line to find the Ethereum address
  let address = null;
  let nonce = null;
  for (const line of lines) {
    // Check if the line contains a potential Ethereum address
    if (line.trim().startsWith('0x') && line.trim().length === 42) {
      address = line.trim();
    }

    // Check if the line contains a potential Nonce value
    if (!nonce && line.includes('Nonce:')) {
      nonce = line.split(':')[1].trim();
    }
    // Break if both Ethereum address and Nonce are found
    if (address && nonce) {
      break;
    }
  }

  if (!address) {
    throw new Error('Extract address error: Eth address missing ');
  }

  if (!nonce) throw new Error('Extract nonce error: Nonce missing');

  return { address, nonce };
};
