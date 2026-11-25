/**
 * The Knits shell: a Debian-style command set over the virtual file system.
 *
 * Everything is simulated inside Knits — the file system is `src/vfs.ts` plus an
 * in-memory overlay for whatever you create or delete, so `mkdir`, `touch` and `rm`
 * work for the session but never touch the computer. Commands are grouped the way
 * Debian groups them; `help` lists everything this shell implements.
 */
import { getNode, pathLabel, resolvePath } from './vfs';

export type LineKind = 'out' | 'err' | 'dim';
export interface ShellLine {
  text: string;
  kind: LineKind;
}

export interface ShellResult {
  lines: ShellLine[];
  cwd?: string[];
  clear?: boolean;
  close?: boolean;
}

export interface ShellApp {
  id: string;
  name: string;
  version: string;
}

export interface ShellContext {
  user: string;
  history: string[];
  apps: ShellApp[];
  /** Opens the Knits installer for a .deb/.pkg file. Returns false when it could not. */
  install: (fileName: string, source: string) => boolean;
  /** Launches an app by name or id. Returns false when there is no such app. */
  open: (name: string) => boolean;
}

const out = (text: string): ShellLine => ({ text, kind: 'out' });
const err = (text: string): ShellLine => ({ text, kind: 'err' });
const dim = (text: string): ShellLine => ({ text, kind: 'dim' });

/* ------------------------------------------------------------------ file system */

interface OverlayEntry {
  kind: 'file' | 'folder';
  content?: string;
  removed?: boolean;
}

const overlay = new Map<string, OverlayEntry>();
const vars = new Map<string, string>();
const keyOf = (parts: string[]) => parts.join('/');

function overlayEntry(parts: string[]): OverlayEntry | undefined {
  return overlay.get(keyOf(parts));
}

function hasOverlayChild(parts: string[]): boolean {
  const prefix = keyOf(parts) ? `${keyOf(parts)}/` : '';
  for (const [path, entry] of overlay) {
    if (path.startsWith(prefix) && path !== keyOf(parts) && !entry.removed) return true;
  }
  return false;
}

function exists(parts: string[]): boolean {
  const entry = overlayEntry(parts);
  if (entry) return !entry.removed;
  return parts.length === 0 || Boolean(getNode(parts)) || hasOverlayChild(parts);
}

function isDir(parts: string[]): boolean {
  const entry = overlayEntry(parts);
  if (entry) return !entry.removed && entry.kind === 'folder';
  if (parts.length === 0) return true;
  const node = getNode(parts);
  if (node) return node.kind === 'folder';
  return hasOverlayChild(parts);
}

function readText(parts: string[]): string | null {
  const entry = overlayEntry(parts);
  if (entry) return entry.removed || entry.kind !== 'file' ? null : entry.content ?? '';
  const node = getNode(parts);
  return node?.kind === 'file' ? node.content ?? '' : null;
}

function sizeOf(text: string): number {
  return new Blob([text]).size;
}

function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}

function dirNames(parts: string[]): string[] {
  const base = new Map<string, 'file' | 'folder'>();
  const node = getNode(parts);
  if (node?.kind === 'folder') for (const child of node.children ?? []) base.set(child.name, child.kind);
  const prefix = keyOf(parts) ? `${keyOf(parts)}/` : '';
  for (const [path, entry] of overlay) {
    if (!path.startsWith(prefix)) continue;
    const rest = path.slice(prefix.length);
    if (!rest || rest.includes('/')) continue;
    if (entry.removed) base.delete(rest);
    else base.set(rest, entry.kind);
  }
  return [...base.keys()].sort();
}

function entrySize(parts: string[], name: string): number {
  const text = readText([...parts, name]);
  return text ? sizeOf(text) : 4096;
}

function writeText(parts: string[], content: string): void {
  overlay.set(keyOf(parts), { kind: 'file', content });
}

function makeDir(parts: string[]): void {
  overlay.set(keyOf(parts), { kind: 'folder' });
}

function removePath(parts: string[]): void {
  const entry = overlayEntry(parts);
  if (entry && !getNode(parts)) {
    overlay.delete(keyOf(parts));
    return;
  }
  const kind = entry?.kind ?? getNode(parts)?.kind ?? 'file';
  overlay.set(keyOf(parts), { kind, removed: true });
}

function walk(parts: string[], visit: (path: string[], depth: number) => void, depth = 0): void {
  visit(parts, depth);
  for (const name of dirNames(parts)) {
    const child = [...parts, name];
    if (isDir(child)) walk(child, visit, depth + 1);
  }
}

/* ------------------------------------------------------------------ tokenising */

function tokenize(value: string): string[] {
  const tokens: string[] = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value))) tokens.push(match[1] ?? match[2] ?? match[3]);
  return tokens;
}

function expand(value: string, cwd: string[], ctx: ShellContext): string {
  return value.replace(/\$(\w+)|\$\{(\w+)\}/g, (_match, plain: string, braced: string) => {
    const name = plain || braced;
    if (name === 'HOME') return '/home/knits';
    if (name === 'USER' || name === 'LOGNAME') return ctx.user;
    if (name === 'PWD') return `/home/${pathLabel(cwd)}`;
    if (name === 'SHELL') return '/bin/knsh';
    if (name === 'HOSTNAME') return 'knits';
    return vars.get(name) ?? '';
  });
}

/* ------------------------------------------------------------------ formatting */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function stamp(): string {
  const now = new Date();
  return `${MONTHS[now.getMonth()]} ${String(now.getDate()).padStart(2)} ${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes(),
  ).padStart(2, '0')}`;
}

