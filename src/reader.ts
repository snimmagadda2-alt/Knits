/**
 * Safari's reader. Browsers cannot read most cross-origin pages directly, so the first
 * attempt is a direct fetch (works for CORS-friendly sites) and the second goes through
 * the reader endpoint deployed with the Knits site.
 */
const READER_ORIGIN = 'https://knits-3qflim-preview.freebuff.site';

export interface Span {
  text: string;
  href?: string;
}

export type ReaderBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; spans: Span[] }
  | { kind: 'list'; items: Span[][] }
  | { kind: 'quote'; spans: Span[] }
  | { kind: 'code'; text: string };

export interface ReaderDoc {
  url: string;
  title: string;
  host: string;
  blocks: ReaderBlock[];
}

const SKIP = 'script, style, noscript, svg, iframe, object, embed, nav, header, footer, aside, form, button, select, input, textarea, template';
const MAX_BLOCKS = 400;

function absolute(href: string | null, base: string): string | undefined {
  if (!href) return undefined;
  if (href.startsWith('#') || href.startsWith('javascript:')) return undefined;
  try {
    return new URL(href, base).href;
  } catch {
    return undefined;
  }
}

function spansFrom(node: Node, base: string, out: Span[] = []): Span[] {
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.textContent ?? '').replace(/\s+/g, ' ');
      if (text.trim()) out.push({ text });
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const element = child as HTMLElement;
    if (element.tagName === 'BR') {
      out.push({ text: ' ' });
      return;
    }
    if (element.tagName === 'A') {
      const label = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (!label) return;
      const href = absolute(element.getAttribute('href'), base);
      out.push(href ? { text: label, href } : { text: label });
      return;
    }
    spansFrom(element, base, out);
  });
  return out;
}

function textOf(spans: Span[]): string {
  return spans.map((span) => span.text).join('').replace(/\s+/g, ' ').trim();
}

function parse(html: string, url: string): ReaderDoc {
  const dom = new DOMParser();
  const parsed = dom.parseFromString(html, 'text/html');
  const baseTag = parsed.querySelector('base')?.getAttribute('href');
  const base = absolute(baseTag ?? null, url) ?? url;

  const title =
    parsed.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() ||
    parsed.title?.trim() ||
    new URL(url).host;

  parsed.querySelectorAll(SKIP).forEach((node) => node.remove());
  const root = parsed.querySelector('article, main, [role="main"], #content, .content') ?? parsed.body;

  const blocks: ReaderBlock[] = [];
  const push = (block: ReaderBlock) => {
    if (blocks.length >= MAX_BLOCKS) return;
    const last = blocks[blocks.length - 1];
    if (block.kind === 'paragraph' && last?.kind === 'paragraph' && textOf(last.spans) === textOf(block.spans)) return;
    blocks.push(block);
  };

  const walk = (node: Node) => {
    if (blocks.length >= MAX_BLOCKS) return;
    node.childNodes.forEach((child) => {
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const element = child as HTMLElement;
      const tag = element.tagName.toLowerCase();

      if (/^h[1-6]$/.test(tag)) {
        const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (text) push({ kind: 'heading', level: Math.min(Number(tag[1]), 3), text });
        return;
      }
      if (tag === 'p') {
        const spans = spansFrom(element, base);
        if (textOf(spans).length > 1) push({ kind: 'paragraph', spans });
        return;
      }
      if (tag === 'ul' || tag === 'ol') {
        const items = [...element.querySelectorAll(':scope > li')]
          .map((li) => spansFrom(li, base))
          .filter((spans) => textOf(spans).length > 1)
          .slice(0, 20);
        if (items.length) push({ kind: 'list', items });
        return;
      }
      if (tag === 'blockquote') {
        const spans = spansFrom(element, base);
        if (textOf(spans).length > 1) push({ kind: 'quote', spans });
        return;
      }
      if (tag === 'pre') {
        const text = (element.textContent ?? '').trim();
        if (text) push({ kind: 'code', text: text.slice(0, 2000) });
        return;
      }
      if (tag === 'img') return;

      // Tables, cells and text wrappers: keep the text (and links) as a block, which is
      // what makes table-based pages like search results readable.
      const inlineOnly = [...element.children].every((child) =>
        ['a', 'span', 'strong', 'em', 'b', 'i', 'code', 'small', 'time', 'br', 'mark'].includes(
          child.tagName.toLowerCase(),
        ),
      );
      if (inlineOnly) {
        const spans = spansFrom(element, base);
        if (textOf(spans).length > 1) push({ kind: 'paragraph', spans });
        return;
      }

      walk(element);
    });
  };

  walk(root);

  return { url, title, host: new URL(url).host, blocks };
}

async function fetchOnce(url: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(url, { signal, redirect: 'follow' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  if (!text.trim()) throw new Error('That page came back empty.');
  if (text.startsWith('{') && text.includes('"error"')) {
    try {
      const payload = JSON.parse(text) as { error?: string };
      if (payload.error) throw new Error(payload.error);
    } catch {
      /* not a reader error, treat as content */
    }
  }
  return text;
}

export async function readPage(target: string, signal?: AbortSignal): Promise<ReaderDoc> {
  const attempts = [target, `${READER_ORIGIN}/api/read?url=${encodeURIComponent(target)}`];
  let lastError = 'That page could not be read.';

  for (const attempt of attempts) {
    try {
      const html = await fetchOnce(attempt, signal);
      const doc = parse(html, target);
      if (doc.blocks.length > 0) return doc;
      lastError = 'That page had no readable text.';
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Network error';
    }
  }

  throw new Error(lastError);
}
