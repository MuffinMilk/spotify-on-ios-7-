import { fetchDevicesServer } from '../../src/server/spotifyApi';
import { getQueryParam, sendJson, setCorsHeaders } from '../../src/server/httpHelper';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });

  const userToken = getQueryParam(req, 'token');
  if (!userToken) return sendJson(res, 401, { error: 'Missing token', devices: [] });

  const devices = await fetchDevicesServer(userToken);
  return sendJson(res, 200, { devices });
}
