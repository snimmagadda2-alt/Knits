#!/usr/bin/env node
/**
 * Publish the self-update feed beside the site.
 *
 * Runs after `vite build` and needs nothing from the Debian toolchain — a static host
 * such as Vercel has Node and nothing else. It writes:
 *
 *   dist/web/version.json                          the build the app reports it is running
 *   dist/web/downloads/knits_<version>_web.tar.gz  the bundle an update installs
 *   dist/web/latest.json                           the manifest every install polls
 *
 * `scripts/build-deb.sh` runs it too, so a package and a deployment never disagree
 * about what the newest build is.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const WEB = join(ROOT, 'dist', 'web');
const DOWNLOADS = join(WEB, 'downloads');
const BLOCK = 512;

// The bundle is the app itself: no installers and no manifest, so an update cannot
// nest a .deb inside itself or ship a feed that describes the build it is replacing.
const SKIP = new Set(['downloads', 'latest.json']);

function walk(directory, prefix = '') {
  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...walk(join(directory, entry.name), name));
    else if (entry.isFile()) found.push(name);
  }
  return found.sort();
}

function header(name, size) {
  const block = Buffer.alloc(BLOCK, 0);
  let base = name;
  let prefix = '';
  if (Buffer.byteLength(name) > 100) {
    const cut = name.lastIndexOf('/');
    base = name.slice(cut + 1);
    prefix = name.slice(0, cut);
    if (Buffer.byteLength(base) > 100 || Buffer.byteLength(prefix) > 155) {
      throw new Error(`build-feed: ${name} is too long to put in the update bundle`);
    }
  }
  block.write(base, 0, 100, 'utf8');
  block.write('0000644\0', 100, 8, 'utf8'); // mode
  block.write('0000000\0', 108, 8, 'utf8'); // uid
  block.write('0000000\0', 116, 8, 'utf8'); // gid
  block.write(`${size.toString(8).padStart(11, '0')}\0`, 124, 12, 'utf8');
  block.write('00000000000\0', 136, 12, 'utf8'); // mtime, fixed so builds repeat exactly
  block.fill(0x20, 148, 156); // the checksum is computed with its own field as spaces
  block.write('0', 156, 1, 'utf8'); // regular file
  block.write('ustar\0', 257, 6, 'utf8');
  block.write('00', 263, 2, 'utf8');
  block.write(prefix, 345, 155, 'utf8');
  let sum = 0;
  for (const byte of block) sum += byte;
  block.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148, 8, 'utf8');
  return block;
}

/** A plain ustar archive, written here so publishing needs no `tar` on the host. */
function archive(files) {
  const parts = [];
  for (const file of files) {
    const data = readFileSync(join(WEB, file));
    parts.push(header(file, data.length), data);
    const padding = (BLOCK - (data.length % BLOCK)) % BLOCK;
    if (padding) parts.push(Buffer.alloc(padding, 0));
  }
  parts.push(Buffer.alloc(BLOCK * 2, 0)); // end of archive
  return Buffer.concat(parts);
}

const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
if (!existsSync(join(WEB, 'index.html'))) {
  console.error("build-feed: dist/web is missing — run 'vite build' first");
  process.exit(1);
}

writeFileSync(join(WEB, 'version.json'), `${JSON.stringify({ version })}\n`);

const files = walk(WEB).filter((file) => !SKIP.has(file.split('/')[0]));
const bundle = gzipSync(archive(files), { level: 9 });
const bundleName = `knits_${version}_web.tar.gz`;
mkdirSync(DOWNLOADS, { recursive: true });
writeFileSync(join(DOWNLOADS, bundleName), bundle);

const sha256 = createHash('sha256').update(bundle).digest('hex');
writeFileSync(
  join(WEB, 'latest.json'),
  `${JSON.stringify(
    { version, bundle: `downloads/${bundleName}`, sha256, size: bundle.length },
    null,
    2,
  )}\n`,
);

const kb = Math.round(bundle.length / 1024);
console.log(`build-feed: dist/web/downloads/${bundleName} (${kb} KB, sha256 ${sha256.slice(0, 12)}…)`);
console.log(`build-feed: dist/web/latest.json → ${version}`);
