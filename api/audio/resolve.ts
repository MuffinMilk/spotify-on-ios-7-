import { resolveFullLengthAudioUrl } from '../../src/server/spotifyCore';
import { getQueryParam, sendJson, setCorsHeaders } from '../../src/server/httpHelper';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });

  const title = getQueryParam(req, 'title');
  const artist = getQueryParam(req, 'artist');
  return sendJson(res, 200, { audio_url: resolveFullLengthAudioUrl(title, artist) });
}
