import { Response } from 'express';
import { captureBackendException } from './sentry';

export const errorResponse = (code: number, error: Error | string | unknown, res: Response) => {
  if (code >= 500) captureBackendException(error, { source: 'errorResponse', status: code });

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
      error: error instanceof Error && error.message ? error.message : '',
    });
  }
};
