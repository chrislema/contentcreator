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

function startOAuthCallbackServer(expectedState) {
  let server;
  let codeSettled = false;
  let resolveCode;
  let rejectCode;

  const codePromise = new Promise((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });

  const close = () => {
    if (server?.listening) {
      server.close();
    }
  };

  const finish = (err, code) => {
    if (codeSettled) return;
    codeSettled = true;
    close();
    if (err) rejectCode(err);
    else resolveCode(code);
  };

  const readyPromise = new Promise((resolveReady, rejectReady) => {
    let readySettled = false;

    server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');

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
        finish(new Error(`Authorization error: ${error}`));
        return;
      }

      if (state !== expectedState || !code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<html><body><h2>Invalid callback</h2></body></html>');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>Authorized!</h2><p>You can close this window and return to ContentCreator.</p></body></html>');
      finish(null, code);
    });

    server.once('error', (e) => {
      const err = new Error(`Could not start callback server: ${e.message}`);
      if (readySettled) {
        finish(err);
      } else {
        rejectReady(err);
        close();
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      readySettled = true;
      resolveReady({
        redirectUri: `http://127.0.0.1:${port}/callback`,
        codePromise,
        close
      });
    });
  });

  return readyPromise;
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

function waitForCodeWithTimeout(callbackServer, timeoutMs) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      callbackServer.close();
      reject(new Error('Authorization timed out after 5 minutes'));
    }, timeoutMs);
  });

  return Promise.race([callbackServer.codePromise, timeoutPromise])
    .finally(() => clearTimeout(timeoutId));
}

// Full OAuth flow: discover, register, authorize, exchange
// Returns { accessToken, refreshToken, expiresAt, clientId }
async function runOAuthFlow(mcpUrl, onStatus) {
  const { verifier, challenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString('hex');
  let callbackServer = null;

  onStatus('Discovering OAuth endpoints...');
  const metadata = await discoverMetadata(mcpUrl);

  onStatus('Starting authorization callback...');
  callbackServer = await startOAuthCallbackServer(state);
  const { redirectUri } = callbackServer;

  try {
    onStatus('Registering client...');
    let clientId = null;
    try {
      const client = await registerClient(metadata, redirectUri);
      clientId = client.client_id;
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
    const code = await waitForCodeWithTimeout(callbackServer, 300000);

    onStatus('Exchanging code for token...');
    const tokens = await exchangeCodeForToken(metadata, clientId, code, verifier, redirectUri);

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null,
      clientId
    };
  } finally {
    callbackServer?.close();
  }
}

module.exports = { runOAuthFlow, refreshToken, discoverMetadata };
