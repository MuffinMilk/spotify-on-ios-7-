import { searchTracksServer } from '../../src/server/spotifyApi';
import { getQueryParam, sendJson, setCorsHeaders } from '../../src/server/httpHelper';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });

  const query = getQueryParam(req, 'q');
  const userToken = getQueryParam(req, 'token');

  const result = await searchTracksServer(query, userToken);
  return sendJson(res, 200, {
    tracks: result.tracks,
    source: result.source
  });
}
