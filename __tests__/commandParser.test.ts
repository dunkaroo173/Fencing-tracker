import { parseCommand } from "../src/voice/CommandParser";

describe("parseCommand — navigation", () => {
  it("navigates to fencers", () => {
    expect(parseCommand("show fencers").type).toBe("NAVIGATE");
  });
  it("navigates to standings", () => {
    const cmd = parseCommand("show standings");
    expect(cmd.type).toBe("NAVIGATE");
    if (cmd.type === "NAVIGATE") expect(cmd.screen).toBe("standings");
  });
  it("navigates to de bracket", () => {
    const cmd = parseCommand("go to bracket");
    expect(cmd.type).toBe("NAVIGATE");
    if (cmd.type === "NAVIGATE") expect(cmd.screen).toBe("de");
  });
});

describe("parseCommand — tournament flow", () => {
  it("creates poules", () => expect(parseCommand("create poules").type).toBe("CREATE_POULES"));
  it("creates DE bracket", () => expect(parseCommand("create bracket").type).toBe("CREATE_DE"));
  it("finalizes ELO", () => expect(parseCommand("finalize elo").type).toBe("FINALIZE_ELO"));
  it("exports tournament", () => expect(parseCommand("export").type).toBe("EXPORT"));
  it("resets tournament", () => expect(parseCommand("reset").type).toBe("RESET"));
});

describe("parseCommand — fencer management", () => {
  it("adds fencer with default rating", () => {
    const cmd = parseCommand("add fencer Alice Smith");
    expect(cmd.type).toBe("ADD_FENCER");
    if (cmd.type === "ADD_FENCER") {
      expect(cmd.name).toBe("Alice Smith");
      expect(cmd.rating).toBe(1200);
    }
  });

  it("adds fencer with custom rating", () => {
    const cmd = parseCommand("add Bob rating 1500");
    expect(cmd.type).toBe("ADD_FENCER");
    if (cmd.type === "ADD_FENCER") {
      expect(cmd.name).toBe("Bob");
      expect(cmd.rating).toBe(1500);
    }
  });

  it("removes fencer", () => {
    const cmd = parseCommand("remove fencer Bob");
    expect(cmd.type).toBe("REMOVE_FENCER");
    if (cmd.type === "REMOVE_FENCER") expect(cmd.name).toBe("bob"); // tokenize lowercases
  });
});

describe("parseCommand — score current bout", () => {
  it("parses word numbers", () => {
    const cmd = parseCommand("five three");
    expect(cmd.type).toBe("SCORE_CURRENT");
    if (cmd.type === "SCORE_CURRENT") {
      expect(cmd.aScore).toBe(5);
      expect(cmd.bScore).toBe(3);
    }
  });

  it("parses digit scores", () => {
    const cmd = parseCommand("score 15 7");
    expect(cmd.type).toBe("SCORE_CURRENT");
    if (cmd.type === "SCORE_CURRENT") {
      expect(cmd.aScore).toBe(15);
      expect(cmd.bScore).toBe(7);
    }
  });

  it("parses 'X to Y' format", () => {
    const cmd = parseCommand("5 to 3");
    expect(cmd.type).toBe("SCORE_CURRENT");
    if (cmd.type === "SCORE_CURRENT") {
      expect(cmd.aScore).toBe(5);
      expect(cmd.bScore).toBe(3);
    }
  });
});

describe("parseCommand — score by name", () => {
  const names = ["Alice", "Bob"];

  it("parses name score name score", () => {
    const cmd = parseCommand("alice five bob three", names);
    expect(cmd.type).toBe("SCORE_BY_NAME");
    if (cmd.type === "SCORE_BY_NAME") {
      expect(cmd.nameA).toBe("Alice");
      expect(cmd.scoreA).toBe(5);
      expect(cmd.nameB).toBe("Bob");
      expect(cmd.scoreB).toBe(3);
    }
  });
});

describe("parseCommand — next bout", () => {
  it("parses 'next bout'", () => expect(parseCommand("next bout").type).toBe("NEXT_BOUT"));
  it("parses bare 'next'", () => expect(parseCommand("next").type).toBe("NEXT_BOUT"));
  it("parses 'skip match'", () => expect(parseCommand("skip match").type).toBe("NEXT_BOUT"));
});

describe("parseCommand — unknown", () => {
  it("returns UNKNOWN for unrecognized commands", () => {
    expect(parseCommand("xyzzy foobar").type).toBe("UNKNOWN");
  });
});
