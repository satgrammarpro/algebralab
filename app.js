// Theme handling
const root = document.documentElement;
const storedTheme = localStorage.getItem('mv-theme');
if (storedTheme === 'light') root.classList.add('light');

const themeToggle = document.getElementById('themeToggle');
if (storedTheme === 'light') themeToggle.checked = true;
themeToggle?.addEventListener('change', () => {
  root.classList.toggle('light', themeToggle.checked);
  localStorage.setItem('mv-theme', themeToggle.checked ? 'light' : 'dark');
});

// Utilities
const Storage = {
  get(key, fallback) {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

const mistakeDefaults = { reversal: 0, inequality: 0, percent: 0, rate: 0, parentheses: 0, variable: 0 };

function toast(message) {
  const div = document.createElement('div');
  div.className = 'toast';
  div.textContent = message;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2400);
}

function normalize(text) {
  return text.toLowerCase().replace(/[,.;:!?]/g, '').replace(/\s+/g, ' ').trim();
}

const numberWords = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100
};

function wordToNumber(token) {
  if (!token) return null;
  if (!isNaN(Number(token))) return Number(token);
  return numberWords[token] ?? null;
}

function parseSimpleTerm(text) {
  const t = normalize(text).replace(/\bis\b/g, '').trim();
  if (t.includes('number') || t.includes('variable')) return { expr: 'x', latex: 'x', expl: `"${text}" → use variable x` };
  if (t.match(/^[a-z]$/)) return { expr: t, latex: t, expl: `Variable ${t}` };
  const num = wordToNumber(t);
  if (num !== null) return { expr: String(num), latex: String(num), expl: `Number ${num}` };
  if (t.match(/^\d+(\.\d+)?$/)) return { expr: t, latex: t, expl: `Number ${t}` };
  return { expr: t, latex: t, expl: `Treat "${text}" as symbol ${t}` };
}

function detectVariable(text) {
  const match = text.match(/([a-z])/i);
  return match ? match[1] : 'x';
}

function factorFromText(text) {
  const t = normalize(text);
  if (/twice|double/.test(t)) return 2;
  if (/thrice/.test(t)) return 3;
  const numMatch = t.match(/(\d+(?:\.\d+)?)\s*(times|x|\*)/);
  if (numMatch) return Number(numMatch[1]);
  const wordMatch = t.match(new RegExp(`(${Object.keys(numberWords).join('|')})\s+(times|x|\*)`));
  if (wordMatch) return wordToNumber(wordMatch[1]);
  return null;
}

function parseMultiplicative(text) {
  const factor = factorFromText(text);
  const variable = detectVariable(text);
  if (factor) return { expr: `${factor}${variable}`, latex: `${factor}${variable}`, expl: `${factor} × ${variable}` };
  if (/half of/.test(text)) return { expr: `0.5${variable}`, latex: `\\tfrac{1}{2}${variable}`, expl: 'Half means multiply by 1/2' };
  if (/third of/.test(text)) return { expr: `(${variable})/3`, latex: `\\frac{${variable}}{3}`, expl: 'Third means divide by 3' };
  return parseSimpleTerm(text);
}

function addTrap(list, trap) { if (trap && !list.includes(trap)) list.push(trap); }