export const HELP = `Knits shell (knsh) — Debian-style commands

  file system
    ls [-l] [-a] [path]      list a directory
    cd [path]                change directory
    pwd                      print the working directory
    cat <file>…              print files
    head/tail [-n N] <file>  first / last lines
    wc [-l|-w|-c] [file]     count lines, words, bytes
    grep [-i] <text> [file]  search text
    find [path] [-name N]    walk a directory tree
    tree [path]              directory tree
    stat/file <path>         file information
    touch <file>…            create empty files
    mkdir [-p] <dir>…        create directories
    rmdir <dir>…             remove empty directories
    rm [-r] [-f] <path>…     remove files
    cp [-r] <src> <dst>      copy
    mv <src> <dst>           move or rename
    du [-sh] [path]          disk usage
    pwd, basename, dirname, which, whereis, type

  system
    uname [-a|-r|-m]  hostname  whoami  id  groups  users  who  w  last
    date  cal  uptime  free  df  lsblk  mount  lscpu  ps  top  kill  dmesg
    env  export NAME=value  history  passwd  clear  exit
    sudo <command>  systemctl  journalctl  shutdown  reboot  poweroff

  packages
    apt update|upgrade|install|remove|list|search
    dpkg -l | -L <pkg> | -i <file.deb>
    install                  how to install the Knits package

  network
    ip a  ifconfig  ss  netstat  ping <host>  curl <url>  wget <url>

  apps
    open <app>               launch Finder, Google, Notes, Safari…
    neofetch  help  man <command>

  text tools
    echo  printf  seq  sort  uniq  cut  tr  sed  sleep  alias
  Pipes work: ls | grep .deb | sort`;

const MANUAL: Record<string, string> = {
  ls: 'NAME\n    ls - list directory contents\n\nSYNOPSIS\n    ls [-l] [-a] [PATH]\n\nDESCRIPTION\n    Lists the entries of PATH (the working directory by default).\n    -l long format, -a include dotfiles.',
  cd: 'NAME\n    cd - change the working directory\n\nSYNOPSIS\n    cd [PATH]\n\nDESCRIPTION\n    With no PATH, changes to the home directory.',
  cat: 'NAME\n    cat - concatenate files and print them\n\nSYNOPSIS\n    cat FILE...',
  grep: 'NAME\n    grep - print lines matching a pattern\n\nSYNOPSIS\n    grep [-i] PATTERN [FILE...]\n\nDESCRIPTION\n    Reads files, or standard input when used in a pipe.',
  apt: 'NAME\n    apt - package manager\n\nSYNOPSIS\n    apt update | upgrade | install PACKAGE | remove PACKAGE | list [--installed] | search TEXT',
  dpkg: 'NAME\n    dpkg - install and list packages\n\nSYNOPSIS\n    dpkg -l [PACKAGE] | -L PACKAGE | -i FILE.deb\n\nDESCRIPTION\n    -i opens the Knits installer, the same wizard you get by right-clicking a .deb in Finder.',
  open: 'NAME\n    open - launch an app\n\nSYNOPSIS\n    open APP\n\nDESCRIPTION\n    Matches an app by name or id, the way the Dock does.',
  sudo: 'NAME\n    sudo - execute a command as another user\n\nSYNOPSIS\n    sudo COMMAND\n\nDESCRIPTION\n    In Knits you are already the only user, so this runs the command and says so.',
};

/* ------------------------------------------------------------------ pipelines */

function applyFilter(lines: ShellLine[], argv: string[]): ShellLine[] {
  const [command, ...args] = argv;
  const text = lines.map((line) => line.text);

  switch (command) {
    case 'grep': {
      const flags = args.filter((arg) => arg.startsWith('-'));
      const rest = args.filter((arg) => !arg.startsWith('-'));
      const pattern = rest[0] ?? '';
      const ignoreCase = flags.some((flag) => flag.includes('i'));
      const invert = flags.some((flag) => flag.includes('v'));
      const test = (line: string) =>
        ignoreCase ? line.toLowerCase().includes(pattern.toLowerCase()) : line.includes(pattern);
      return text.filter((line) => (invert ? !test(line) : test(line))).map(out);
    }
    case 'head': {
      const count = countFlag(args) ?? 10;
      return text.slice(0, count).map(out);
    }
    case 'tail': {
      const count = countFlag(args) ?? 10;
      return text.slice(-count).map(out);
    }
    case 'wc': {
      const words = text.join(' ').trim().split(/\s+/).filter(Boolean).length;
      return [out(`${text.length} ${words} ${sizeOf(text.join('\n'))}`)];
    }
    case 'sort': {
      const reverse = args.includes('-r');
      const sorted = [...text].sort((a, b) => a.localeCompare(b));
      return (reverse ? sorted.reverse() : sorted).map(out);
    }
    case 'uniq':
      return text.filter((line, index) => index === 0 || line !== text[index - 1]).map(out);
    case 'cut': {
      const field = Number(args[args.indexOf('-f') + 1] ?? '1');
      const delimiter = args.includes('-d') ? args[args.indexOf('-d') + 1] : '\t';
      return text.map((line) => out(line.split(delimiter)[field - 1] ?? ''));
    }
    case 'tr': {
      const [from, to] = args;
      if (!from || !to) return lines;
      return text.map((line) => out(line.split(from).join(to)));
    }
    case 'cat':
      return lines;
    default:
      return [err(`knsh: ${command}: command not found`)];
  }
}

function countFlag(args: string[]): number | null {
  const index = args.findIndex((arg) => arg === '-n' || arg === '-c');
  if (index >= 0) return Number(args[index + 1]) || 10;
  const inline = args.find((arg) => /^-\d+$/.test(arg));
  return inline ? Number(inline.slice(1)) : null;
}

/* ------------------------------------------------------------------ commands */

function calendar(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const header = `    ${MONTHS[month]} ${year}`;
  const week = 'Su Mo Tu We Th Fr Sa';
  const cells: string[] = Array.from({ length: first }, () => '  ');
  for (let day = 1; day <= days; day += 1) cells.push(String(day).padStart(2));
  const rows: string[] = [];
  for (let index = 0; index < cells.length; index += 7) rows.push(cells.slice(index, index + 7).join(' ').trimEnd());
  return [header, week, ...rows].join('\n');
}

