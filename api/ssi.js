/**
 * Vercel Serverless Function – SSI FastConnect API Proxy
 * -------------------------------------------------------
 * Giải quyết CORS khi gọi SSI API từ trình duyệt.
 *
 * Cách dùng sau khi deploy:
 *   Đổi SSI_BASE trong watchlist.html / public-watchlist.html / index.html từ:
 *     https://fc-data.ssi.com.vn/api/v2/Market
 *   thành:
 *     https://daututhongminh-delta.vercel.app/api/ssi
 *
 *   URL call KHÔNG thay đổi gì khác, ví dụ:
 *     fetch(`${SSI_BASE}/AccessToken`, { method:'POST', ... })
 *     fetch(`${SSI_BASE}/DailyStockPrice?symbol=VCB&...`)
 *     fetch(`${SSI_BASE}/IntradayOhlc?symbol=VCB&resolution=1&...`)
 */

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // /api/ssi/AccessToken          → fc-data.ssi.com.vn/api/v2/Market/AccessToken
  // /api/ssi/DailyStockPrice?...  → fc-data.ssi.com.vn/api/v2/Market/DailyStockPrice?...
  // /api/ssi/IntradayOhlc?...     → fc-data.ssi.com.vn/api/v2/Market/IntradayOhlc?...
  const url = new URL(req.url, 'https://placeholder.com');
  const ssiPath = url.pathname.replace(/^\/api\/ssi/, '');
  const ssiUrl = `https://fc-data.ssi.com.vn/api/v2/Market${ssiPath}${url.search}`;

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
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'SSI unreachable', detail: err.message });
  }
}
