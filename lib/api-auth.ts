import { NextResponse } from 'next/server';

/**
 * Validates API key from X-API-Key header
 * Supports API_SECRET_KEYS environment variable (comma-separated)
 */
export const validateApiKey = (request: Request): { valid: boolean; error?: NextResponse } => {
  const apiKey = request.headers.get('X-API-Key');

  if (!apiKey) {
    return {
      valid: false,
      error: NextResponse.json(
        { error: 'Missing API key', code: 'MISSING_API_KEY' },
        { status: 401 },
      ),
    };
  }

  const validKeys = getValidApiKeys();

  if (validKeys.length === 0) {
    return {
      valid: false,
      error: NextResponse.json(
        { error: 'API authentication not configured', code: 'AUTH_NOT_CONFIGURED' },
        { status: 500 },
      ),
    };
  }

  if (!validKeys.includes(apiKey.trim())) {
    return {
      valid: false,
      error: NextResponse.json(
        { error: 'Invalid API key', code: 'INVALID_API_KEY' },
        { status: 401 },
      ),
    };
  }

  return { valid: true };
};

/**
 * Gets valid API keys from environment variable
 * Supports both API_SECRET_KEY (single) and API_SECRET_KEYS (comma-separated)
 */
const getValidApiKeys = (): string[] => {
  // Check for API_SECRET_KEYS first (comma-separated)
  const keysEnv = process.env.API_SECRET_KEYS;
  if (keysEnv) {
    return keysEnv
      .split(',')
      .map((key) => key.trim())
      .filter((key) => key.length > 0);
  }

  // Fallback to API_SECRET_KEY (single key)
  const singleKey = process.env.API_SECRET_KEY;
  if (singleKey) {
    return [singleKey.trim()].filter((key) => key.length > 0);
  }

  return [];
};

/**
 * Middleware wrapper for API key validation
 * Use this in route handlers that require API key authentication
 */
export const requireApiKey = (handler: (request: Request, ...args: any[]) => Promise<NextResponse>) => {
  return async (request: Request, ...args: any[]): Promise<NextResponse> => {
    const validation = validateApiKey(request);
    if (!validation.valid) {
      return validation.error!;
    }
    return handler(request, ...args);
  };
};

