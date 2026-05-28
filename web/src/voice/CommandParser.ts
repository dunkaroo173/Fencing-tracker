import { Screen } from "../engine/types";

export type TournamentCommand =
  | { type: "ADD_FENCER"; name: string; rating: number }
  | { type: "REMOVE_FENCER"; name: string }
  | { type: "CREATE_POULES" }
  | { type: "CREATE_DE" }
  | { type: "FINALIZE_ELO" }
  | { type: "EXPORT" }
  | { type: "RESET" }
  | { type: "NAVIGATE"; screen: Screen }
  | { type: "SCORE_CURRENT"; aScore: number; bScore: number }
  | { type: "SCORE_BY_NAME"; nameA: string; scoreA: number; nameB: string; scoreB: number }
  | { type: "NEXT_BOUT" }
  | { type: "HELP" }
  | { type: "UNKNOWN"; raw: string };

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
};

function wordToNumber(word: string): number | null {
  if (word in NUMBER_WORDS) return NUMBER_WORDS[word];
  const n = parseInt(word, 10);
  return Number.isNaN(n) ? null : n;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function extractTwoNumbers(tokens: string[]): [number, number] | null {
  const nums: number[] = [];
  for (const t of tokens) {
    if (t === "to" || t === "dash" || t === "versus" || t === "vs") continue;
    const n = wordToNumber(t);
    if (n !== null) nums.push(n);
  }
  if (nums.length >= 2) return [nums[0], nums[1]];
  return null;
}

function fuzzyMatchName(target: string, knownNames: string[]): string | null {
  const lower = target.toLowerCase();
  const exact = knownNames.find((n) => n.toLowerCase() === lower);
  if (exact) return exact;
  const starts = knownNames.find((n) => n.toLowerCase().startsWith(lower));
  if (starts) return starts;
  const contains = knownNames.find((n) => n.toLowerCase().includes(lower));
  if (contains) return contains;
  const firstWord = knownNames.find((n) => n.toLowerCase().split(" ")[0] === lower);
  if (firstWord) return firstWord;
  return null;
}

function findNamesAndScores(
  tokens: string[],
  knownNames: string[]
): { nameA: string; scoreA: number; nameB: string; scoreB: number } | null {
  const lower = knownNames.map((n) => n.toLowerCase());
  let i = 0;
  let nameA: string | null = null;
  let scoreA: number | null = null;
  let nameB: string | null = null;
  let scoreB: number | null = null;

  while (i < tokens.length) {
    const t = tokens[i];
    if (t === "to" || t === "vs" || t === "versus" || t === "beats" || t === "beat") {
      i++;
      continue;
    }

    const num = wordToNumber(t);
    if (num !== null) {
      if (nameA !== null && scoreA === null) { scoreA = num; i++; continue; }
      if (nameB !== null && scoreB === null) { scoreB = num; i++; continue; }
      if (nameA !== null && scoreA !== null && nameB !== null) { scoreB = num; i++; continue; }
      i++;
      continue;
    }

    // Try matching first name or full name
    let matched: string | null = null;
    // Try two-word name
    if (i + 1 < tokens.length) {
      const twoWord = tokens[i] + " " + tokens[i + 1];
      const idx = lower.findIndex((n) => n === twoWord || n.startsWith(twoWord));
      if (idx >= 0) { matched = knownNames[idx]; i += 2; }
    }
    // Try one-word name
    if (!matched) {
      const idx = lower.findIndex((n) => n.split(" ")[0] === t || n === t);
      if (idx >= 0) { matched = knownNames[idx]; i++; }
    }

    if (matched) {
      if (nameA === null) nameA = matched;
      else if (nameB === null) nameB = matched;
    } else {
      i++;
    }
  }

  if (nameA && scoreA !== null && nameB && scoreB !== null) {
    return { nameA, scoreA, nameB, scoreB };
  }
  return null;
}

export function parseCommand(raw: string, knownNames: string[] = []): TournamentCommand {
  const tokens = tokenize(raw);
  const text = tokens.join(" ");

  // Add/remove fencer — checked BEFORE navigation so "add fencer X" isn't swallowed
  const addMatch = text.match(/\badd\s+(?:fencer\s+)?([a-z][a-z ]+?)(?:\s+(?:rating|rated?)\s+(\d+))?\s*$/);
  if (addMatch) {
    const name = addMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
    const rating = addMatch[2] ? parseInt(addMatch[2], 10) : 1200;
    return { type: "ADD_FENCER", name, rating };
  }

  const removeMatch = text.match(/\b(?:remove|delete|drop)\s+(?:fencer\s+)?([a-z][a-z ]+?)\s*$/);
  if (removeMatch) {
    return { type: "REMOVE_FENCER", name: removeMatch[1].trim() };
  }

  // Tournament flow — checked before navigation so "create poules" isn't swallowed by poules nav
  if (/\b(create|generate|make|start|build|draw)\b.*\b(poule|pool)\b/.test(text) || text === "poules" || text === "create poules")
    return { type: "CREATE_POULES" };
  if (/\b(create|generate|make|start|build|draw)\b.*\b(de|bracket|elimination|tableau)\b/.test(text))
    return { type: "CREATE_DE" };
  if (/\b(finalize|update|calculate|compute)\b.*\b(elo|rating|ratings|rank|ranking)\b/.test(text))
    return { type: "FINALIZE_ELO" };
  if (/\b(export|save|share|download)\b/.test(text))
    return { type: "EXPORT" };
  if (/\b(reset|new tournament|clear|restart)\b/.test(text))
    return { type: "RESET" };
  if (/\b(help|commands|what can|how to)\b/.test(text))
    return { type: "HELP" };

  // Next bout
  if (/\b(next|skip)\b/.test(text) && /\b(bout|match|fight|pair)\b/.test(text))
    return { type: "NEXT_BOUT" };
  if (text === "next" || text === "skip")
    return { type: "NEXT_BOUT" };

  // Navigation
  if (/\b(fencers|setup|roster)\b/.test(text))
    return { type: "NAVIGATE", screen: "fencers" };
  if (/\b(poule|poules|pool|pools)\b/.test(text))
    return { type: "NAVIGATE", screen: "poules" };
  if (/\b(standing|standings|ranking|rankings)\b/.test(text))
    return { type: "NAVIGATE", screen: "standings" };
  if (/\b(result|results|tournament results?|final results?)\b/.test(text) && !/final|finals/.test(text))
    return { type: "NAVIGATE", screen: "results" };
  if (/\b(bracket|de|elimination|tableau|final|finals)\b/.test(text))
    return { type: "NAVIGATE", screen: "de" };

  // Score by names (if we have known names)
  if (knownNames.length > 0) {
    const byName = findNamesAndScores(tokens, knownNames);
    if (byName) return { type: "SCORE_BY_NAME", ...byName };
  }

  // Score current bout: "five three", "5 to 3", "score 5 3"
  const scoreTokens = tokens.filter((t) => t !== "score");
  const nums = extractTwoNumbers(scoreTokens);
  if (nums && nums[0] <= 15 && nums[1] <= 15) {
    return { type: "SCORE_CURRENT", aScore: nums[0], bScore: nums[1] };
  }

  return { type: "UNKNOWN", raw };
}

export function commandFeedback(cmd: TournamentCommand): string {
  switch (cmd.type) {
    case "ADD_FENCER": return `Adding ${cmd.name} with rating ${cmd.rating}.`;
    case "REMOVE_FENCER": return `Removing ${cmd.name}.`;
    case "CREATE_POULES": return "Creating poules now.";
    case "CREATE_DE": return "Building the direct elimination bracket.";
    case "FINALIZE_ELO": return "Finalizing ELO ratings.";
    case "EXPORT": return "Exporting tournament data.";
    case "RESET": return "Resetting tournament.";
    case "NAVIGATE": return `Going to ${cmd.screen}.`;
    case "SCORE_CURRENT": return `Score: ${cmd.aScore} to ${cmd.bScore}.`;
    case "SCORE_BY_NAME": return `${cmd.nameA} ${cmd.scoreA}, ${cmd.nameB} ${cmd.scoreB}.`;
    case "NEXT_BOUT": return "Next bout.";
    case "HELP": return "Say: add fencer, create poules, create bracket, score five three, next bout, finalize elo.";
    case "UNKNOWN": return `Didn't understand: "${cmd.raw}". Say help for commands.`;
  }
}
