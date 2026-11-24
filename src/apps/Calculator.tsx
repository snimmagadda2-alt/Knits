import { useState } from 'react';

type Op = '+' | '−' | '×' | '÷';

function compute(a: number, b: number, op: Op): number {
  switch (op) {
    case '+':
      return a + b;
    case '−':
      return a - b;
    case '×':
      return a * b;
    case '÷':
      return b === 0 ? Number.NaN : a / b;
  }
}

function format(value: number): string {
  if (!Number.isFinite(value)) return 'Error';
  const rounded = Math.round(value * 1e9) / 1e9;
  if (Math.abs(rounded) >= 1e12) return rounded.toExponential(4);
  return String(rounded);
}

const KEYS: { label: string; kind: 'fn' | 'op' | 'num' | 'wide'; op?: Op }[] = [
  { label: 'AC', kind: 'fn' },
  { label: '±', kind: 'fn' },
  { label: '%', kind: 'fn' },
  { label: '÷', kind: 'op', op: '÷' },
  { label: '7', kind: 'num' },
  { label: '8', kind: 'num' },
  { label: '9', kind: 'num' },
  { label: '×', kind: 'op', op: '×' },
  { label: '4', kind: 'num' },
  { label: '5', kind: 'num' },
  { label: '6', kind: 'num' },
  { label: '−', kind: 'op', op: '−' },
  { label: '1', kind: 'num' },
  { label: '2', kind: 'num' },
  { label: '3', kind: 'num' },
  { label: '+', kind: 'op', op: '+' },
  { label: '0', kind: 'wide' },
  { label: '.', kind: 'num' },
  { label: '=', kind: 'op' },
];

export function Calculator() {
  const [display, setDisplay] = useState('0');
  const [accumulator, setAccumulator] = useState<number | null>(null);
  const [operator, setOperator] = useState<Op | null>(null);
  const [fresh, setFresh] = useState(true);

  const current = Number(display) || 0;

  const pressDigit = (digit: string) => {
    if (fresh || display === 'Error') {
      setDisplay(digit === '.' ? '0.' : digit);
      setFresh(false);
      return;
    }
    if (digit === '.' && display.includes('.')) return;
    const next = display === '0' && digit !== '.' ? digit : display + digit;
    if (next.replace(/[-.]/g, '').length > 12) return;
    setDisplay(next);
  };

  const pressOperator = (op: Op) => {
    if (operator && !fresh && accumulator !== null) {
      const result = compute(accumulator, current, operator);
      setAccumulator(result);
      setDisplay(format(result));
    } else {
      setAccumulator(current);
    }
    setOperator(op);
    setFresh(true);
  };

  const pressEquals = () => {
    if (operator === null || accumulator === null) return;
    const result = compute(accumulator, current, operator);
    setDisplay(format(result));
    setAccumulator(null);
    setOperator(null);
    setFresh(true);
  };

  const pressFunction = (label: string) => {
    if (label === 'AC') {
      setDisplay('0');
      setAccumulator(null);
      setOperator(null);
      setFresh(true);
    } else if (label === '±') {
      setDisplay((d) => (d.startsWith('-') ? d.slice(1) : d === '0' ? d : `-${d}`));
    } else if (label === '%') {
      setDisplay((d) => format((Number(d) || 0) / 100));
    }
  };

  const press = (key: (typeof KEYS)[number]) => {
    if (key.label === '=') return pressEquals();
    if (key.kind === 'op' && key.op) return pressOperator(key.op);
    if (key.kind === 'fn') return pressFunction(key.label);
    return pressDigit(key.label);
  };

  return (
    <div className="calc">
      <div className="calc-display">{display}</div>
      <div className="calc-grid">
        {KEYS.map((key) => (
          <button
            key={key.label}
            className={`calc-key calc-${key.kind}${key.label === '=' ? ' is-equals' : ''}`}
            onClick={() => press(key)}
          >
            {key.label}
          </button>
        ))}
      </div>
    </div>
  );
}
