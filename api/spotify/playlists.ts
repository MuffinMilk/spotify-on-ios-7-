import { fetchUserPlaylistsServer } from '../../src/server/spotifyApi';
import { getQueryParam, sendJson, setCorsHeaders } from '../../src/server/httpHelper';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });

  const userToken = getQueryParam(req, 'token');
  const playlists = await fetchUserPlaylistsServer(userToken);
  return sendJson(res, 200, { playlists });
}
