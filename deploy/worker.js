const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'accept, content-type',
};

const MAX_BYTES = 2_000_000;

function fail(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  });
}

/** Only plain web addresses: no file:, no loopback, no private networks. */
function allowedAddress(target) {
  let url;
  try {
    url = new URL(target);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return false;
  if (host.endsWith('.internal') || host.endsWith('.home.arpa')) return false;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.)/.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  if (host === '::1' || host.startsWith('[')) return false;
  return true;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/read') {
      if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
      const target = url.searchParams.get('url');
      if (!target) return fail('Missing url', 400);
      if (!allowedAddress(target)) return fail('That address cannot be opened', 400);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12_000);
      try {
        const upstream = await fetch(target, {
          redirect: 'follow',
          signal: controller.signal,
          headers: {
            'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) KnitsSafari/1.0',
            accept: 'text/html,application/xhtml+xml,application/json;q=0.9,text/plain;q=0.8,*/*;q=0.5',
            'accept-language': 'en-GB,en;q=0.9',
          },
        });

        const type = upstream.headers.get('content-type') || 'text/html; charset=utf-8';
        const buffer = await upstream.arrayBuffer();
        const body = buffer.byteLength > MAX_BYTES ? buffer.slice(0, MAX_BYTES) : buffer;

        return new Response(body, {
          status: upstream.status,
          headers: {
            'content-type': type,
            'cache-control': 'public, max-age=120',
            'x-knits-reader': '1',
            ...CORS,
          },
        });
      } catch {
        return fail('Could not reach that page', 502);
      } finally {
        clearTimeout(timer);
      }
    }

    return env.ASSETS.fetch(request);
  },
};
