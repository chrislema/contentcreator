// MCP OAuth 2.1 Client - Authorization Code flow with PKCE
// Implements: metadata discovery, dynamic client registration, PKCE, token exchange
// Used for managed-auth MCP servers like Kit (app.kit.com/mcp)

const crypto = require('crypto');
const http = require('http');
const { shell } = require('electron');

// Generate PKCE code_verifier and code_challenge
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

// Discover OAuth metadata from the MCP server
async function discoverMetadata(baseUrl) {
  // Strip path, keep origin
  const url = new URL(baseUrl);
  const metadataUrl = `${url.origin}/.well-known/oauth-authorization-server`;

  const res = await fetch(metadataUrl, {
    headers: { 'MCP-Protocol-Version': '2024-11-05' }
  });

  if (res.ok) {
    return await res.json();
  }

  // Fallback to default endpoints
  return {
    authorization_endpoint: `${url.origin}/authorize`,
    token_endpoint: `${url.origin}/token`,
    registration_endpoint: `${url.origin}/register`
  };
}

// Dynamically register an OAuth client
async function registerClient(metadata, redirectUri) {
  if (!metadata.registration_endpoint) {
    throw new Error('No registration endpoint available. Cannot auto-register OAuth client.');
  }

  const res = await fetch(metadata.registration_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'ContentCreator',
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_method: 'none' // public client
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Client registration failed: HTTP ${res.status} ${errText.slice(0, 200)}`);
  }

  return await res.json();
}

// Create a temporary local HTTP server to catch the OAuth callback
function createCallbackServer(expectedState) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost');

      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      const state = url.searchParams.get('state');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><h2>Authorization failed</h2><p>You can close this window.</p></body></html>');
        server.close();
        reject(new Error(`Authorization error: ${error}`));
        return;
      }

      if (state !== expectedState || !code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<html><body><h2>Invalid callback</h2></body></html>');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body><h2>Authorized!</h2><p>You can close this window and return to ContentCreator.</p></body></html>');
      server.close();
      resolve(code);
    });

    server.on('error', reject);

    // Listen on a random available port
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve._port = port; // stash for the caller
    });
  });
}

// Wait for the callback server to give us the port
function startCallbackServer(expectedState) {
  return new Promise((resolve, reject) => {
    const callbacks = [];
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost');

      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      const state = url.searchParams.get('state');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body style="font-family:sans-serif"><h2>Authorization failed</h2><p>' + error + '</p><p>You can close this window.</p></body></html>');
        server.close();
        reject(new Error(`Authorization error: ${error}`));
        return;
      }

      if (state !== expectedState || !code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<html><body><h2>Invalid callback</h2></body></html>');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body style="font-family:sans-serif"><h2>Authorized!</h2><p>You can close this window and return to ContentCreator.</p></body></html>');
      server.close();
      resolve(code);
    });

    server.on('error', reject);

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      // Return both port and the promise-wrapped callback
      // We resolve the outer promise with the code when it comes
      // But caller needs the port first, so we return an object
      callbacks.push(port);
    });

    // Give caller access to the port via a property on the promise
    const originalThen = server.then;
    // Simpler: resolve with a wrapper
    const portPromise = new Promise((pResolve) => {
      const check = setInterval(() => {
        if (callbacks.length > 0) {
          clearInterval(check);
          pResolve(callbacks[0]);
        }
      }, 10);
    });

    // Attach port getter to the main promise
    const wrapper = {
      code: new Promise((res, rej) => {
        server._resolveCode = res;
        server._rejectCode = rej;
      }),
      getPort: () => portPromise
    };

    // Override the resolve/reject to also work on wrapper.code
    server._wrapperResolve = null;
    server._wrapperReject = null;

    // This is getting messy. Let me simplify.
    resolve(server);
  });
}

// Cleaner approach: returns { server, getPort, getCode }
function createOAuthServer(expectedState) {
  const codePromise = new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost');

      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      const state = url.searchParams.get('state');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body style="font-family:sans-serif"><h2>Authorization failed</h2><p>' + error + '</p><p>You can close this window.</p></body></html>');
        server.close();
        reject(new Error(`Authorization error: ${error}`));
        return;
      }

      if (state !== expectedState || !code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<html><body><h2>Invalid callback</h2></body></html>');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body style="font-family:sans-serif"><h2>Authorized!</h2><p>You can close this window and return to ContentCreator.</p></body></html>');
      server.close();
      resolve(code);
    });

    server.on('error', reject);
    server.listen(0, '127.0.0.1');
  });

  return codePromise;
}

// Exchange authorization code for tokens
async function exchangeCodeForToken(metadata, clientId, code, verifier, redirectUri) {
  const res = await fetch(metadata.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Token exchange failed: HTTP ${res.status} ${errText.slice(0, 200)}`);
  }

  return await res.json();
}

// Refresh an access token
async function refreshToken(metadata, clientId, refreshTokenValue) {
  const res = await fetch(metadata.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshTokenValue
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Token refresh failed: HTTP ${res.status} ${errText.slice(0, 200)}`);
  }

  return await res.json();
}

// Full OAuth flow: discover, register, authorize, exchange
// Returns { accessToken, refreshToken, expiresIn }
async function runOAuthFlow(mcpUrl, onStatus) {
  const { verifier, challenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString('hex');

  onStatus('Discovering OAuth endpoints...');
  const metadata = await discoverMetadata(mcpUrl);

  const redirectUri = 'http://localhost:3001/callback';

  onStatus('Registering client...');
  let clientId = null;
  let clientSecret = null;
  try {
    const client = await registerClient(metadata, redirectUri);
    clientId = client.client_id;
    clientSecret = client.client_secret;
  } catch (e) {
    throw new Error(`Could not register OAuth client: ${e.message}`);
  }

  // Build authorization URL
  const authUrl = new URL(metadata.authorization_endpoint);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state', state);

  onStatus('Opening browser for authorization...');
  await shell.openExternal(authUrl.toString());

  // Wait for the callback (with timeout)
  onStatus('Waiting for authorization callback...');
  const code = await Promise.race([
    waitForCallback(state),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Authorization timed out after 5 minutes')), 300000))
  ]);

  onStatus('Exchanging code for token...');
  const tokens = await exchangeCodeForToken(metadata, clientId, code, verifier, redirectUri);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || null,
    expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null
  };
}

// Start a local server on port 3001 and wait for the OAuth callback
function waitForCallback(expectedState) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost:3001');

      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      const state = url.searchParams.get('state');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body style="font-family:sans-serif"><h2>Authorization failed</h2><p>' + error + '</p><p>You can close this window.</p></body></html>');
        server.close();
        reject(new Error(`Authorization error: ${error}`));
        return;
      }

      if (state !== expectedState || !code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<html><body><h2>Invalid callback</h2></body></html>');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>Authorized!</h2><p>You can close this window and return to ContentCreator.</p></body></html>');
      server.close();
      resolve(code);
    });

    server.on('error', (e) => {
      reject(new Error(`Could not start callback server on port 3001: ${e.message}. Make sure nothing else is using that port.`));
    });

    server.listen(3001, '127.0.0.1');
  });
}

module.exports = { runOAuthFlow, refreshToken, discoverMetadata };
