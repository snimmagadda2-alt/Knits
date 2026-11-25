import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { getNode, pathLabel, resolvePath } from '../vfs';

type Kind = 'cmd' | 'out' | 'err' | 'dim';

interface Line {
  id: number;
  text: string;
  kind: Kind;
}

let seq = 0;
const mk = (text: string, kind: Kind = 'out'): Line => {
  seq += 1;
  return { id: seq, text, kind };
};

const HELP = `Knits shell — supported commands

  help              show this message
  ls [path]         list a directory
  cd [path]         change directory
  pwd               print the working directory
  cat <file>        print a file
  echo <text>       print text
  open <app>        launch an app by name
  install           how to install the .deb package
  neofetch          system information
  date              current date and time
  whoami            current user
  uname [-a]        system name
  clear             clear the screen
  exit              close the terminal`;

const NEOFETCH = `        .:://///::.         knits@studio
      ://+++++++++++//:      ------------
     //+++++::::+++++//      OS: Knits ${__VERSION__} (Debian-based)
    //++++:      :++++//     Host: Knits Studio
   //++++:  .--.  :++++//    Shell: knsh 1.0
   //++++:  '--'  :++++//    WM: Knits Window Server
   //++++:        :++++//    CPU: Knits M3 (virtual)
    //++++:      :++++//     Memory: 16 GB / 16 GB
     //++++++++++++++//      Disk: 128 GB
      ://++++++++++//:
        ':////////:'`;

export function Terminal({ onClose }: { onClose: () => void }) {
  const [cwd, setCwd] = useState<string[]>([]);
  const [lines, setLines] = useState<Line[]>(() => [
    mk(`Last login: ${new Date().toDateString()} on ttys000`, 'dim'),
    mk('Type "help" for a list of commands.', 'dim'),
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  const prompt = `knits@studio ${cwd.length ? `/${cwd.join('/')}` : '~'} %`;

  const execute = (raw: string): Line[] => {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    const [cmd, ...args] = trimmed.split(/\s+/);
    const arg = args.join(' ');

    switch (cmd) {
      case 'help':
        return [mk(HELP)];
      case 'clear':
        setLines([]);
        return [];
      case 'exit':
      case 'quit':
        onClose();
        return [];
      case 'pwd':
        return [mk(`/home/${pathLabel(cwd)}`)];
      case 'whoami':
        return [mk('knits')];
      case 'date':
        return [mk(new Date().toString())];
      case 'echo':
        return [mk(arg)];
      case 'uname':
        return [mk(args[0] === '-a' ? 'Knits studio 1.0.0 knsh 1.0 x86_64 Knits' : 'Knits')];
      case 'neofetch':
        return [mk(NEOFETCH)];
      case 'install':
        return [
          mk('Download the package, then install it with apt:'),
          mk(''),
          mk(`  sudo apt install ./knits_${__VERSION__}_all.deb`),
          mk(''),
          mk('Or install straight from the repository:'),
          mk(''),
          mk('  curl -fsSL https://raw.githubusercontent.com/snimmagadda2-alt/Knits/main/install.sh | bash'),
        ];
      case 'sudo':
        return [mk('knits is not in the sudoers file. This incident has been knitted.', 'err')];
      case 'ls': {
        const target = arg ? resolvePath(cwd, arg) : cwd;
        const node = target ? getNode(target) : null;
        if (!node) return [mk(`ls: ${arg}: No such file or directory`, 'err')];
        if (node.kind === 'file') return [mk(node.name)];
        if (!node.children?.length) return [mk('')];
        return [mk(node.children.map((child) => (child.kind === 'folder' ? `${child.name}/` : child.name)).join('   '))];
      }
      case 'cd': {
        if (!arg || arg === '~') {
          setCwd([]);
          return [];
        }
        const target = resolvePath(cwd, arg);
        const node = target ? getNode(target) : null;
        if (!node) return [mk(`cd: ${arg}: No such file or directory`, 'err')];
        if (node.kind !== 'folder') return [mk(`cd: ${arg}: Not a directory`, 'err')];
        setCwd(target ?? []);
        return [];
      }
      case 'cat': {
        if (!arg) return [mk('usage: cat <file>', 'err')];
        const target = resolvePath(cwd, arg);
        const node = target ? getNode(target) : null;
        if (!node) return [mk(`cat: ${arg}: No such file or directory`, 'err')];
        if (node.kind === 'folder') return [mk(`cat: ${arg}: Is a directory`, 'err')];
        return [mk(node.content ?? '')];
      }
      case 'open': {
        if (!arg) return [mk('usage: open <app>', 'err')];
        return [mk(`open: "${arg}" — use the Dock to launch apps in this build.`, 'dim')];
      }
      default:
        return [mk(`knsh: command not found: ${cmd}`, 'err')];
    }
  };

  const submit = () => {
    const command = input;
    const echo = mk(`${prompt} ${command}`, 'cmd');
    const result = execute(command);
    setLines((prev) => [...prev, echo, ...result]);
    if (command.trim()) setHistory((prev) => [...prev, command.trim()]);
    setHistoryIndex(-1);
    setInput('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!history.length) return;
      const next = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(next);
      setInput(history[next]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < 0) return;
      const next = historyIndex + 1;
      if (next >= history.length) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        setHistoryIndex(next);
        setInput(history[next]);
      }
    }
  };

  return (
    <div className="terminal" onClick={() => inputRef.current?.focus()}>
      <div className="term-out" ref={scrollRef}>
        {lines.map((line) => (
          <div key={line.id} className={`term-line term-${line.kind}`}>
            {line.text || '\u00a0'}
          </div>
        ))}
        <div className="term-input-row">
          <span className="term-prompt">{prompt}</span>
          <input
            ref={inputRef}
            className="term-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            aria-label="Terminal input"
          />
        </div>
      </div>
    </div>
  );
}
