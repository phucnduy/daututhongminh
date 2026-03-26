/**
 * Vercel Serverless Function – SSI FastConnect API Proxy
 * File: api/ssi.js  →  Route: /api/ssi
 *
 * SSI_BASE trong tất cả file HTML:
 *   const SSI_BASE = 'https://daututhongminh-delta.vercel.app/api/ssi?ep=';
 *
 * Cách gọi:
 *   POST ${SSI_BASE}AccessToken                                (lấy token)
 *   GET  ${SSI_BASE}DailyStockPrice&symbol=VCB&market=HOSE&...
 *   GET  ${SSI_BASE}DailyIndex&indexId=VNINDEX&market=HOSE&...
 *   GET  ${SSI_BASE}IntradayOhlc&symbol=VCB&resolution=1&...
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();

  // Lấy tên endpoint từ ?ep=  (ví dụ: ?ep=AccessToken hoặc ?ep=DailyStockPrice)
  const url = new URL(req.url, 'https://x.com');
  const ep = url.searchParams.get('ep');
  if (!ep) {
    return res.status(400).json({ error: 'Missing ?ep= parameter', example: '/api/ssi?ep=AccessToken' });
  }

  // Xây URL SSI: xoá param 'ep', giữ lại các params còn lại
  url.searchParams.delete('ep');
  const ssiQuery = url.searchParams.toString();
  const ssiUrl = `https://fc-data.ssi.com.vn/api/v2/Market/${ep}${ssiQuery ? '?' + ssiQuery : ''}`;

  const forwardHeaders = {
    'Accept': 'application/json',
    'Content-Type': req.headers['content-type'] || 'application/json',
  };
  if (req.headers['authorization']) {
    forwardHeaders['Authorization'] = req.headers['authorization'];
  }

  try {
    const upstream = await fetch(ssiUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
    });

    // Nếu SSI trả HTML (lỗi Cloudflare), báo rõ
    const contentType = upstream.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      return res.status(502).json({ 
        error: 'SSI returned HTML (possibly blocked)', 
        status: upstream.status,
        url: ssiUrl 
      });
    }

    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'SSI unreachable', detail: err.message, url: ssiUrl });
  }
}
