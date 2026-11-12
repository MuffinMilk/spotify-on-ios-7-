import { approvePairingRecord, isValidPairingCode } from '../../src/server/pairingStore';
import { readJsonBody, sendJson, setCorsHeaders } from '../../src/server/httpHelper';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

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
