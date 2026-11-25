/**
 * Knits reader endpoint — /api/read?url=https://example.com
 *
 * Browsers cannot read most cross-origin pages and many sites refuse to be framed, so
 * Safari's Reader mode and the Google app fetch the page through this function instead.
 * It returns the page's HTML with a permissive CORS header, so both the website and the
 * installed app (served from 127.0.0.1) can use it.
 *
 * It fetches one http(s) URL, refuses loopback and private addresses (including through
 * redirects), caps the body at 2 MB and never echoes the target back as a file.
 */

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 9000;
const MAX_REDIRECTS = 3;
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36';

function isPrivate(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
  if (host === '::1' || host === '0.0.0.0') return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  if (/^(fc|fd|fe80)/.test(host)) return true;
  return false;
}

function parseTarget(raw) {
  if (typeof raw !== 'string' || !raw) return null;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (isPrivate(url.hostname)) return null;
  return url;
}

async function fetchPage(start) {
  let current = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response;
    try {
      response = await fetch(current.href, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': UA,
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'en-GB,en;q=0.9',
        },
      });
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) return response;
      const next = parseTarget(new URL(location, current).href);
      if (!next) throw new Error('That address cannot be read.');
      current = next;
      continue;
    }
    return response;
  }
  throw new Error('That page redirected too many times.');
}

export default async function handler(request, response) {
  response.setHeader('access-control-allow-origin', '*');
  response.setHeader('access-control-allow-methods', 'GET, OPTIONS');
  response.setHeader('access-control-allow-headers', 'content-type');

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  const raw = request.query?.url ?? new URL(request.url, 'http://localhost').searchParams.get('url');
  const target = parseTarget(Array.isArray(raw) ? raw[0] : raw);
  if (!target) {
    response.status(400).json({ error: 'That address cannot be read.' });
    return;
  }

  try {
    const page = await fetchPage(target);
    const body = await page.text();
    response.setHeader('content-type', 'text/html; charset=utf-8');
    response.setHeader('cache-control', 'public, max-age=300');
    response.status(page.ok ? 200 : page.status).send(body.slice(0, MAX_BYTES));
  } catch (error) {
    response.status(502).json({
      error: error instanceof Error ? error.message : 'That page could not be read.',
    });
  }
}
