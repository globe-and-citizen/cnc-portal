import { z } from 'zod';

// Validate incoming request from the client SDK
export const signRequestSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  path: z.string().min(1),
  body: z.string(), // The SDK sends the body as a stringified JSON
});

const ALLOWED_GAMMA_PATH_PREFIXES = [
  '/events',
  '/markets',
  '/trades',
  '/orders',
  '/positions',
  '/prices',
] as const;

// Define the custom Zod schema for the Gamma path
export const gammaPathSchema = z.object({
  // Zod is required by default; if 'url' is missing, safeParse fails
  url: z
    .string()
    .trim()
    .min(1, 'URL parameter cannot be empty')
    .transform((path) => (path.startsWith('/') ? path : `/${path}`))
    .refine((path) => !path.includes('..') && !path.includes('\\'), {
      message: 'Path traversal or malformed characters detected',
    })
    .refine((path) => ALLOWED_GAMMA_PATH_PREFIXES.some((prefix) => path.startsWith(prefix)), {
      message: 'Disallowed API prefix',
    }),
});

// The infer utility type helps get the final validated string type
type ValidatedGammaPath = z.infer<typeof gammaPathSchema>;
