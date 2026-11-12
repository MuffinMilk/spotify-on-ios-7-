import { getPairingRecord, isValidPairingCode } from '../../../src/server/pairingStore';
import { getQueryParam, sendJson, setCorsHeaders } from '../../../src/server/httpHelper';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });

  const code = getQueryParam(req, 'code').toUpperCase();
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