const PATTERNS = [
  {
    id: 'more_than', label: 'Addition (reversed order)',
    detect: (t) => t.match(/^(?<a>.+?)\s+(?:more than|greater than)\s+(?<b>.+)$/),
    build: ({ groups }) => {
      const left = parseMultiplicative(groups.a);
      const right = parseMultiplicative(groups.b);
      return {
        expression: `${right.expr} + ${left.expr}`,
        latex: `${right.latex} + ${left.latex}`,
        explanation: [right.expl, '"more than" means add', left.expl + ' added after'],
        traps: ['Order matters: “more than” adds to the quantity that comes after the phrase.'],
        generator: () => {
          const n = Math.ceil(Math.random() * 9) + 1;
          return `${n} more than twice a number`;
        }
      };
    }
  },
  {
    id: 'less_than', label: 'Subtraction (reversal)',
    detect: (t) => t.match(/^(?<a>.+?)\s+(?:less than|fewer than)\s+(?<b>.+)$/),
    build: ({ groups }) => {
      const sub = parseMultiplicative(groups.a);
      const base = parseMultiplicative(groups.b);
      return {
        expression: `${base.expr} - ${sub.expr}`,
        latex: `${base.latex} - ${sub.latex}`,
        explanation: [base.expl, '“less than” means subtract the earlier amount', `Subtract ${sub.expl}`],
        traps: ['Reverse order: subtract the first quantity from the second.'],
        generator: () => `${Math.ceil(Math.random()*9)} less than three times a number`
      };
    }
  },
  {
    id: 'sum_of', label: 'Sum of two parts',
    detect: (t) => t.match(/^the\s+sum\s+of\s+(?<a>.+)\s+and\s+(?<b>.+)$/),
    build: ({ groups }) => {
      const a = parseMultiplicative(groups.a);
      const b = parseMultiplicative(groups.b);
      return {
        expression: `${a.expr} + ${b.expr}`,
        latex: `${a.latex} + ${b.latex}`,
        explanation: [`Sum means add`, a.expl, b.expl],
        traps: [],
        generator: () => `the sum of ${Math.ceil(Math.random()*8)} and a number`
      };
    }
  },
  {
    id: 'difference_between', label: 'Difference between',
    detect: (t) => t.match(/^the\s+difference\s+between\s+(?<a>.+)\s+and\s+(?<b>.+)$/),
    build: ({ groups }) => {
      const a = parseMultiplicative(groups.a);
      const b = parseMultiplicative(groups.b);
      return {
        expression: `${a.expr} - ${b.expr}`,
        latex: `${a.latex} - ${b.latex}`,
        explanation: ['Difference means subtract first minus second', a.expl, b.expl],
        traps: ['Order stays as written for “difference between A and B”: do A - B.'],
        generator: () => `the difference between a number and ${Math.ceil(Math.random()*6)}`
      };
    }
  },
  {
    id: 'product_of', label: 'Product of two parts',
    detect: (t) => t.match(/^the\s+product\s+of\s+(?<a>.+)\s+and\s+(?<b>.+)$/),
    build: ({ groups }) => {
      const a = parseMultiplicative(groups.a);
      const b = parseMultiplicative(groups.b);
      return {
        expression: `${a.expr} * ${b.expr}`,
        latex: `${a.latex}${b.latex}`,
        explanation: ['Product means multiply', a.expl, b.expl],
        traps: ['Remember parentheses if parts are sums/differences.'],
        generator: () => `the product of ${Math.ceil(Math.random()*5)} and a number`
      };
    }
  },
  {
    id: 'quotient_of', label: 'Quotient of',
    detect: (t) => t.match(/^the\s+quotient\s+of\s+(?<a>.+)\s+and\s+(?<b>.+)$/),
    build: ({ groups }) => {
      const a = parseMultiplicative(groups.a);
      const b = parseMultiplicative(groups.b);
      return {
        expression: `${a.expr} / ${b.expr}`,
        latex: `\\frac{${a.latex}}{${b.latex}}`,
        explanation: ['Quotient means divide first by second', a.expl, b.expl],
        traps: ['Division is not commutative: keep the order.'],
        generator: () => `the quotient of ${Math.ceil(Math.random()*12)} and a number`
      };
    }
  },
  {
    id: 'times', label: 'Multiplicative phrase',
    detect: (t) => t.match(/^(?<factor>(?:twice|thrice|\d+\s+times|three\s+times|four\s+times))\s+(?<rest>.+)$/),
    build: ({ groups }) => {
      const factorText = groups.factor;
      const factor = factorFromText(factorText) ?? 1;
      const rest = parseMultiplicative(groups.rest);
      return {
        expression: `${factor}(${rest.expr})`.replace(/\(x\)/, 'x'),
        latex: `${factor}${rest.latex}`,
        explanation: [`${factorText} → multiply by ${factor}`, rest.expl],
        traps: [],
        generator: () => `${Math.ceil(Math.random()*5)+1} times the sum of a number and 2`
      };
    }
  },
  {
    id: 'increased', label: 'Increased / decreased',
    detect: (t) => t.match(/^(?<base>.+?)\s+(increased by|decreased by)\s+(?<delta>.+)$/),
    build: ({ groups }) => {
      const base = parseMultiplicative(groups.base);
      const delta = parseMultiplicative(groups.delta);
      const isInc = groups[2].startsWith('increased');
      const op = isInc ? '+' : '-';
      return {
        expression: `${base.expr} ${op} ${delta.expr}`,
        latex: `${base.latex} ${op} ${delta.latex}`,
        explanation: [base.expl, `${groups[2]} means ${op === '+' ? 'add' : 'subtract'}`, delta.expl],
        traps: [],
        generator: () => `a number ${isInc ? 'increased' : 'decreased'} by ${Math.ceil(Math.random()*7)}`
      };
    }
  },
  {
    id: 'inequality_at_least', label: 'At least / At most',
    detect: (t) => t.match(/^(?<left>.+?)\s+(at least|no less than|minimum of)\s+(?<right>.+)$/),
    build: ({ groups }) => {
      const left = parseMultiplicative(groups.left);
      const right = parseMultiplicative(groups.right);
      return {
        expression: `${left.expr} >= ${right.expr}`,
        latex: `${left.latex} \\ge ${right.latex}`,
        explanation: [left.expl, '“at least / no less than” → ≥', right.expl],
        traps: ['≥ direction: value cannot be smaller than the bound.'],
        generator: () => `a number is at least ${Math.ceil(Math.random()*9)}`
      };
    }
  },
  {
    id: 'inequality_at_most', label: 'At most / No more than',
    detect: (t) => t.match(/^(?<left>.+?)\s+(at most|no more than|max(?:imum)? of)\s+(?<right>.+)$/),
    build: ({ groups }) => {
      const left = parseMultiplicative(groups.left);
      const right = parseMultiplicative(groups.right);
      return {
        expression: `${left.expr} <= ${right.expr}`,
        latex: `${left.latex} \\le ${right.latex}`,
        explanation: [left.expl, '“at most / no more than” → ≤', right.expl],
        traps: ['≤ direction: value cannot exceed the bound.'],
        generator: () => `a number is at most ${Math.ceil(Math.random()*12)}`
      };
    }
  },
  {
    id: 'percent_of', label: 'Percent of',
    detect: (t) => t.match(/^(?<p>.+?)\s+percent\s+of\s+(?<base>.+)$/),
    build: ({ groups }) => {
      const p = parseSimpleTerm(groups.p);
      const base = parseMultiplicative(groups.base);
      return {
        expression: `${p.expr/100 ?? '?'}${base.expr}`.replace('undefined', ''),
        latex: `${(p.expr/100 ?? '?')}${base.latex}`,
        explanation: [`Convert percent: ${p.expr}% → ${p.expr/100}`, base.expl],
        traps: ['Percent must be divided by 100 before multiplying.'],
        generator: () => `${Math.ceil(Math.random()*80)+10} percent of a number`
      };
    }
  },
  {
    id: 'ratio', label: 'Ratio of A to B',
    detect: (t) => t.match(/^ratio\s+of\s+(?<a>.+)\s+to\s+(?<b>.+)$/),
    build: ({ groups }) => {
      const a = parseMultiplicative(groups.a);
      const b = parseMultiplicative(groups.b);
      return {
        expression: `${a.expr}/${b.expr}`,
        latex: `\\frac{${a.latex}}{${b.latex}}`,
        explanation: ['Ratio uses division A/B', a.expl, b.expl],
        traps: ['Order matters: ratio of A to B = A/B.'],
        generator: () => `ratio of ${Math.ceil(Math.random()*5)} to a number`
      };
    }
  },
  {
    id: 'function_of', label: 'Function notation',
    detect: (t) => t.match(/^(?<fn>[a-z])\s+of\s+(?<input>[a-z])/),
    build: ({ groups }) => {
      const fn = groups.fn;
      const input = groups.input;
      return {
        expression: `${fn}(${input})`,
        latex: `${fn}(${input})`,
        explanation: [`“${fn} of ${input}” means function ${fn}(${input})`],
        traps: ['Use parentheses for function input.'],
        generator: () => `f of g of x`
      };
    }
  },
  {
    id: 'derivative', label: 'Derivative wording',
    detect: (t) => t.match(/(rate of change|derivative|slope of tangent)/),
    build: () => ({
      expression: 'dy/dx',
      latex: '\\frac{dy}{dx}',
      explanation: ['“rate of change” → derivative dy/dx'],
      traps: ['Specify variables: with respect to x means denominator x.'],
      generator: () => 'derivative of f at x'
    })
  },
  {
    id: 'integral', label: 'Integral wording',
    detect: (t) => t.match(/(area under|accumulated change|integral)/),
    build: () => ({
      expression: '∫ f(x) dx',
      latex: '\\int f(x)\\,dx',
      explanation: ['“area under/accumulated change” → integral'],
      traps: ['Include bounds if provided; units accumulate.'],
      generator: () => 'area under v from 0 to t'
    })
  },
  {
    id: 'probability', label: 'Probability & conditional',
    detect: (t) => t.match(/probability\s+of\s+(?<a>[a-z])(?:\s+given\s+(?<b>[a-z]))?/),
    build: ({ groups }) => {
      const { a, b } = groups;
      const expr = b ? `P(${a}|${b})` : `P(${a})`;
      const latex = b ? `P(${a} \\mid ${b})` : `P(${a})`;
      return {
        expression: expr,
        latex,
        explanation: [b ? `Probability of ${a} given ${b}` : `Probability of ${a}`],
        traps: ['Conditional probability uses vertical bar | meaning “given”.'],
        generator: () => 'probability of A given B'
      };
    }
  },
  {
    id: 'consecutive', label: 'Consecutive integers',
    detect: (t) => t.match(/consecutive\s+(?<type>even|odd)?\s*integers/),
    build: ({ groups }) => {
      const isEven = groups.type === 'even';
      return {
        expression: isEven ? 'n, n+2, n+4' : 'n, n+1, n+2',
        latex: isEven ? 'n, n+2, n+4' : 'n, n+1, n+2',
        explanation: [isEven ? 'Even integers jump by 2' : 'Consecutive integers increase by 1'],
        traps: ['Odd/even sequences use +2 increments.'],
        generator: () => 'three consecutive even integers'
      };
    }
  },
  {
    id: 'rate', label: 'Rate / per',
    detect: (t) => t.match(/per\s+/),
    build: (m) => {
      const [partA, partB] = m.input.split(/per/);
      const a = parseMultiplicative(partA.trim());
      const b = parseMultiplicative(partB.trim());
      return {
        expression: `${a.expr}/${b.expr}`,
        latex: `\\frac{${a.latex}}{${b.latex}}`,
        explanation: ['“per” means divide', a.expl, b.expl],
        traps: ['Units flip if you invert per-phrases.'],
        generator: () => `${Math.ceil(Math.random()*90)+10} miles per hour`
      };
    }
  }
];

