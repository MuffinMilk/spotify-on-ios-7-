import { approvePairingRecord, createPairingRecord, getPairingRecord, isValidPairingCode } from '../src/server/pairingStore';
import {
  exchangeSpotifyAuthCode,
  executePlayerActionServer,
  fetchDevicesServer,
  fetchLikedTracksServer,
  fetchPlayerStateServer,
  fetchPlaylistTracksServer,
  fetchUserPlaylistsServer,
  getSpotifyAppToken,
  searchTracksServer
} from '../src/server/spotifyApi';
import { resolveFullLengthAudioUrl } from '../src/server/spotifyCore';
import { getQueryParam, readJsonBody, sendJson, setCorsHeaders } from '../src/server/httpHelper';

function extractRoutePath(req: any): string {
  const rewriteRoute = getQueryParam(req, '__route');
  if (rewriteRoute) {
    return rewriteRoute.replace(/^\/+|\/+$/g, '');
  }
  const rawUrl = String(req?.url || '').split('?')[0];
  return rawUrl.replace(/^\/api\/?/, '').replace(/^\/+|\/+$/g, '');
}

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }

  const route = extractRoutePath(req);
  const method = String(req.method || 'GET').toUpperCase();

  try {
    // Health check
    if (route === 'health' || route === '') {
      return sendJson(res, 200, { ok: true, status: 'ready' });
    }

    // Pairing routes
    if (route === 'pair/new') {
      const body = method === 'POST' ? await readJsonBody(req) : {};
      const username = String(body.username || getQueryParam(req, 'username') || '').trim() || undefined;
      const record = await createPairingRecord(username);
      return sendJson(res, 200, {
        pairing_code: record.code,
        code: record.code,
        status: record.status
      });
    }

    if (route.startsWith('pair/status/') || route.startsWith('status/')) {
      const code = route.split('/').pop()?.toUpperCase() || '';
      if (!isValidPairingCode(code)) {
        return sendJson(res, 400, { error: 'Invalid pairing code format', status: 'invalid' });
      }
      const record = await getPairingRecord(code);
      if (record.status === 'paired' && record.accessToken) {
        return sendJson(res, 200, {
          status: 'paired',
          access_token: record.accessToken,
          refresh_token: record.refreshToken,
          username: record.username,
          code: record.code
        });
      }
      return sendJson(res, 200, {
        status: 'pending',
        code: record.code
      });
    }

    if (route === 'pair/approve') {
      if (method !== 'POST') {
        return sendJson(res, 405, { error: 'Method not allowed' });
      }
      const body = await readJsonBody(req);
      const code = String(body.code || '').trim().toUpperCase();
      if (!isValidPairingCode(code)) {
        return sendJson(res, 400, { error: 'Pairing code must be 6 valid uppercase characters' });
      }
      let token = String(body.token || body.access_token || '').trim();
      const refreshToken = String(body.refresh_token || '').trim() || undefined;
      const username = String(body.username || '').trim().toLowerCase() || undefined;

      if (!token) {
        token = `BQD_xpotify_app_token_${code}_${Date.now()}`;
      }

      const result = await approvePairingRecord(code, token, username, refreshToken);
      if (!result.success || !result.record) {
        return sendJson(res, 400, { error: result.error || 'Failed to approve pairing code' });
      }

      return sendJson(res, 200, {
        success: true,
        code: result.record.code,
        status: 'paired',
        access_token: result.record.accessToken,
        username: result.record.username
      });
    }

    // Spotify OAuth & Catalog routes
    if (route === 'spotify/token') {
      if (method !== 'POST') {
        return sendJson(res, 405, { error: 'Method not allowed' });
      }
      const body = await readJsonBody(req);
      const code = String(body.code || '').trim();
      const redirectUri = String(body.redirect_uri || '').trim();
      const codeVerifier = String(body.code_verifier || '').trim() || undefined;

      if (!code || !redirectUri) {
        return sendJson(res, 400, { error: 'Authorization code and redirect_uri are required' });
      }

      const exchanged = await exchangeSpotifyAuthCode({ code, redirectUri, codeVerifier });
      if (exchanged.error || !exchanged.access_token) {
        return sendJson(res, 400, { error: exchanged.error || 'Spotify authorization failed' });
      }

      return sendJson(res, 200, {
        access_token: exchanged.access_token,
        refresh_token: exchanged.refresh_token,
        expires_in: exchanged.expires_in
      });
    }

    if (route === 'spotify/app-token') {
      const token = await getSpotifyAppToken();
      return sendJson(res, 200, {
        access_token: token || `BQD_xpotify_app_token_${Date.now()}`,
        live: Boolean(token)
      });
    }

    if (route === 'spotify/playlists') {
      const token = getQueryParam(req, 'token');
      const playlists = await fetchUserPlaylistsServer(token);
      return sendJson(res, 200, { playlists });
    }

    if (route === 'spotify/playlist-tracks') {
      const playlistId = getQueryParam(req, 'playlist_id');
      const playlistName = getQueryParam(req, 'name');
      const userToken = getQueryParam(req, 'token');
      const result = await fetchPlaylistTracksServer({ playlistId, playlistName, userToken });
      return sendJson(res, 200, result);
    }

    if (route === 'spotify/search') {
      const query = getQueryParam(req, 'q');
      const userToken = getQueryParam(req, 'token');
      if (!query) {
        return sendJson(res, 200, { tracks: [], source: 'empty' });
      }
      const result = await searchTracksServer(query, userToken);
      return sendJson(res, 200, result);
    }

    if (route === 'spotify/liked-tracks') {
      const userToken = getQueryParam(req, 'token');
      const tracks = await fetchLikedTracksServer(userToken);
      return sendJson(res, 200, { tracks });
    }

    if (route === 'spotify/devices') {
      const userToken = getQueryParam(req, 'token');
      const devices = await fetchDevicesServer(userToken);
      return sendJson(res, 200, { devices });
    }

    if (route === 'spotify/player') {
      const userToken = getQueryParam(req, 'token');
      const result = await fetchPlayerStateServer(userToken);
      return sendJson(res, result.status, result.payload);
    }

    if (route.startsWith('spotify/player/')) {
      if (method !== 'POST') {
        return sendJson(res, 405, { error: 'Method not allowed' });
      }
      const action = route.split('/')[2] || '';
      const body = await readJsonBody(req);
      const token = String(body.token || '').trim();
      const deviceId = String(body.device_id || '').trim();
      const trackUri = String(body.track_uri || '').trim();
      const result = await executePlayerActionServer(action, {
        token,
        device_id: deviceId,
        track_uri: trackUri
      });
      return sendJson(res, result.status, result.payload);
    }

    if (route === 'audio/resolve') {
      const title = getQueryParam(req, 'title');
      const artist = getQueryParam(req, 'artist');
      const audioUrl = resolveFullLengthAudioUrl(title, artist);
      return sendJson(res, 200, { audio_url: audioUrl, full_length: true });
    }

    return sendJson(res, 404, { error: `Unknown API route: ${route}` });
  } catch (err: any) {
    return sendJson(res, 500, { error: err?.message || 'Internal API error' });
  }
}
