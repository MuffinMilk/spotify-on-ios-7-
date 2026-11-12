import { getSpotifyAppToken, getSpotifyCredentials } from '../../src/server/spotifyApi';
import { sendJson, setCorsHeaders } from '../../src/server/httpHelper';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });

  const token = await getSpotifyAppToken();
  const { clientId } = getSpotifyCredentials();
  if (!token) {
    return sendJson(res, 200, { access_token: null, client_id: clientId, configured: false });
  }
  return sendJson(res, 200, { access_token: token, client_id: clientId, configured: true });
}
