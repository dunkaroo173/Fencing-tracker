import { createPoules, calculatePouleStandings, updatePouleBout, nextIncompleteBout } from "../src/engine/poules";
import { Fencer, Poule } from "../src/engine/types";

function makeFencer(name: string, rating = 1200): Fencer {
  return { id: `f-${name}`, name, rating, elo: rating };
}

describe("createPoules", () => {
  it("returns empty for no fencers", () => {
    expect(createPoules([])).toHaveLength(0);
  });

  it("creates one poule for 4 fencers", () => {
    const fencers = ["A", "B", "C", "D"].map((n) => makeFencer(n));
    const poules = createPoules(fencers, 6);
    expect(poules).toHaveLength(1);
    expect(poules[0].fencerIds).toHaveLength(4);
  });

  it("creates 2 poules for 12 fencers with target size 6", () => {
    const fencers = Array.from({ length: 12 }, (_, i) => makeFencer(`F${i}`, 1200 - i * 10));
    const poules = createPoules(fencers, 6);
    expect(poules).toHaveLength(2);
    expect(poules[0].fencerIds).toHaveLength(6);
    expect(poules[1].fencerIds).toHaveLength(6);
  });

  it("uses snake seeding so top fencers are in different poules", () => {
    const fencers = [
      makeFencer("Top1", 2000),
      makeFencer("Top2", 1900),
      makeFencer("Mid1", 1500),
      makeFencer("Mid2", 1400),
      makeFencer("Low1", 1100),
      makeFencer("Low2", 1000),
      makeFencer("Low3", 900),
      makeFencer("Low4", 800),
    ];
    const poules = createPoules(fencers, 4);
    const poule0Ids = poules[0].fencerIds;
    const poule1Ids = poules[1].fencerIds;
    expect(poule0Ids).toContain("f-Top1");
    expect(poule1Ids).toContain("f-Top2");
  });

  it("generates round-robin bouts for each poule", () => {
    const fencers = ["A", "B", "C", "D", "E"].map((n) => makeFencer(n));
    const poules = createPoules(fencers, 6);
    const boutCount = poules.reduce((sum, p) => sum + p.bouts.length, 0);
    // 5 fencers in 1 poule → 5*4/2 = 10 bouts
    expect(boutCount).toBe(10);
  });

  it("all bouts start incomplete", () => {
    const fencers = ["A", "B", "C"].map((n) => makeFencer(n));
    const poules = createPoules(fencers, 6);
    poules.forEach((p) => p.bouts.forEach((b) => expect(b.complete).toBe(false)));
  });
});

describe("calculatePouleStandings", () => {
  it("ranks by wins first", () => {
    const fencers = ["A", "B", "C"].map((n) => makeFencer(n));
    let poules = createPoules(fencers, 6);
    // A beats B 5-3, A beats C 5-2, B beats C 5-4
    poules = updatePouleBout(poules, poules[0].id, poules[0].bouts[0].id, 5, 3); // A vs B
    poules = updatePouleBout(poules, poules[0].id, poules[0].bouts[1].id, 5, 2); // A vs C
    poules = updatePouleBout(poules, poules[0].id, poules[0].bouts[2].id, 5, 4); // B vs C
    const standings = calculatePouleStandings(fencers, poules);
    expect(standings[0].name).toBe("A");
    expect(standings[0].wins).toBe(2);
    expect(standings[1].name).toBe("B");
    expect(standings[1].wins).toBe(1);
    expect(standings[2].name).toBe("C");
    expect(standings[2].wins).toBe(0);
  });

  it("uses indicator as tiebreaker", () => {
    const fencers = ["A", "B", "C"].map((n) => makeFencer(n));
    let poules = createPoules(fencers, 6);
    // A and B both win one bout; A has better indicator
    poules = updatePouleBout(poules, poules[0].id, poules[0].bouts[0].id, 5, 0); // A beats B 5-0
    poules = updatePouleBout(poules, poules[0].id, poules[0].bouts[1].id, 0, 5); // C beats A 5-0
    poules = updatePouleBout(poules, poules[0].id, poules[0].bouts[2].id, 5, 4); // B beats C 5-4
    const standings = calculatePouleStandings(fencers, poules);
    expect(standings[0].wins).toBe(1);
    // A: ind = 5-0 + 0-5 = 0; B: ind = 0-5 + 5-4 = -4; C: ind = 5-0 + 4-5 = 4
    // Actually: A ts=5 tr=5 ind=0; B ts=5 tr=9 ind=-4; C ts=9 tr=5 ind=4
    // C has 1 win, A has 1 win, B has 1 win
    // So sorted: C (ind+4), A (ind 0), B (ind -4)
    expect(standings[0].name).toBe("C");
    expect(standings[1].name).toBe("A");
  });
});

describe("nextIncompleteBout", () => {
  it("returns the next incomplete bout after the current one", () => {
    const fencers = ["A", "B", "C"].map((n) => makeFencer(n));
    const poules = createPoules(fencers, 6);
    const pouleId = poules[0].id;
    const bout0 = poules[0].bouts[0].id;
    const bout1 = poules[0].bouts[1].id;
    const result = nextIncompleteBout(poules, pouleId, bout0);
    expect(result).toEqual({ pouleId, boutId: bout1 });
  });

  it("wraps back to first if at end", () => {
    const fencers = ["A", "B"].map((n) => makeFencer(n));
    const poules = createPoules(fencers, 6);
    const pouleId = poules[0].id;
    const boutId = poules[0].bouts[0].id;
    const result = nextIncompleteBout(poules, pouleId, boutId);
    // Only 1 bout, wraps back
    expect(result).toEqual({ pouleId, boutId });
  });
});
