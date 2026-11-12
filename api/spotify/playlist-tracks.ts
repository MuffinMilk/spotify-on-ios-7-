import { fetchPlaylistTracksServer } from '../../src/server/spotifyApi';
import { getQueryParam, sendJson, setCorsHeaders } from '../../src/server/httpHelper';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });

  const playlistId = getQueryParam(req, 'playlist_id');
  const playlistName = getQueryParam(req, 'name');
  const userToken = getQueryParam(req, 'token');

  const data = await fetchPlaylistTracksServer({ playlistId, playlistName, userToken });
  return sendJson(res, 200, {
    name: data.name,
    tracks: data.tracks,
    total: data.tracks.length,
    source: data.source
  });
}
