import { Bout, Fencer, Poule, PouleStanding } from "./types";
import { createId } from "./id";

export const DEFAULT_ELO = 1200;
export const POULE_TARGET_SIZE = 6;

export function createRoundRobinBouts(fencerIds: string[]): Bout[] {
  const bouts: Bout[] = [];
  for (let i = 0; i < fencerIds.length; i += 1) {
    for (let j = i + 1; j < fencerIds.length; j += 1) {
      bouts.push({ id: createId("bout"), aId: fencerIds[i], bId: fencerIds[j], complete: false });
    }
  }
  return bouts;
}

export function createPoules(fencers: Fencer[], targetSize = POULE_TARGET_SIZE): Poule[] {
  if (fencers.length === 0) return [];
  const sorted = [...fencers].sort((a, b) => {
    const ratingDiff = Number(b.rating ?? DEFAULT_ELO) - Number(a.rating ?? DEFAULT_ELO);
    return ratingDiff || a.name.localeCompare(b.name);
  });

  const pouleCount = Math.max(1, Math.ceil(sorted.length / targetSize));
  const groups: string[][] = Array.from({ length: pouleCount }, () => []);

  sorted.forEach((fencer, index) => {
    const row = Math.floor(index / pouleCount);
    const col = index % pouleCount;
    const groupIndex = row % 2 === 0 ? col : pouleCount - 1 - col;
    groups[groupIndex].push(fencer.id);
  });

  return groups.map((fencerIds, index) => ({
    id: createId("poule"),
    name: `Poule ${index + 1}`,
    fencerIds,
    bouts: createRoundRobinBouts(fencerIds),
  }));
}

export function calculatePouleStandings(fencers: Fencer[], poules: Poule[]): PouleStanding[] {
  const stats: Record<string, PouleStanding> = {};
  fencers.forEach((fencer) => {
    stats[fencer.id] = {
      id: fencer.id,
      name: fencer.name,
      rating: Number(fencer.rating ?? DEFAULT_ELO),
      elo: Number(fencer.elo ?? fencer.rating ?? DEFAULT_ELO),
      wins: 0,
      losses: 0,
      touchesScored: 0,
      touchesReceived: 0,
      indicator: 0,
    };
  });

  poules.forEach((poule) => {
    poule.bouts.forEach((bout) => {
      if (!bout.complete || bout.aScore === undefined || bout.bScore === undefined) return;
      if (!stats[bout.aId] || !stats[bout.bId]) return;

      const a = stats[bout.aId];
      const b = stats[bout.bId];

      a.touchesScored += bout.aScore;
      a.touchesReceived += bout.bScore;
      b.touchesScored += bout.bScore;
      b.touchesReceived += bout.aScore;

      if (bout.aScore > bout.bScore) {
        a.wins += 1;
        b.losses += 1;
      } else {
        b.wins += 1;
        a.losses += 1;
      }

      a.indicator = a.touchesScored - a.touchesReceived;
      b.indicator = b.touchesScored - b.touchesReceived;
    });
  });

  return Object.values(stats).sort(
    (a, b) =>
      b.wins - a.wins ||
      b.indicator - a.indicator ||
      b.touchesScored - a.touchesScored ||
      b.rating - a.rating ||
      a.name.localeCompare(b.name)
  );
}

export function updatePouleBout(
  poules: Poule[],
  pouleId: string,
  boutId: string,
  aScore: number,
  bScore: number
): Poule[] {
  return poules.map((poule) => {
    if (poule.id !== pouleId) return poule;
    return {
      ...poule,
      bouts: poule.bouts.map((bout) => {
        if (bout.id !== boutId) return bout;
        return { ...bout, aScore, bScore, complete: true, winnerId: aScore > bScore ? bout.aId : bout.bId };
      }),
    };
  });
}

export function allPouleBoutsComplete(poules: Poule[]): boolean {
  return poules.length > 0 && poules.every((p) => p.bouts.every((b) => b.complete));
}

export function nextIncompleteBout(
  poules: Poule[],
  currentPouleId: string,
  currentBoutId: string
): { pouleId: string; boutId: string } | null {
  let found = false;
  for (const poule of poules) {
    for (const bout of poule.bouts) {
      if (found && !bout.complete) return { pouleId: poule.id, boutId: bout.id };
      if (poule.id === currentPouleId && bout.id === currentBoutId) found = true;
    }
  }
  for (const poule of poules) {
    for (const bout of poule.bouts) {
      if (!bout.complete) return { pouleId: poule.id, boutId: bout.id };
    }
  }
  return null;
}
