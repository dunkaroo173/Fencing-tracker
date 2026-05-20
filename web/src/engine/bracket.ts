import { Bracket, BracketMatch, PouleStanding } from "./types";
import { createId } from "./id";

function nextPowerOfTwo(value: number): number {
  return Math.pow(2, Math.ceil(Math.log2(Math.max(2, value))));
}

export function seedOrder(size: number): number[] {
  if (size === 2) return [1, 2];
  const previous = seedOrder(size / 2);
  const result: number[] = [];
  previous.forEach((seed) => {
    result.push(seed);
    result.push(size + 1 - seed);
  });
  return result;
}

export function createDEBracket(standings: PouleStanding[]): Bracket {
  const size = nextPowerOfTwo(standings.length);
  const roundsCount = Math.log2(size);
  const rounds: BracketMatch[][] = [];

  for (let round = 1; round <= roundsCount; round += 1) {
    const matchesInRound = size / Math.pow(2, round);
    rounds.push(
      Array.from({ length: matchesInRound }, (_, matchIndex) => ({
        id: createId(`r${round}m${matchIndex + 1}`),
        round,
        matchIndex,
        aId: "",
        bId: "",
        complete: false,
      }))
    );
  }

  const firstRound = rounds[0];
  seedOrder(size).forEach((seedNumber, slotIndex) => {
    const fencer = standings[seedNumber - 1];
    const match = firstRound[Math.floor(slotIndex / 2)];
    const slot = slotIndex % 2 === 0 ? "aId" : "bId";
    match[slot] = fencer ? fencer.id : `bye-${slotIndex}`;
  });

  rounds.forEach((roundMatches, roundIndex) => {
    const nextRound = rounds[roundIndex + 1];
    if (!nextRound) return;
    roundMatches.forEach((match, index) => {
      match.nextMatchId = nextRound[Math.floor(index / 2)].id;
      match.nextSlot = index % 2 === 0 ? "aId" : "bId";
    });
  });

  return autoAdvanceByes({ size, rounds });
}

export function autoAdvanceByes(bracket: Bracket): Bracket {
  let updated = bracket;
  updated.rounds.forEach((round) => {
    round.forEach((match) => {
      const aBye = match.aId.startsWith("bye-") || !match.aId;
      const bBye = match.bId.startsWith("bye-") || !match.bId;
      if (aBye && !bBye) updated = setMatchWinner(updated, match.id, match.bId, 0, 0);
      if (bBye && !aBye) updated = setMatchWinner(updated, match.id, match.aId, 0, 0);
    });
  });
  return updated;
}

export function setMatchWinner(
  bracket: Bracket,
  matchId: string,
  winnerId: string,
  aScore?: number,
  bScore?: number
): Bracket {
  const rounds = bracket.rounds.map((round) => round.map((match) => ({ ...match })));
  let changedMatch: BracketMatch | undefined;

  for (const round of rounds) {
    const match = round.find((candidate) => candidate.id === matchId);
    if (!match) continue;
    match.winnerId = winnerId;
    match.complete = true;
    if (aScore !== undefined) match.aScore = aScore;
    if (bScore !== undefined) match.bScore = bScore;
    changedMatch = match;
    break;
  }

  if (changedMatch?.nextMatchId && changedMatch.nextSlot) {
    for (const round of rounds) {
      const next = round.find((candidate) => candidate.id === changedMatch?.nextMatchId);
      if (!next) continue;
      next[changedMatch.nextSlot] = winnerId;
      break;
    }
  }

  return { ...bracket, rounds };
}

export function enterDEMatchScore(
  bracket: Bracket,
  matchId: string,
  aScore: number,
  bScore: number
): Bracket {
  const match = bracket.rounds.flat().find((candidate) => candidate.id === matchId);
  if (!match) return bracket;
  const winnerId = aScore > bScore ? match.aId : match.bId;
  return setMatchWinner(bracket, matchId, winnerId, aScore, bScore);
}

export function nextIncompleteMatch(bracket: Bracket, currentMatchId?: string): BracketMatch | null {
  const all = bracket.rounds.flat().filter((m) => !m.complete && !m.aId.startsWith("bye-") && !m.bId.startsWith("bye-") && m.aId && m.bId);
  if (!currentMatchId) return all[0] ?? null;
  let found = false;
  for (const match of all) {
    if (found) return match;
    if (match.id === currentMatchId) found = true;
  }
  return all[0] ?? null;
}
