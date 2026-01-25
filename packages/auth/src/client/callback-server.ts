/**
 * Local HTTP callback server for OAuth redirects
 *
 * Spins up a temporary HTTP server to catch OAuth authorization callbacks.
 * Used during browser-based OAuth flows.
 */

import { createServer, Server, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { AddressInfo } from 'net';

/**
 * Result from OAuth callback
 */
export interface CallbackResult {
  /** Authorization code from the OAuth server */
  code: string;

  /** State parameter for CSRF protection */
  state: string;
}

/**
 * Error from OAuth callback
 */
export interface CallbackError {
  error: string;
  error_description?: string;
}

/**
 * Options for the callback server
 */
export interface CallbackServerOptions {
  /** Port to listen on (0 = auto-assign) */
  port?: number;

  /** Host to bind to (default: 127.0.0.1) */
  host?: string;

  /** Callback path (default: /callback) */
  path?: string;

  /** Timeout in milliseconds (default: 5 minutes) */
  timeout?: number;

  /** Custom success HTML */
  successHtml?: string;

  /** Custom error HTML */
  errorHtml?: string;
}

/**
 * Running callback server instance
 */
export interface CallbackServer {
  /** Full URL to use as redirect_uri */
  redirectUri: string;

  /** Port the server is listening on */
  port: number;

  /** Wait for the OAuth callback */
  waitForCallback(): Promise<CallbackResult>;

  /** Shutdown the server */
  shutdown(): Promise<void>;
}

const DEFAULT_SUCCESS_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Authentication Successful</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      height: 100vh; 
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container { 
      text-align: center; 
      padding: 40px;
      background: rgba(255,255,255,0.1);
      border-radius: 16px;
      backdrop-filter: blur(10px);
    }
    .success-icon { font-size: 64px; margin-bottom: 20px; }
    h1 { margin: 0 0 10px; font-size: 24px; }
    p { margin: 0; opacity: 0.9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon">✓</div>
    <h1>Authentication Successful</h1>
    <p>You can close this window and return to your application.</p>
  </div>
</body>
</html>
`;

const DEFAULT_ERROR_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Authentication Failed</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      height: 100vh; 
      margin: 0;
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      color: white;
    }
    .container { 
      text-align: center; 
      padding: 40px;
      background: rgba(0,0,0,0.2);
      border-radius: 16px;
    }
    .error-icon { font-size: 64px; margin-bottom: 20px; }
    h1 { margin: 0 0 10px; font-size: 24px; }
    p { margin: 0; opacity: 0.9; }
    .details { margin-top: 20px; font-size: 14px; opacity: 0.7; }
  </style>
</head>
<body>
  <div class="container">
    <div class="error-icon">✗</div>
    <h1>Authentication Failed</h1>
    <p>{{ERROR_MESSAGE}}</p>
    <p class="details">{{ERROR_DESCRIPTION}}</p>
  </div>
</body>
</html>
`;

/**
 * Start a local callback server for OAuth redirects
 *
 * @example
 * ```typescript
 * const server = await startCallbackServer({ port: 0 });
 * console.log('Redirect URI:', server.redirectUri);
 *
 * // Open browser to authorization URL with redirect_uri set to server.redirectUri
 *
 * const result = await server.waitForCallback();
 * console.log('Got code:', result.code);
 *
 * await server.shutdown();
 * ```
 */
export async function startCallbackServer(
  options: CallbackServerOptions = {}
): Promise<CallbackServer> {
  const {
    port = 0,
    host = '127.0.0.1',
    path = '/callback',
    timeout = 5 * 60 * 1000, // 5 minutes
    successHtml = DEFAULT_SUCCESS_HTML,
    errorHtml = DEFAULT_ERROR_HTML,
  } = options;

  let resolveCallback: (result: CallbackResult) => void;
  let rejectCallback: (error: Error) => void;

  const callbackPromise = new Promise<CallbackResult>((resolve, reject) => {
    resolveCallback = resolve;
    rejectCallback = reject;
  });

  // Create HTTP server
  const server: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://${host}:${port}`);

    if (url.pathname !== path) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    // Parse query parameters
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    if (error) {
      // OAuth error response
      const html = errorHtml
        .replace('{{ERROR_MESSAGE}}', error)
        .replace('{{ERROR_DESCRIPTION}}', errorDescription || '');

      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(html);

      rejectCallback(new Error(`OAuth error: ${error} - ${errorDescription || 'No description'}`));
      return;
    }

    if (!code) {
      const html = errorHtml
        .replace('{{ERROR_MESSAGE}}', 'Missing authorization code')
        .replace('{{ERROR_DESCRIPTION}}', 'The OAuth server did not return an authorization code.');

      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(html);

      rejectCallback(new Error('No authorization code received'));
      return;
    }

    if (!state) {
      const html = errorHtml
        .replace('{{ERROR_MESSAGE}}', 'Missing state parameter')
        .replace('{{ERROR_DESCRIPTION}}', 'The OAuth server did not return the state parameter.');

      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(html);

      rejectCallback(new Error('No state parameter received'));
      return;
    }

    // Success!
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(successHtml);

    resolveCallback({ code, state });
  });

  // Start listening
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.removeListener('error', reject);
      resolve();
    });
  });

  const actualPort = (server.address() as AddressInfo).port;
  const redirectUri = `http://${host}:${actualPort}${path}`;

  // Set up timeout
  const timeoutId = setTimeout(() => {
    rejectCallback(new Error(`OAuth callback timed out after ${timeout / 1000} seconds`));
  }, timeout);

  // Cleanup function
  const shutdown = async (): Promise<void> => {
    clearTimeout(timeoutId);
    return new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };

  return {
    redirectUri,
    port: actualPort,
    waitForCallback: async () => {
      try {
        return await callbackPromise;
      } finally {
        await shutdown().catch(() => {}); // Ignore shutdown errors
      }
    },
    shutdown,
  };
}

/**
 * Find an available port
 */
export async function findAvailablePort(preferredPort?: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(preferredPort || 0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      server.close(() => resolve(port));
    });
  });
}