function translatePhrase(raw) {
  const text = normalize(raw);
  if (!text) return null;
  for (const rule of PATTERNS) {
    const match = rule.detect(text);
    if (match) {
      const result = rule.build(match);
      result.patternId = rule.id;
      result.label = rule.label;
      result.explanation = result.explanation || [];
      result.traps = result.traps || [];
      return result;
    }
  }
  // fallback simple term
  const simple = parseSimpleTerm(text);
  return {
    expression: simple.expr,
    latex: simple.latex,
    explanation: [simple.expl, 'No specific pattern matched; review wording.'],
    traps: ['Phrase may be ambiguous. Try adding “of”, “more than”, etc.'],
    patternId: 'fallback',
    label: 'Unrecognized'
  };
}

// Translation UI
const phraseInput = document.getElementById('phraseInput');
const translateBtn = document.getElementById('translateBtn');
const plainOutput = document.getElementById('plainOutput');
const latexOutput = document.getElementById('latexOutput');
const explanationList = document.getElementById('explanationList');
const trapsList = document.getElementById('trapsList');
const practiceArea = document.getElementById('practiceArea');
const copyExpression = document.getElementById('copyExpression');
const copyLatex = document.getElementById('copyLatex');

function renderTranslation(result, phrase) {
  plainOutput.textContent = result.expression;
  latexOutput.textContent = result.latex;
  explanationList.innerHTML = '';
  result.explanation.forEach((line) => {
    const li = document.createElement('li');
    li.textContent = line;
    explanationList.appendChild(li);
  });
  trapsList.innerHTML = '';
  result.traps.forEach((trap) => {
    const li = document.createElement('li');
    li.className = 'common-trap';
    li.textContent = trap;
    trapsList.appendChild(li);
  });
  buildPractice(result);
  updateHistory(phrase, result.expression, result.patternId);
}

