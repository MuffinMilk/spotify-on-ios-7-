import { exchangeSpotifyAuthCode, getSpotifyCredentials } from '../../src/server/spotifyApi';
import { readJsonBody, sendJson, setCorsHeaders } from '../../src/server/httpHelper';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });

  if (req.method === 'GET') {
    const { clientId, clientSecret } = getSpotifyCredentials();
    return sendJson(res, 200, { clientId, hasSecret: Boolean(clientSecret) });
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const body = await readJsonBody(req);
  const code = String(body.code || '').trim();
  const redirectUri = String(body.redirect_uri || body.redirectUri || '').trim();
  const codeVerifier = String(body.code_verifier || body.codeVerifier || '').trim() || undefined;

  if (!code || !redirectUri) {
    return sendJson(res, 400, { error: 'Missing OAuth authorization code or redirect_uri' });
  }

  const result = await exchangeSpotifyAuthCode({ code, redirectUri, codeVerifier });
  if (result.error || !result.access_token) {
    return sendJson(res, 400, { error: result.error || 'Token exchange failed' });
  }

  return sendJson(res, 200, result);
}
