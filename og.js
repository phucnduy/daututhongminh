/**
 * /api/og?r=REPORT_ID
 * ───────────────────
 * Trả về HTML đầy đủ với OG tags đúng cho report.
 * Dùng cho share link — crawler sẽ hit endpoint này.
 * User bình thường sẽ được redirect về trang thật.
 */

const RAW_JSON = 'https://raw.githubusercontent.com/phucnduy/daututhongminh/main/reports.json';
const SITE_URL = 'https://daututhongminh-delta.vercel.app';
const SITE_NAME = 'Đầu Tư Thông Minh Group';
const DEFAULT_DESC = 'Báo cáo phân tích chứng khoán Việt Nam từ chuyên gia 20 năm kinh nghiệm.';

let _cache = null, _cacheAt = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getReports() {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL) return _cache;
  const r = await fetch(RAW_JSON);
  if (!r.ok) throw new Error('Cannot fetch reports');
  _cache = await r.json();
  _cacheAt = Date.now();
  return _cache;
}

function fmt(d) {
  if (!d) return '';
  const [y,m,dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}

function esc(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function isBot(ua) {
  if (!ua) return false;
  return /facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|TelegramBot|Slackbot|Discordbot|Googlebot|bingbot|ZaloCrawler|zalo/i.test(ua);
}

export default async function handler(req, res) {
  const rid = req.query.r;
  if (!rid) return res.redirect(302, '/reports');

  // Nếu không phải bot → redirect luôn về trang thật
  const ua = req.headers['user-agent'] || '';
  if (!isBot(ua)) {
    return res.redirect(302, `/reports?r=${encodeURIComponent(rid)}`);
  }

  // Bot → trả HTML với OG tags đúng
  try {
    const reports = await getReports();
    const report = reports.find(r => r.id === rid);

    if (!report) {
      return res.redirect(302, '/reports');
    }

    const isMarket = report.type === 'market';
    const title = report.title;
    const ticker = report.ticker ? ` [${report.ticker}]` : '';
    const fullTitle = `${title}${ticker} – ${SITE_NAME}`;
    const desc = report.desc || (
      isMarket
        ? `Báo cáo thị trường chứng khoán phiên ${fmt(report.date)}.`
        : `Phân tích cổ phiếu ${report.ticker || ''} ngày ${fmt(report.date)}.`
    );
    const canonical = `${SITE_URL}/reports?r=${rid}`;

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <title>${esc(fullTitle)}</title>
  <meta name="description" content="${esc(desc)}"/>
  <meta property="og:title" content="${esc(fullTitle)}"/>
  <meta property="og:description" content="${esc(desc)}"/>
  <meta property="og:url" content="${esc(canonical)}"/>
  <meta property="og:type" content="article"/>
  <meta property="og:site_name" content="${esc(SITE_NAME)}"/>
  <meta name="twitter:card" content="summary"/>
  <meta name="twitter:title" content="${esc(fullTitle)}"/>
  <meta name="twitter:description" content="${esc(desc)}"/>
  <link rel="canonical" href="${esc(canonical)}"/>
  <meta http-equiv="refresh" content="0;url=${esc(canonical)}"/>
  <script>location.replace('${canonical.replace(/'/g, "\\'")}');</script>
</head>
<body>
  <p>Đang chuyển hướng đến báo cáo...</p>
  <p><a href="${esc(canonical)}">${esc(title)}</a></p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    res.status(200).send(html);

  } catch (e) {
    res.redirect(302, `/reports?r=${encodeURIComponent(rid)}`);
  }
}