translateBtn?.addEventListener('click', () => {
  const phrase = phraseInput.value.trim();
  const res = translatePhrase(phrase);
  if (!res) return;
  renderTranslation(res, phrase);
});
phraseInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') translateBtn.click(); });

copyExpression?.addEventListener('click', () => {
  navigator.clipboard.writeText(plainOutput.textContent || '').then(() => toast('Expression copied'));
});
copyLatex?.addEventListener('click', () => {
  navigator.clipboard.writeText(latexOutput.textContent || '').then(() => toast('LaTeX copied'));
});

// Example library
const exampleSearch = document.getElementById('exampleSearch');
const exampleList = document.getElementById('exampleList');

function renderExamples(filter = '') {
  const term = normalize(filter);
  exampleList.innerHTML = '';
  EXAMPLE_LIBRARY.filter(ex => !term || normalize(ex.phrase).includes(term) || normalize(ex.topic).includes(term)).slice(0, 120).forEach((ex) => {
    const div = document.createElement('div');
    div.className = 'example-pill';
    div.innerHTML = `<div>${ex.phrase}</div><div class="muted">${ex.expression}</div><span class="badge-pill">${ex.difficulty}</span>`;
    div.addEventListener('click', () => {
      phraseInput.value = ex.phrase;
      translateBtn.click();
    });
    exampleList.appendChild(div);
  });
}
renderExamples();
exampleSearch?.addEventListener('input', (e) => renderExamples(e.target.value));

