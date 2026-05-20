import { createDEBracket, enterDEMatchScore, nextIncompleteMatch, seedOrder } from "../src/engine/bracket";
import { PouleStanding } from "../src/engine/types";

function makeStanding(name: string, wins = 0, indicator = 0, touchesScored = 0, rating = 1200): PouleStanding {
  return { id: `f-${name}`, name, wins, indicator, touchesScored, losses: 0, touchesReceived: 0, rating, elo: rating };
}

describe("seedOrder", () => {
  it("produces [1,2] for size 2", () => expect(seedOrder(2)).toEqual([1, 2]));
  it("produces [1,4,3,2] for size 4", () => expect(seedOrder(4)).toEqual([1, 4, 2, 3]));
  it("produces correct length for size 8", () => expect(seedOrder(8)).toHaveLength(8));
  it("always has #1 seed first", () => {
    [2, 4, 8, 16].forEach((n) => expect(seedOrder(n)[0]).toBe(1));
  });
});

describe("createDEBracket", () => {
  it("creates a bracket with power-of-two size", () => {
    const standings = Array.from({ length: 5 }, (_, i) => makeStanding(`F${i}`));
    const bracket = createDEBracket(standings);
    expect(bracket.size).toBe(8);
  });

  it("has correct number of rounds for 8 fencers", () => {
    const standings = Array.from({ length: 8 }, (_, i) => makeStanding(`F${i}`));
    const bracket = createDEBracket(standings);
    expect(bracket.rounds).toHaveLength(3); // R1(4), SF(2), F(1)
  });

  it("auto-advances byes in first round", () => {
    const standings = Array.from({ length: 3 }, (_, i) => makeStanding(`F${i}`));
    // size=4, 1 bye slot
    const bracket = createDEBracket(standings);
    const r1 = bracket.rounds[0];
    const byeMatch = r1.find((m) => m.aId.startsWith("bye-") || m.bId.startsWith("bye-"));
    expect(byeMatch?.complete).toBe(true);
  });

  it("all first-round matches have fencer ids assigned", () => {
    const standings = Array.from({ length: 4 }, (_, i) => makeStanding(`F${i}`));
    const bracket = createDEBracket(standings);
    bracket.rounds[0].forEach((match) => {
      expect(match.aId).toBeTruthy();
      expect(match.bId).toBeTruthy();
    });
  });
});

describe("enterDEMatchScore", () => {
  it("marks match complete and advances winner", () => {
    const standings = [makeStanding("A"), makeStanding("B")];
    let bracket = createDEBracket(standings);
    const matchId = bracket.rounds[0][0].id;
    const aId = bracket.rounds[0][0].aId;
    bracket = enterDEMatchScore(bracket, matchId, 15, 7);
    const match = bracket.rounds[0][0];
    expect(match.complete).toBe(true);
    expect(match.winnerId).toBe(aId);
    expect(match.aScore).toBe(15);
    expect(match.bScore).toBe(7);
  });

  it("advances winner to next round", () => {
    const standings = Array.from({ length: 4 }, (_, i) => makeStanding(`F${i}`));
    let bracket = createDEBracket(standings);
    const m0 = bracket.rounds[0][0];
    bracket = enterDEMatchScore(bracket, m0.id, 15, 5);
    const sf = bracket.rounds[1][0];
    expect(sf.aId === m0.aId || sf.bId === m0.aId).toBe(true);
  });
});

describe("nextIncompleteMatch", () => {
  it("returns first incomplete match when none specified", () => {
    const standings = Array.from({ length: 4 }, (_, i) => makeStanding(`F${i}`));
    const bracket = createDEBracket(standings);
    const next = nextIncompleteMatch(bracket);
    expect(next).not.toBeNull();
    expect(next?.complete).toBe(false);
  });

  it("returns null when all matches are done", () => {
    const standings = [makeStanding("A"), makeStanding("B")];
    let bracket = createDEBracket(standings);
    bracket.rounds.flat().forEach((m) => {
      if (!m.complete) bracket = enterDEMatchScore(bracket, m.id, 15, 0);
    });
    const next = nextIncompleteMatch(bracket);
    expect(next).toBeNull();
  });
});
