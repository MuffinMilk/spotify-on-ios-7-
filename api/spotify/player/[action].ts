import { executePlayerActionServer } from '../../../src/server/spotifyApi';
import { getQueryParam, readJsonBody, sendJson, setCorsHeaders } from '../../../src/server/httpHelper';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  const action = getQueryParam(req, 'action');
  const body = await readJsonBody(req);
  const result = await executePlayerActionServer(action, {
    token: body.token,
    device_id: body.device_id,
    track_uri: body.track_uri
  });

  return sendJson(res, result.status, result.payload);
}