// Practice generation
const mistakeLog = Storage.get('mv-mistakes', []);
const mistakeCounts = Storage.get('mv-mistake-counts', mistakeDefaults);

function logMistake(type, detail) {
  const record = { type, detail, time: new Date().toISOString() };
  mistakeLog.push(record);
  mistakeCounts[type] = (mistakeCounts[type] || 0) + 1;
  Storage.set('mv-mistakes', mistakeLog.slice(-200));
  Storage.set('mv-mistake-counts', mistakeCounts);
}

function buildPractice(result) {
  practiceArea.innerHTML = '';
  const prompt = document.createElement('div');
  prompt.className = 'practice-question';
  const generatorPhrase = result.generator ? result.generator() : 'three more than a number';
  const question = document.createElement('div');
  question.textContent = `Translate: ${generatorPhrase}`;
  const input = document.createElement('input');
  input.placeholder = 'Your expression';
  const feedback = document.createElement('div');
  const submit = document.createElement('button');
  submit.textContent = 'Check';
  submit.className = 'primary';
  submit.addEventListener('click', () => {
    const expected = translatePhrase(generatorPhrase);
    const user = input.value.trim();
    if (!user) return;
    if (normalize(user) === normalize(expected.expression)) {
      feedback.textContent = 'Correct!';
      feedback.style.color = '#22c55e';
    } else {
      feedback.textContent = `Not quite. Expected ${expected.expression}`;
      feedback.style.color = '#ef4444';
      const type = expected.patternId === 'less_than' ? 'reversal' : 'variable';
      logMistake(type, generatorPhrase);
    }
    refreshDashboard();
  });
  prompt.append(question, input, submit, feedback);
  // multiple choice
  const choiceWrap = document.createElement('div');
  choiceWrap.className = 'choice-grid';
  const expectedChoice = translatePhrase(generatorPhrase).expression;
  const distractors = ['x - 3', '3x', 'x + 3', 'x/3', '3 + x'];
  const options = [expectedChoice];
  while (options.length < 4) {
    const d = distractors[Math.floor(Math.random()*distractors.length)];
    if (!options.includes(d)) options.push(d);
  }
  options.sort(() => Math.random() - 0.5);
  options.forEach(opt => {
    const btn = document.createElement('div');
    btn.className = 'choice';
    btn.textContent = opt;
    btn.addEventListener('click', () => {
      const correct = opt === expectedChoice;
      btn.classList.add(correct ? 'correct' : 'wrong');
      if (!correct) logMistake('parentheses', generatorPhrase);
      refreshDashboard();
    });
    choiceWrap.appendChild(btn);
  });
  practiceArea.append(prompt, choiceWrap);
}

