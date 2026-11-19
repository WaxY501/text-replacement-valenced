/** Core shortcut utilities. No Discord/Valenced runtime dependencies. */
export function normalizeShortcut(trigger, replacement) {
  trigger = String(trigger ?? '').trim();
  replacement = String(replacement ?? '');
  if (!trigger || !replacement || /\s/.test(trigger)) return null;
  return { trigger, replacement };
}


/** Accept arrays of records, wrapper arrays, trigger=>replacement maps,
 * and name=>trigger maps (the latter are detected by the short-value heuristic). */
export function parseShortcutJson(input) {
  const data = typeof input === 'string' ? JSON.parse(input) : input;
  const rows = Array.isArray(data) ? data
    : Array.isArray(data?.shortcuts) ? data.shortcuts
    : Array.isArray(data?.entries) ? data.entries
    : Array.isArray(data?.items) ? data.items : null;
  if (rows) {
    return rows.map(row => normalizeShortcut(
      row?.trigger ?? row?.shortcut ?? row?.short ?? row?.key ?? row?.abbreviation,
      row?.replacement ?? row?.replace ?? row?.phrase ?? row?.value ?? row?.text ?? row?.word,
    )).filter(Boolean);
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const pairs = Object.entries(data);
    // Support object exports like { "full word": "short" } as well as
    // conventional { "short": "full word" }. If most values are shorter,
    // interpret the value as trigger and the key as replacement.
    const reverseVotes = pairs.filter(([k, v]) => typeof v === 'string' && v.trim().length < k.trim().length && !/\s/.test(v.trim())).length;
    const reverse = pairs.length > 0 && reverseVotes / pairs.length >= 0.6;
    return pairs.map(([k, v]) => normalizeShortcut(reverse ? v : k, reverse ? k : v)).filter(Boolean);
  }
  throw new Error('Unsupported JSON shortcut format. Expected a map, list, or shortcuts/entries array.');
}


/** Gboard tab-separated dictionary format (shortcut<TAB>word<TAB>locale<TAB>pos),
 * plus CSV-style word,shortcut export variants. */
export function parseGboardExport(raw) {
  const lines = String(raw ?? '').split(/\r?\n/).filter(line => line.trim());
  const results = [];
  for (const line of lines) {
    if (line.trimStart().startsWith('#')) continue;
    if (line.includes('\t')) {
      const cols = line.split('\t');
      if (cols.length < 2) continue;
      const shortcut = cols[0].trim();
      const word = cols[1].trim();
      const entry = normalizeShortcut(shortcut, word);
      if (entry) results.push(entry);
      continue;
    }
    const cols = parseCsvRow(line);
    if (cols.length < 2) continue;
    // CSV export commonly uses replacement first, trigger second.
    const entry = normalizeShortcut(cols[1], cols[0]);
    if (entry) results.push(entry);
  }
  return results;
}
function parseCsvRow(line) {
  const fields = [];
  let field = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && line[i + 1] === '"' && quoted) { field += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === ',' && !quoted) { fields.push(field.trim()); field = ''; }
    else field += c;
  }
  fields.push(field.trim());
  return fields;
}

/** Merge imported/manual entries. Exact trigger duplicates are replaced by the latest row. */
export function mergeShortcuts(existing, incoming) {
  const map = new Map();
  for (const row of [...(existing ?? []), ...(incoming ?? [])]) {
    const clean = normalizeShortcut(row?.trigger, row?.replacement);
    if (clean) map.set(clean.trigger, clean);
  }
  return [...map.values()].sort((a, b) => a.trigger.localeCompare(b.trigger));
}

/** Expand whole-word shortcut tokens, preserving surrounding whitespace/punctuation.
 * Tokens containing whitespace aren't triggers. Longest triggers win on duplicates. */
export function expandAtSend(message, shortcuts) {
  if (!message || !Array.isArray(shortcuts) || shortcuts.length === 0) return message;
  const byTrigger = new Map();
  for (const row of shortcuts) {
    const clean = normalizeShortcut(row?.trigger, row?.replacement);
    if (clean) byTrigger.set(clean.trigger, clean.replacement);
  }
  // Replace exact trigger tokens while allowing common punctuation around them.
  // Longer triggers are checked first to avoid partial matches.
  const triggers = [...byTrigger.keys()].sort((a, b) => b.length - a.length);
  let output = String(message);
  for (const trigger of triggers) {
    const escaped = trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(^|[\\s([{\\{])${escaped}(?=$|[\\s.,!?;:)}\\]])`, 'g');
    output = output.replace(pattern, (_whole, prefix) => prefix + byTrigger.get(trigger));
  }
  return output;
}