function installedRows(ctx: ShellContext): ShellLine[] {
  const rows = [
    'Desired=Unknown/Install/Remove/Purge/Hold',
    '| Status=Not/Inst/Conf-files/Unpacked/halF-conf/Half-inst/trig-aWait/Trig-pend',
    '|/ Err?=(none)/Reinst-required (Status,Err: uppercase=bad)',
    '||/ Name                Version        Architecture Description',
    '+++-===================-==============-============-================================',
    `ii  knits               ${__VERSION__}          all          Knits desktop environment`,
    ...ctx.apps.map(
      (app) => `ii  ${app.name.toLowerCase().padEnd(19)} ${app.version.padEnd(14)} all          ${app.name} (Knits app)`,
    ),
  ];
  return rows.map(out);
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    const text = await response.text();
    return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000);
  } finally {
    clearTimeout(timer);
  }
}

export async function runShell(input: string, cwd: string[], ctx: ShellContext): Promise<ShellResult> {
  // `cmd && cmd` and `cmd; cmd` run in order, the way a Debian shell does.
  const commands = input
    .split(/\s*(?:&&|;)\s*/)
    .map((command) => command.trim())
    .filter(Boolean);
  if (!commands.length) return { lines: [] };

  const lines: ShellLine[] = [];
  let current = cwd;

  for (const command of commands) {
    const stages = command
      .split('|')
      .map((stage) => stage.trim())
      .filter(Boolean);
    if (!stages.length) continue;

    const first = await exec(tokenize(stages[0]), current, ctx);
    if (first.clear) return { lines: [], clear: true };
    if (first.close) return { lines: [], close: true };
    if (first.cwd) current = first.cwd;

    let output = first.lines;
    for (const stage of stages.slice(1)) output = applyFilter(output, tokenize(stage));
    lines.push(...output);
  }

  return { lines, cwd: keyOf(current) === keyOf(cwd) ? undefined : current };
}