// Practice page powered by library
const practiceTopic = document.getElementById('practiceTopic');
const practiceDifficulty = document.getElementById('practiceDifficulty');
const startPractice = document.getElementById('startPractice');
const practicePanel = document.getElementById('practicePanel');
const timedMode = document.getElementById('timedMode');

function populateTopics() {
  const topics = [...new Set(EXAMPLE_LIBRARY.map((e) => e.topic))];
  topics.forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t; opt.textContent = t; practiceTopic.appendChild(opt);
  });
}
populateTopics();

function startPracticeSession() {
  const diff = practiceDifficulty.value;
  const topic = practiceTopic.value;
  const pool = EXAMPLE_LIBRARY.filter((e) => (!diff || e.difficulty === diff) && (!topic || e.topic === topic));
  const picks = pool.sort(() => Math.random() - 0.5).slice(0, 5);
  let idx = 0; let score = 0; let timerId; let timeLeft = timedMode.checked ? 45 : null;
  practicePanel.innerHTML = '';
  const qDiv = document.createElement('div');
  const input = document.createElement('input');
  const submit = document.createElement('button'); submit.textContent = 'Submit'; submit.className = 'primary';
  const status = document.createElement('div');
  const timer = document.createElement('div');
  function renderQuestion() {
    const item = picks[idx];
    qDiv.textContent = `Q${idx+1}: ${item.phrase}`;
    input.value = '';
    status.textContent = '';
    if (timeLeft !== null) {
      timer.textContent = `⏱ ${timeLeft}s`;
    }
  }
  function handleSubmit() {
    const item = picks[idx];
    const user = input.value.trim();
    if (!user) return;
    if (normalize(user) === normalize(item.expression)) { score++; status.textContent = 'Correct'; status.style.color = '#22c55e'; }
    else {
      status.textContent = `Expected ${item.expression}`;
      status.style.color = '#ef4444';
      const wrongType = item.phrase.includes('less than') ? 'reversal' : item.phrase.includes('at least') || item.phrase.includes('at most') ? 'inequality' : 'variable';
      logMistake(wrongType, item.phrase);
    }
    idx++;
    if (idx >= picks.length) {
      finish();
    } else { renderQuestion(); }
    refreshDashboard();
  }
  function tick() {
    if (timeLeft === null) return;
    timeLeft--;
    timer.textContent = `⏱ ${timeLeft}s`;
    if (timeLeft <= 0) { handleSubmit(); timeLeft = timedMode.checked ? 45 : null; }
  }
  function finish() {
    clearInterval(timerId);
    status.textContent = `Session complete. Score ${score}/${picks.length}`;
  }
  submit.addEventListener('click', handleSubmit);
  if (timedMode.checked) timerId = setInterval(tick, 1000);
  practicePanel.append(qDiv, input, submit, timer, status);
  renderQuestion();
}
startPractice?.addEventListener('click', startPracticeSession);

// Mistake dashboard
const mistakeChart = document.getElementById('mistakeChart');
const mistakeSummary = document.getElementById('mistakeSummary');

function refreshDashboard() {
  const ctx = mistakeChart.getContext('2d');
  ctx.clearRect(0,0,mistakeChart.width, mistakeChart.height);
  const keys = Object.keys(mistakeCounts);
  const max = Math.max(1, ...keys.map(k => mistakeCounts[k]));
  keys.forEach((key, i) => {
    const val = mistakeCounts[key] || 0;
    const barWidth = (val / max) * (mistakeChart.width - 140);
    const y = 30 + i*40;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(key, 10, y);
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(120, y-10, barWidth, 16);
    ctx.fillStyle = '#e5e7eb';
    ctx.fillText(val.toString(), 130 + barWidth, y);
  });
  mistakeSummary.innerHTML = '';
  mistakeLog.slice(-5).reverse().forEach(item => {
    const div = document.createElement('div');
    div.className = 'chart-bar';
    div.innerHTML = `<div>${item.type} — ${item.detail}</div><div class="muted">${new Date(item.time).toLocaleString()}</div>`;
    mistakeSummary.appendChild(div);
  });
}
refreshDashboard();

const resetStats = document.getElementById('resetStats');
resetStats?.addEventListener('click', () => {
  ['mv-mistakes','mv-mistake-counts'].forEach(k => localStorage.removeItem(k));
  Object.keys(mistakeCounts).forEach(k => mistakeCounts[k]=0);
  mistakeLog.length = 0;
  refreshDashboard();
});

