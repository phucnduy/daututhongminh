/**
 * Cloudflare Worker – SSI FastConnect API Proxy
 * Deploy: https://dash.cloudflare.com/workers
 *
 * Sau khi deploy, đổi SSI_BASE trong watchlist.html + index.html:
 *   TỪ: https://fc-data.ssi.com.vn/api/v2/Market
 *   THÀNH: https://TEN-WORKER.workers.dev/api
 */

const ALLOWED_ORIGINS = [
  'https://phucnduy.github.io',
  'https://daututhongminh.pages.dev',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
];

const SSI_API_BASE = 'https://fc-data.ssi.com.vn/api/v2/Market';

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin':  origin || '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
          'Access-Control-Max-Age':       '86400',
        }
      });
    }

    // Origin check
    const isAllowed = !origin || ALLOWED_ORIGINS.some(o => origin.startsWith(o));
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', time: new Date().toISOString() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin || '*' }
      });
    }

    // Proxy /api/* → SSI
    if (url.pathname.startsWith('/api')) {
      const ssiPath  = url.pathname.replace(/^\/api/, '');
      const ssiUrl   = `${SSI_API_BASE}${ssiPath}${url.search}`;
      const headers  = new Headers(request.headers);
      headers.delete('Host');
      headers.set('Accept', 'application/json');

      let upstream;
      try {
        upstream = await fetch(ssiUrl, {
          method:  request.method,
          headers: headers,
          body:    request.method !== 'GET' ? await request.text() : undefined,
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'SSI unreachable', detail: e.message }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin || '*' }
        });
      }

      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: {
          'Content-Type':                upstream.headers.get('Content-Type') || 'application/json',
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Credentials': 'true',
          'Cache-Control':               'no-store',
        }
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }
};