async function exec(argv: string[], cwd: string[], ctx: ShellContext): Promise<ShellResult> {
  const [rawCommand, ...rawArgs] = argv;
  const command = rawCommand;
  const args = rawArgs.map((arg) => expand(arg, cwd, ctx));
  const flags = args.filter((item) => item.startsWith('-'));
  const rest = args.filter((item) => !item.startsWith('-'));
  // has('l') matches -l, -la and -al; has('L') stays case-sensitive for dpkg -L.
  const has = (letter: string) => flags.some((item) => item.replace(/^-+/, '').includes(letter));
  const target = (value: string | undefined, base = cwd) => (value ? resolvePath(base, value) : null);

  switch (command) {
    case 'help':
      return { lines: HELP.split('\n').map(out) };
    case 'man':
    case 'info':
      if (!rest[0]) return { lines: [err(`What manual page do you want?`)] };
      return { lines: (MANUAL[rest[0]] ?? `No manual entry for ${rest[0]}`).split('\n').map(dim) };
    case 'clear':
      return { lines: [], clear: true };
    case 'exit':
    case 'logout':
      return { lines: [], close: true };
    case 'pwd':
      return { lines: [out(`/home/${pathLabel(cwd)}`)] };
    case 'whoami':
      return { lines: [out(ctx.user)] };
    case 'id':
      return {
        lines: [
          out(
            `uid=1000(${ctx.user}) gid=1000(${ctx.user}) groups=1000(${ctx.user}),27(sudo),44(video),29(audio),108(netdev),46(plugdev),110(input)`,
          ),
        ],
      };
    case 'groups':
      return { lines: [out(`${ctx.user} sudo video audio netdev plugdev input`)] };
    case 'hostname':
      return { lines: [out('knits')] };
    case 'uname': {
      if (has('a')) {
        return {
          lines: [
            out(
              `Linux knits 6.1.0-18-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.76-1 (2024-02-01) x86_64 GNU/Linux · Knits ${__VERSION__}`,
            ),
          ],
        };
      }
      if (has('r')) return { lines: [out('6.1.0-18-amd64')] };
      if (has('m')) return { lines: [out('x86_64')] };
      if (has('n')) return { lines: [out('knits')] };
      return { lines: [out('Linux')] };
    }
    case 'date':
      return { lines: [out(new Date().toString())] };
    case 'cal':
      return { lines: calendar().split('\n').map(out) };
    case 'uptime':
      return {
        lines: [
          out(
            ` ${new Date().toTimeString().slice(0, 8)} up 42 min,  1 user,  load average: 0.08, 0.12, 0.09`,
          ),
        ],
      };
    case 'free': {
      return {
        lines: [
          out('               total        used        free      shared  buff/cache   available'),
          out('Mem:           16Gi       4.1Gi       9.2Gi       212Mi       2.7Gi        11Gi'),
          out('Swap:         2.0Gi          0B       2.0Gi'),
        ],
      };
    }
    case 'df': {
      const path = target(rest[0]) ?? cwd;
      const label = `/home/${pathLabel(path)}`.replace(/\/+$/, '') || '/';
      return {
        lines: [
          out('Filesystem      Size  Used Avail Use% Mounted on'),
          out('udev            7.9G     0  7.9G   0% /dev'),
          out('tmpfs           1.6G  1.4M  1.6G   1% /run'),
          out('/dev/sda1       128G   31G   91G  26% /'),
          out(`tmpfs           7.9G     0  7.9G   0% ${label}`),
        ],
      };
    }
    case 'du': {
      const path = target(rest[0]) ?? cwd;
      if (!exists(path)) return { lines: [err(`du: cannot access '${rest[0]}': No such file or directory`)] };
      let total = 0;
      walk(path, (nodePath) => {
        for (const name of dirNames(nodePath)) total += entrySize(nodePath, name);
      });
      return { lines: [out(`${has('s') ? `${sizeLabel(total)}\t/home/${pathLabel(path)}` : `${sizeLabel(total)}\t.`}`)] };
    }
    case 'ls': {
      const path = target(rest[0]) ?? cwd;
      if (!exists(path)) return { lines: [err(`ls: cannot access '${rest[0]}': No such file or directory`)] };
      if (!isDir(path)) return { lines: [out(rest[0] ?? path[path.length - 1])] };
      const names = dirNames(path);
      if (!names.length) return { lines: [] };
      if (has('l')) {
        const rows = names.map((name) => {
          const dir = isDir([...path, name]);
          const size = dir ? '4.0K' : sizeLabel(entrySize(path, name));
          return `${dir ? 'drwxr-xr-x' : '-rw-r--r--'} 1 ${ctx.user} ${ctx.user} ${size.padStart(5)} ${stamp()} ${name}`;
        });
        return { lines: [out(`total ${names.length}`), ...rows.map(out)] };
      }
      return { lines: [out(names.map((name) => (isDir([...path, name]) ? `${name}/` : name)).join(`   `))] };
    }
    case 'cd': {
      if (!rest[0] || rest[0] === '~') return { lines: [], cwd: [] };
      const path = target(rest[0]);
      if (!path) return { lines: [err(`cd: ${rest[0]}: No such file or directory`)] };
      if (!isDir(path)) {
        return { lines: [err(exists(path) ? `cd: ${rest[0]}: Not a directory` : `cd: ${rest[0]}: No such file or directory`)] };
      }
      return { lines: [], cwd: path };
    }
    case 'cat':
    case 'less':
    case 'more': {
      if (!rest.length) return { lines: [err('usage: cat FILE...')] };
      const lines: ShellLine[] = [];
      for (const name of rest) {
        const path = target(name);
        const text = path ? readText(path) : null;
        if (text === null) {
          lines.push(err(`cat: ${name}: ${path && isDir(path) ? 'Is a directory' : 'No such file or directory'}`));
          continue;
        }
        lines.push(...text.split('\n').map(out));
      }
      return { lines };
    }
    case 'head':
    case 'tail': {
      const path = target(rest[rest.length - 1]);
      const text = path ? readText(path) : null;
      if (text === null) return { lines: [err(`${command}: ${rest[rest.length - 1] ?? 'missing'}: No such file`)] };
      const count = countFlag(args) ?? 10;
      const rows = text.split('\n');
      return { lines: (command === 'head' ? rows.slice(0, count) : rows.slice(-count)).map(out) };
    }
    case 'wc': {
      const path = target(rest[rest.length - 1]);
      const text = path ? readText(path) : null;
      if (text === null) return { lines: [err(`wc: ${rest[rest.length - 1] ?? 'missing'}: No such file`)] };
      const lines = text.split('\n').length;
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      return { lines: [out(`${lines} ${words} ${sizeOf(text)} ${rest[rest.length - 1]}`)] };
    }
    case 'grep': {
      if (!rest.length) return { lines: [err('usage: grep [-i] PATTERN [FILE...]')] };
      const pattern = rest[0];
      const ignoreCase = has('i');
      const files = rest.slice(1);
      const test = (line: string) =>
        ignoreCase ? line.toLowerCase().includes(pattern.toLowerCase()) : line.includes(pattern);
      if (!files.length) return { lines: [err('grep: reads from a pipe here: cat FILE | grep TEXT')] };
      const lines: ShellLine[] = [];
      for (const name of files) {
        const path = target(name);
        const text = path ? readText(path) : null;
        if (text === null) {
          lines.push(err(`grep: ${name}: No such file or directory`));
          continue;
        }
        text
          .split('\n')
          .filter(test)
          .forEach((line) => lines.push(out(files.length > 1 ? `${name}:${line}` : line)));
      }
      return { lines };
    }
    case 'find': {
      const start = target(args[0] && !args[0].startsWith('-') ? args[0] : '.') ?? cwd;
      const nameIndex = args.indexOf('-name');
      const pattern = nameIndex >= 0 ? (args[nameIndex + 1] ?? '').replace(/\*/g, '') : '';
      const lines: ShellLine[] = [];
      const visit = (parts: string[]) => {
        for (const name of dirNames(parts)) {
          const child = [...parts, name];
          if (!pattern || name.includes(pattern)) lines.push(out(`/home/${pathLabel(child)}`));
          if (isDir(child)) visit(child);
        }
      };
      if (!pattern) lines.push(out(`/home/${pathLabel(start)}`));
      visit(start);
      return { lines };
    }
    case 'tree': {
      const start = target(rest[0]) ?? cwd;
      const lines: ShellLine[] = [out(`/home/${pathLabel(start)}`) || '/home/knits'];
      let dirs = 0;
      let files = 0;
      const visit = (parts: string[], depth: number) => {
        const names = dirNames(parts);
        names.forEach((name, index) => {
          const child = [...parts, name];
          const branch = index === names.length - 1 ? '└── ' : '├── ';
          lines.push(out(`${'│   '.repeat(depth)}${branch}${name}`));
          if (isDir(child)) {
            dirs += 1;
            visit(child, depth + 1);
          } else {
            files += 1;
          }
        });
      };
      visit(start, 0);
      lines.push(out(''), dim(`${dirs} directories, ${files} files`));
      return { lines };
    }
    case 'stat': {
      const path = target(rest[0]);
      if (!path || !exists(path)) return { lines: [err(`stat: cannot statx '${rest[0]}': No such file or directory`)] };
      const dir = isDir(path);
      const size = dir ? 4096 : sizeOf(readText(path) ?? '');
      return {
        lines: [
          out(`  File: /home/${pathLabel(path)}`),
          out(`  Size: ${size}\tBlocks: ${Math.ceil(size / 512)}\tIO Block: 4096 ${dir ? 'directory' : 'regular file'}`),
          out(`Device: 8,1\tInode: ${1000 + keyOf(path).length * 7}\tLinks: 1`),
          out(`Access: (0${dir ? '755' : '644'}/-${dir ? 'rwxr-xr-x' : 'rw-r--r--'})  Uid: ( 1000/${ctx.user})   Gid: ( 1000/${ctx.user})`),
          out(`Modify: ${new Date().toUTCString()}`),
        ],
      };
    }
    case 'file': {
      const path = target(rest[0]);
      if (!path || !exists(path)) return { lines: [err(`file: cannot open '${rest[0]}' (No such file or directory)`)] };
      if (isDir(path)) return { lines: [out(`${rest[0]}: directory`)] };
      const name = path[path.length - 1] ?? '';
      const kind = name.endsWith('.deb')
        ? 'Debian binary package (Knits format), ASCII text'
        : name.endsWith('.pkg') || name.endsWith('.dmg')
          ? 'Knits package, ASCII text'
          : 'ASCII text';
      return { lines: [out(`${rest[0]}: ${kind}`)] };
    }
    case 'touch': {
      if (!rest.length) return { lines: [err('touch: missing file operand')] };
      const lines: ShellLine[] = [];
      for (const name of rest) {
        const path = target(name);
        if (!path) continue;
        if (!isDir(path.slice(0, -1))) {
          lines.push(err(`touch: cannot touch '${name}': No such file or directory`));
          continue;
        }
        if (!exists(path)) writeText(path, '');
      }
      return { lines };
    }
    case 'mkdir': {
      if (!rest.length) return { lines: [err('mkdir: missing operand')] };
      const lines: ShellLine[] = [];
      for (const name of rest) {
        const path = target(name);
        if (!path) continue;
        const parent = path.slice(0, -1);
        if (!isDir(parent) && !has('p')) {
          lines.push(err(`mkdir: cannot create directory '${name}': No such file or directory`));
          continue;
        }
        if (exists(path)) {
          lines.push(err(`mkdir: cannot create directory '${name}': File exists`));
          continue;
        }
        if (has('p')) {
          for (let depth = 1; depth <= path.length; depth += 1) {
            const slice = path.slice(0, depth);
            if (!exists(slice)) makeDir(slice);
          }
        } else {
          makeDir(path);
        }
      }
      return { lines };
    }
    case 'rmdir': {
      const lines: ShellLine[] = [];
      for (const name of rest) {
        const path = target(name);
        if (!path) continue;
        if (!isDir(path)) {
          lines.push(err(`rmdir: failed to remove '${name}': Not a directory`));
          continue;
        }
        if (dirNames(path).length) {
          lines.push(err(`rmdir: failed to remove '${name}': Directory not empty`));
          continue;
        }
        removePath(path);
      }
      return { lines };
    }
    case 'rm': {
      if (!rest.length) return { lines: [err('rm: missing operand')] };
      const lines: ShellLine[] = [];
      for (const name of rest) {
        const path = target(name);
        if (!path) continue;
        if (!exists(path)) {
          if (!has('f')) lines.push(err(`rm: cannot remove '${name}': No such file or directory`));
          continue;
        }
        if (isDir(path) && dirNames(path).length && !has('r')) {
          lines.push(err(`rm: cannot remove '${name}': Is a directory`));
          continue;
        }
        removePath(path);
      }
      return { lines };
    }
    case 'cp': {
      const [from, to] = rest;
      if (!from || !to) return { lines: [err('cp: missing file operand')] };
      const src = target(from);
      if (!src || !exists(src)) return { lines: [err(`cp: cannot stat '${from}': No such file or directory`)] };
      if (isDir(src)) return { lines: [err(`cp: -r not specified; omitting directory '${from}'`)] };
      let dst = target(to) ?? [];
      if (isDir(dst)) dst = [...dst, from.split('/').pop() ?? 'copy'];
      if (!isDir(dst.slice(0, -1))) return { lines: [err(`cp: cannot create '${to}': No such file or directory`)] };
      writeText(dst, readText(src) ?? '');
      return { lines: [] };
    }
    case 'mv': {
      const [from, to] = rest;
      if (!from || !to) return { lines: [err('mv: missing file operand')] };
      const src = target(from);
      if (!src || !exists(src)) return { lines: [err(`mv: cannot stat '${from}': No such file or directory`)] };
      if (isDir(src)) {
        makeDir(target(to) ?? []);
        removePath(src);
        return { lines: [] };
      }
      let dst = target(to) ?? [];
      if (isDir(dst)) dst = [...dst, from.split('/').pop() ?? 'moved'];
      writeText(dst, readText(src) ?? '');
      removePath(src);
      return { lines: [] };
    }
    case 'echo':
      return { lines: [out(args.join(' '))] };
    case 'printf':
      return { lines: [out((args[0] ?? '').replace(/\\n/g, '\n').replace(/%s/g, args[1] ?? ''))] };
    case 'seq': {
      const values = rest.map(Number);
      const [start, end] = values.length > 1 ? [values[0], values[1]] : [1, values[0] ?? 1];
      const step = values.length > 2 ? values[2] : 1;
      const lines: ShellLine[] = [];
      for (let value = start; step > 0 ? value <= end : value >= end; value += step) lines.push(out(String(value)));
      return { lines: lines.length ? lines : [err('seq: invalid argument')] };
    }
    case 'sleep':
      await new Promise((resolve) => setTimeout(resolve, Math.min(Number(rest[0] ?? 1), 5) * 1000));
      return { lines: [] };
    case 'sed': {
      // The two uses that matter day to day: print one line, and substitute text.
      const script = rest[0] ?? '';
      const path = target(rest[rest.length - 1]);
      const text = path ? readText(path) : null;
      if (text === null) return { lines: [err(`sed: can't read ${rest[rest.length - 1] ?? ''}: No such file`)] };
      const rows = text.split('\n');
      const substitute = /^s(.)(.*?)\1(.*?)\1([gi]*)$/.exec(script);
      if (substitute) {
        const [, , from, to, modifiers] = substitute;
        return {
          lines: rows.map((row) => {
            if (modifiers.includes('g')) return out(row.split(from).join(to));
            return out(row.replace(from, to));
          }),
        };
      }
      const print = /^(\d+)?(?:,(\d+))?p$/.exec(script);
      if (print) {
        const from = Number(print[1] ?? 1);
        const to = Number(print[2] ?? from);
        return { lines: rows.slice(from - 1, to).map(out) };
      }
      const quiet = args.indexOf('-n');
      if (quiet >= 0) {
        const after = args[quiet + 1] ?? '';
        const line = Number(after.replace(/p$/, ''));
        return { lines: line > 0 ? rows.slice(line - 1, line).map(out) : [] };
      }
      return { lines: rows.map(out) };
    }
    case 'sort':
    case 'uniq':
    case 'cut':
    case 'tr':
      return { lines: [err(`${command}: reads from standard input — try: cat FILE | ${command}`)] };
    case 'basename':
      return { lines: [out((rest[0] ?? '').split('/').filter(Boolean).pop() ?? '')] };
    case 'dirname':
      return { lines: [out((rest[0] ?? '').split('/').slice(0, -1).join('/') || '.')] };
    case 'which':
    case 'whereis':
    case 'type': {
      const known = new Set([
        'ls', 'cd', 'cat', 'grep', 'apt', 'dpkg', 'sudo', 'bash', 'sh', 'python3', 'node', 'curl', 'wget', 'git',
      ]);
      if (!rest[0]) return { lines: [err(`${command}: missing name`)] };
      if (known.has(rest[0])) return { lines: [out(`/usr/bin/${rest[0]}`)] };
      return { lines: [err(`${rest[0]} not found`)] };
    }
    case 'env':
      return {
        lines: [
          out(`USER=${ctx.user}`),
          out('HOME=/home/knits'),
          out('SHELL=/bin/knsh'),
          out(`PWD=/home/${pathLabel(cwd)}`),
          out('HOSTNAME=knits'),
          out('LANG=en_GB.UTF-8'),
          out(`TERM=xterm-256color`),
          ...[...vars.entries()].map(([name, value]) => out(`${name}=${value}`)),
        ],
      };
    case 'export': {
      const [assignment] = rest;
      if (!assignment?.includes('=')) return { lines: [out('')] };
      const [name, ...value] = assignment.split('=');
      vars.set(name, value.join('='));
      return { lines: [] };
    }
    case 'history':
      return { lines: ctx.history.map((item, index) => out(`${String(index + 1).padStart(3)}  ${item}`)) };
    case 'alias':
      return { lines: [out("alias ll='ls -l'"), out("alias la='ls -la'")] };
    case 'ps':
      return {
        lines: [
          out('  PID TTY          TIME CMD'),
          out('  912 tty1     00:00:01 Xorg'),
          out('  938 tty1     00:00:02 knits'),
          out('  951 tty1     00:00:04 chromium'),
          out(' 1042 pts/0    00:00:00 knsh'),
        ],
      };
    case 'top':
      return {
        lines: [
          out('top - 09:41:02 up 42 min,  1 user,  load average: 0.08, 0.12, 0.09'),
          out('Tasks:  84 total,   1 running,  83 sleeping,   0 stopped,   0 zombie'),
          out('%Cpu(s):  3.2 us,  1.1 sy,  0.0 ni, 95.4 id,  0.3 wa'),
          out('MiB Mem :  16384.0 total,   9412.0 free,   4210.0 used,   2762.0 buff/cache'),
          out('MiB Swap:   2048.0 total,   2048.0 free,      0.0 used.  11120.0 avail Mem'),
          out(''),
          out('  PID USER      %CPU  %MEM     TIME+ COMMAND'),
          out('  951 knits      4.1   1.9   0:04.12 chromium'),
          out('  938 knits      0.7   0.3   0:02.01 knits'),
          out(' 1042 knits      0.3   0.0   0:00.00 knsh'),
        ],
      };
    case 'kill':
      return { lines: rest[0] ? [dim(`kill: (${rest[0]}) - operation not permitted inside Knits`)] : [err('kill: usage: kill PID')] };
    case 'dmesg':
      return {
        lines: [
          dim('[    0.000000] Linux version 6.1.0-18-amd64 (debian-kernel@lists.debian.org)'),
          dim('[    0.412233] Knits live image: booting from RAM'),
          dim('[    1.204881] input: Knits virtual keyboard as /devices/virtual/input/input0'),
          dim('[    2.884121] chromium[951]: started in kiosk mode'),
        ],
      };
    case 'lscpu':
      return {
        lines: [
          out('Architecture:            x86_64'),
          out('  CPU op-mode(s):        32-bit, 64-bit'),
          out('  Model name:            Knits M3 (virtual)'),
          out('  CPU(s):                2'),
          out('  Thread(s) per core:    1'),
          out('Vendor ID:               Knits'),
          out('Virtualization features: full'),
        ],
      };
    case 'lsblk':
      return {
        lines: [
          out('NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS'),
          out('sda      8:0    0  128G  0 disk'),
          out('└─sda1   8:1    0  128G  0 part /'),
          out('sr0     11:0    1  1.2G  0 rom  /run/live/medium'),
        ],
      };
    case 'mount':
      return {
        lines: [
          out('/dev/sda1 on / type ext4 (rw,relatime)'),
          out('tmpfs on /run type tmpfs (rw,nosuid,nodev)'),
          out('/dev/sr0 on /run/live/medium type iso9660 (ro,noexec)'),
          out('overlay on / type overlay (rw,lowerdir=/run/live/rootfs)'),
        ],
      };
    case 'ip':
      if (args[1] === 'a' || args[1] === 'addr' || !args[1]) {
        return {
          lines: [
            out('1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN'),
            out('    inet 127.0.0.1/8 scope host lo'),
            out('2: enp0s3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP'),
            out('    inet 10.0.2.15/24 brd 10.0.2.255 scope global dynamic enp0s3'),
          ],
        };
      }
      return { lines: [err(`Object "${args[1]}" is unknown, try "ip help".`)] };
    case 'ifconfig':
      return {
        lines: [
          out('enp0s3: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500'),
          out('        inet 10.0.2.15  netmask 255.255.255.0  broadcast 10.0.2.255'),
          out('        RX packets 1284  bytes 1.2 MiB'),
          out('lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536'),
          out('        inet 127.0.0.1  netmask 255.0.0.0'),
        ],
      };
    case 'ss':
    case 'netstat':
      return {
        lines: [
          out('Netid State  Local Address:Port   Peer Address:Port'),
          out('tcp   LISTEN 127.0.0.1:43871       0.0.0.0:*'),
          out('tcp   ESTAB  10.0.2.15:51234       142.250.200.36:443'),
        ],
      };
    case 'ping': {
      if (!rest[0]) return { lines: [err('ping: usage error: Destination address required')] };
      return {
        lines: [
          out(`PING ${rest[0]} (${rest[0]}) 56(84) bytes of data.`),
          out(`64 bytes from ${rest[0]}: icmp_seq=1 ttl=57 time=12.4 ms`),
          out(`64 bytes from ${rest[0]}: icmp_seq=2 ttl=57 time=11.9 ms`),
          out(`64 bytes from ${rest[0]}: icmp_seq=3 ttl=57 time=12.1 ms`),
          out(''),
          out(`--- ${rest[0]} ping statistics ---`),
          out('3 packets transmitted, 3 received, 0% packet loss, time 2003ms'),
        ],
      };
    }
    case 'curl':
    case 'wget': {
      const url = rest.find((item) => /^https?:\/\//i.test(item)) ?? (rest[0] ? `https://${rest[0]}` : null);
      if (!url) return { lines: [err(`${command}: try '${command} https://example.com'`)] };
      try {
        const text = await fetchText(url);
        return { lines: text ? text.split('\n').map(out) : [dim(`${command}: empty response`)] };
      } catch {
        return { lines: [err(`${command}: (6) Could not resolve host: ${url.replace(/^https?:\/\//, '').split('/')[0]}`)] };
      }
    }
    case 'apt':
    case 'apt-get': {
      const action = rest[0] ?? '';
      if (action === 'update') {
        return {
          lines: [
            out('Hit:1 http://deb.debian.org/debian bookworm InRelease'),
            out('Hit:2 http://deb.debian.org/debian bookworm-updates InRelease'),
            out('Reading package lists... Done'),
            out('All packages are up to date.'),
          ],
        };
      }
      if (action === 'upgrade' || action === 'dist-upgrade') {
        return { lines: [out('Reading package lists... Done'), out('0 upgraded, 0 newly installed, 0 to remove.')] };
      }
      if (action === 'list') {
        if (args.includes('--installed')) return { lines: installedRows(ctx) };
        return { lines: [out('knits/' + __VERSION__ + ' amd64 [installed]')] };
      }
      if (action === 'search') {
        return { lines: [err(`E: No packages found for "${rest.slice(1).join(' ')}"`)] };
      }
      if (action === 'install') {
        const pkg = rest[1] ?? '';
        if (!pkg) return { lines: [err('E: Invalid operation install')] };
        if (pkg.includes('.deb')) return { lines: [err(`E: The package ${pkg} is installed with dpkg -i ${pkg}`)] };
        if (pkg === 'knits') return { lines: [out('knits is already the newest version (' + __VERSION__ + ').')] };
        return { lines: [err(`E: Unable to locate package ${pkg}`)] };
      }
      if (action === 'remove' || action === 'purge') {
        return { lines: [err(`E: ${rest[1] ?? 'package'} is a Knits app — uninstall it from the Knits Store.`)] };
      }
      return { lines: [err('apt: try update, upgrade, install, remove, list or search')] };
    }
    case 'dpkg': {
      if (has('i')) {
        const name = rest.find((item) => item.endsWith('.deb')) ?? rest[0];
        const path = name ? target(name) : null;
        const source = path ? readText(path) : null;
        if (!source) return { lines: [err(`dpkg: error: cannot access archive: No such file or directory (${name ?? ''})`)] };
        if (!ctx.install(name!, source)) {
          return { lines: [err(`dpkg: error processing archive ${name} (--install): this is not a Knits package`)] };
        }
        return { lines: [out(`Selecting previously unselected package ${name}.`), out(`(Reading database ... 128412 files and directories currently installed.)`), out(`Preparing to unpack ${name} ...`), out('The Knits installer is open in its own window.')] };
      }
      if (has('l')) {
        if (rest[0]) {
          const app = ctx.apps.find((item) => item.name.toLowerCase() === rest[0].toLowerCase() || item.id === rest[0]);
          if (!app) return { lines: [err(`dpkg-query: no packages found matching ${rest[0]}`)] };
          return { lines: [out(`ii  ${app.name.toLowerCase()}  ${app.version}  all  ${app.name} (Knits app)`)] };
        }
        return { lines: installedRows(ctx) };
      }
      if (has('L')) {
        const app = ctx.apps.find((item) => item.name.toLowerCase() === rest[0]?.toLowerCase() || item.id === rest[0]);
        if (!app) return { lines: [err(`dpkg-query: package '${rest[0]}' is not installed`)] };
        return { lines: [out(`/home/knits/Applications/${app.name}.app`)] };
      }
      return { lines: [err('dpkg: error: need an action option (-l, -L, -i)')] };
    }
    case 'sudo': {
      const sub = argv.slice(argv.indexOf('sudo') + 1);
      if (!sub.length) return { lines: [out('usage: sudo command')] };
      const result = await exec(sub, cwd, ctx);
      return { lines: [dim(`[sudo] password for ${ctx.user}: accepted`), ...result.lines], cwd: result.cwd, clear: result.clear, close: result.close };
    }
    case 'systemctl': {
      const action = rest[0] ?? '';
      const unit = rest[1] ?? 'knits';
      if (action === 'status') {
        return {
          lines: [
            out(`● ${unit}.service - Knits desktop`),
            out(`     Loaded: loaded (/etc/systemd/system/${unit}.service; enabled; preset: enabled)`),
            out('     Active: active (running) since ' + new Date().toUTCString()),
            out('   Main PID: 938 (knits)'),
          ],
        };
      }
      if (action === 'list-units') {
        return {
          lines: [
            out('  UNIT                 LOAD   ACTIVE SUB     DESCRIPTION'),
            out('  knits.service        loaded active running Knits desktop'),
            out('  getty@tty1.service   loaded active running Getty on tty1'),
            out('  systemd-journald     loaded active running Journal Service'),
          ],
        };
      }
      if (['start', 'stop', 'restart', 'enable', 'disable', 'mask'].includes(action)) {
        return { lines: [dim(`Failed to ${action} ${unit}.service: Operation not permitted inside Knits.`)] };
      }
      return { lines: [err('systemctl: try status, list-units, start or stop')] };
    }
    case 'journalctl':
      return {
        lines: [
          dim('-- Journal begins at boot, ends now. --'),
          dim(`Nov 25 09:38:11 knits systemd[1]: Started Knits desktop.`),
          dim(`Nov 25 09:38:12 knits knits[938]: serving /opt/knits/web on 127.0.0.1`),
          dim(`Nov 25 09:38:14 knits chromium[951]: kiosk session ready`),
        ],
      };
    case 'last':
      return { lines: [out(`${ctx.user}  tty1         Tue Nov 25 09:38   still logged in`), out(''), out('wtmp begins Tue Nov 25 09:38:11 2026')] };
    case 'w':
      return {
        lines: [
          out(' 09:41:02 up 42 min,  1 user,  load average: 0.08, 0.12, 0.09'),
          out('USER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT'),
          out(`${ctx.user.padEnd(8)} tty1     -                09:38    0.00s  0.12s  0.02s knits`),
        ],
      };
    case 'users':
      return { lines: [out(ctx.user)] };
    case 'who':
      return { lines: [out(`${ctx.user}     tty1         2026-11-25 09:38`)] };
    case 'passwd':
      return {
        lines: [
          out(`Changing password for ${ctx.user}.`),
          dim('Your Knits password is the one you chose on the welcome screen.'),
          dim('It is stored in this browser, so the terminal cannot change it.'),
        ],
      };
    case 'shutdown':
    case 'reboot':
    case 'poweroff':
    case 'halt':
      return {
        lines: [
          err(`${command}: Knits is a desktop, not a machine.`),
          dim('Use  → Restart or  → Lock Screen in the menu bar.'),
        ],
      };
    case 'install':
      return {
        lines: [
          out('Installing Knits and Knits apps'),
          out(''),
          out('  Debian package      sudo apt install ./knits_' + __VERSION__ + '_all.deb'),
          out('  From the repository curl -fsSL https://raw.githubusercontent.com/snimmagadda2-alt/Knits/main/install.sh | bash'),
          out('  .deb inside Knits   right-click it in Finder → Install, or dpkg -i <file.deb>'),
          out('  From the Store      open Knits Store and press Get'),
        ],
      };
    case 'open': {
      if (!rest[0]) return { lines: [err('usage: open <app>')] };
      const name = rest.join(' ');
      if (!ctx.open(name)) return { lines: [err(`Unable to find application named '${name}'`)] };
      return { lines: [dim(`Opening ${name}…`)] };
    }
    case 'neofetch':
      return {
        lines: `        .:://///::.         knits@studio
      ://+++++++++++//:      ------------
     //+++++::::+++++//      OS: Knits ${__VERSION__} (Debian-based)
    //++++:      :++++//     Host: Knits Studio
   //++++:  .--.  :++++//    Shell: knsh 1.0 (Debian-style)
   //++++:  '--'  :++++//    WM: Knits Window Server
   //++++:        :++++//    CPU: Knits M3 (virtual)
    //++++:      :++++//     Memory: 16 GB / 16 GB
     //++++++++++++++//      Disk: 128 GB
      ://++++++++++//:
        ':////////:'`.split('\n').map(out),
      };
    case 'nano':
    case 'vi':
    case 'vim':
    case 'emacs':
      return {
        lines: [
          err(`${command}: no editor in this build.`),
          dim('Write files with Notes, or create them with: echo "text" > file — see touch and cp.'),
        ],
      };
    case 'git':
      return { lines: [dim(`git: Knits does not ship git. Source: https://github.com/snimmagadda2-alt/Knits`)] };
    case 'make':
      return { lines: [err("make: *** No targets specified and no makefile found.  Stop.")] };
    case 'tar':
    case 'gzip':
    case 'gunzip':
    case 'zip':
    case 'unzip':
      return { lines: [err(`${command}: archive tools are not part of the Knits shell`)] };
    case 'chmod':
    case 'chown':
    case 'ln':
      return { lines: [err(`${command}: changing ${command === 'chmod' ? 'permissions' : 'ownership'} is not permitted inside Knits`)] };
    case 'true':
      return { lines: [] };
    case 'false':
      return { lines: [err('')] };
    case 'yes':
      return { lines: Array.from({ length: 8 }, () => out(rest[0] ?? 'y')) };
    default:
      return { lines: [err(`knsh: command not found: ${command}`), dim('Type "help" for the commands this shell knows.')] };
  }
}
