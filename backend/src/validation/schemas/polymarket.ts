import { z } from 'zod';

// Validate incoming request from the client SDK
export const signRequestSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  path: z.string().min(1),
  body: z.string(), // The SDK sends the body as a stringified JSON
});
