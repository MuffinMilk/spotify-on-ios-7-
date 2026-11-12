import { createPairingRecord } from '../../src/server/pairingStore';
import { getQueryParam, sendJson, setCorsHeaders } from '../../src/server/httpHelper';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });

  const username = getQueryParam(req, 'username');
  const record = await createPairingRecord(username || undefined);
  return sendJson(res, 200, {
    pairing_code: record.code,
    code: record.code,
    status: record.status
  });
}
