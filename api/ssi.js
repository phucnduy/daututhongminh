/**
 * Vercel Serverless Function – SSI FastConnect API Proxy
 * Hỗ trợ 2 cách gọi:
 *   /api/ssi?ep=AccessToken
 *   /api/ssi?ep=DailyOHLC&symbol=VCB&...
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();

  // Lấy endpoint và các params từ query string
  const url = new URL(req.url, 'https://placeholder.com');
  const ep  = url.searchParams.get('ep');

  if (!ep) return res.status(400).json({ error: 'Missing ep param' });

  // Xây URL SSI: bỏ param "ep", giữ lại tất cả params còn lại
  url.searchParams.delete('ep');
  const remaining = url.searchParams.toString();
  const ssiUrl = `https://fc-data.ssi.com.vn/api/v2/Market/${ep}${remaining ? '?' + remaining : ''}`;

  const headers = {
    'Accept': 'application/json',
    'Content-Type': req.headers['content-type'] || 'application/json',
  };
  if (req.headers['authorization']) {
    headers['Authorization'] = req.headers['authorization'];
  }

  try {
    const upstream = await fetch(ssiUrl, {
      method: req.method,
      headers,
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
      signal: AbortSignal.timeout(9000),
    });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'SSI unreachable', detail: err.message });
  }
}