// Learn curriculum
const learnGrid = document.getElementById('learnGrid');
const lessons = [
  { title: 'Operations language', tag: 'sum, difference, product, quotient', content: 'Translate operation words to symbols and keep order for subtraction/division.' },
  { title: 'Comparison language', tag: 'more than, less than, at least, at most', content: 'Watch for reversal on “less than” and inequality directions.' },
  { title: 'Percent / ratio / rate', tag: 'percent of, per, ratios', content: 'Percent means divide by 100, “per” means divide, keep units with fractions.' },
  { title: 'Functions language', tag: 'f(x), inverse, in terms of', content: 'Use parentheses for inputs; inverses swap x and y.' },
  { title: 'Geometry language', tag: 'area, perimeter, volume', content: 'Attach the right formula to shapes; check units squared/cubed.' },
  { title: 'Sequence & series', tag: 'nth term, sigma', content: 'Arithmetic adds a common difference; geometric multiplies by a ratio.' },
  { title: 'Calculus language', tag: 'derivative, integral, limit', content: 'Rates become derivatives; accumulation becomes integrals with bounds.' },
  { title: 'Stats language', tag: 'probability, conditional, regression', content: 'P(A|B) is conditional; distinguish mean, median, variance, SD.' }
];
lessons.forEach((lesson) => {
  const card = document.createElement('div');
  card.className = 'card lesson';
  card.innerHTML = `<div class="badge">${lesson.title}</div><div>${lesson.content}</div><div class="muted">${lesson.tag}</div>`;
  const quiz = document.createElement('div');
  quiz.className = 'quiz';
  const sample = EXAMPLE_LIBRARY.find((e) => normalize(e.topic).includes(lesson.title.split(' ')[0].toLowerCase())) || EXAMPLE_LIBRARY[Math.floor(Math.random()*EXAMPLE_LIBRARY.length)];
  quiz.textContent = `Quick check: ${sample.phrase} → ${sample.expression}`;
  card.appendChild(quiz);
  learnGrid.appendChild(card);
});

// Feedback modal
const reportBtn = document.getElementById('reportBtn');
const feedbackModal = document.getElementById('feedbackModal');
const closeModal = document.getElementById('closeModal');
const feedbackPhrase = document.getElementById('feedbackPhrase');
const feedbackExpected = document.getElementById('feedbackExpected');
const feedbackIssue = document.getElementById('feedbackIssue');
const submitFeedback = document.getElementById('submitFeedback');

reportBtn?.addEventListener('click', () => {
  feedbackPhrase.value = phraseInput.value;
  feedbackModal.setAttribute('aria-hidden', 'false');
});
closeModal?.addEventListener('click', () => feedbackModal.setAttribute('aria-hidden', 'true'));
submitFeedback?.addEventListener('click', () => {
  const existing = Storage.get('mv-feedback', []);
  existing.push({ phrase: feedbackPhrase.value, expected: feedbackExpected.value, issue: feedbackIssue.value, time: new Date().toISOString() });
  Storage.set('mv-feedback', existing.slice(-100));
  toast('Feedback saved locally');
  feedbackModal.setAttribute('aria-hidden', 'true');
});

// Router
const navLinks = document.querySelectorAll('[data-route]');
function setRoute(hash) {
  const target = hash || '#home';
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  const page = document.querySelector(target);
  if (page) page.classList.add('active');
  navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === target));
}
window.addEventListener('hashchange', () => setRoute(location.hash));
setRoute(location.hash || '#home');

// Tests
function runTranslatorTests() {
  const cases = TEST_CASES;
  let pass = 0;
  cases.forEach((c) => {
    const res = translatePhrase(c.phrase);
    const ok = normalize(res.expression) === normalize(c.expect);
    if (ok) pass++; else console.warn('Mismatch', c.phrase, res.expression, 'expected', c.expect);
  });
  console.log(`Translator tests: ${pass}/${cases.length} passed`);
  toast(`Tests: ${pass}/${cases.length} passed`);
}
window.runTranslatorTests = runTranslatorTests;

document.getElementById('runTests')?.addEventListener('click', runTranslatorTests);
