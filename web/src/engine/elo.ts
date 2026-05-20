import { Bracket, Fencer, Poule } from "./types";

export function expectedScore(aElo: number, bElo: number): number {
  return 1 / (1 + Math.pow(10, (bElo - aElo) / 400));
}

export function applyEloChange(
  winnerElo: number,
  loserElo: number,
  k = 32
): { winner: number; loser: number } {
  const winnerExpected = expectedScore(winnerElo, loserElo);
  const loserExpected = expectedScore(loserElo, winnerElo);
  return {
    winner: Math.round(winnerElo + k * (1 - winnerExpected)),
    loser: Math.round(loserElo + k * (0 - loserExpected)),
  };
}

export function finalizeElo(fencers: Fencer[], poules: Poule[], bracket?: Bracket): Fencer[] {
  const eloById = Object.fromEntries(
    fencers.map((fencer) => [fencer.id, Number(fencer.elo ?? fencer.rating ?? 1200)])
  );

  const applyBout = (aId: string, bId: string, aScore?: number, bScore?: number) => {
    if (!aId || !bId || aId.startsWith("bye-") || bId.startsWith("bye-")) return;
    if (aScore === undefined || bScore === undefined || aScore === bScore) return;

    const winnerId = aScore > bScore ? aId : bId;
    const loserId = aScore > bScore ? bId : aId;
    if (eloById[winnerId] === undefined || eloById[loserId] === undefined) return;
    const result = applyEloChange(eloById[winnerId], eloById[loserId]);
    eloById[winnerId] = result.winner;
    eloById[loserId] = result.loser;
  };

  poules.forEach((poule) => {
    poule.bouts.forEach((bout) => {
      if (bout.complete) applyBout(bout.aId, bout.bId, bout.aScore, bout.bScore);
    });
  });

  bracket?.rounds.flat().forEach((match) => {
    if (match.complete) applyBout(match.aId, match.bId, match.aScore, match.bScore);
  });

  return fencers.map((fencer) => ({ ...fencer, elo: eloById[fencer.id] ?? fencer.elo }));
}
