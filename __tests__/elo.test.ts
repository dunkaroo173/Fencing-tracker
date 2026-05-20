import { applyEloChange, expectedScore, finalizeElo } from "../src/engine/elo";
import { createPoules, updatePouleBout } from "../src/engine/poules";
import { Fencer } from "../src/engine/types";

function makeFencer(name: string, rating = 1200): Fencer {
  return { id: `f-${name}`, name, rating, elo: rating };
}

describe("expectedScore", () => {
  it("returns 0.5 for equal ELOs", () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5);
  });
  it("returns > 0.5 for higher ELO", () => {
    expect(expectedScore(1400, 1200)).toBeGreaterThan(0.5);
  });
  it("returns < 0.5 for lower ELO", () => {
    expect(expectedScore(1000, 1200)).toBeLessThan(0.5);
  });
});

describe("applyEloChange", () => {
  it("winner gains ELO, loser loses ELO", () => {
    const result = applyEloChange(1200, 1200);
    expect(result.winner).toBeGreaterThan(1200);
    expect(result.loser).toBeLessThan(1200);
  });

  it("ELO is conserved (sum unchanged)", () => {
    const result = applyEloChange(1200, 1200);
    expect(result.winner + result.loser).toBe(2400);
  });

  it("strong upset yields larger ELO gain", () => {
    const upset = applyEloChange(1000, 1600); // underdog wins
    const expected = applyEloChange(1200, 1201); // near-equal match
    expect(upset.winner - 1000).toBeGreaterThan(expected.winner - 1200);
  });
});

describe("finalizeElo", () => {
  it("updates ELO from completed poule bouts", () => {
    const fencers = ["A", "B"].map((n) => makeFencer(n));
    let poules = createPoules(fencers, 6);
    poules = updatePouleBout(poules, poules[0].id, poules[0].bouts[0].id, 5, 3);
    const updated = finalizeElo(fencers, poules);
    const a = updated.find((f) => f.name === "A")!;
    const b = updated.find((f) => f.name === "B")!;
    expect(a.elo).toBeGreaterThan(1200);
    expect(b.elo).toBeLessThan(1200);
  });

  it("does not change ELO for incomplete bouts", () => {
    const fencers = ["A", "B"].map((n) => makeFencer(n));
    const poules = createPoules(fencers, 6);
    // No bouts completed
    const updated = finalizeElo(fencers, poules);
    updated.forEach((f) => expect(f.elo).toBe(1200));
  });

  it("ignores bye slots", () => {
    const fencers = [makeFencer("A")];
    const updated = finalizeElo(fencers, [], undefined);
    expect(updated[0].elo).toBe(1200);
  });
});
