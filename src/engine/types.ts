export type Fencer = {
  id: string;
  name: string;
  rating: number;
  elo: number;
};

export type Bout = {
  id: string;
  aId: string;
  bId: string;
  aScore?: number;
  bScore?: number;
  complete: boolean;
  winnerId?: string;
};

export type Poule = {
  id: string;
  name: string;
  fencerIds: string[];
  bouts: Bout[];
};

export type PouleStanding = {
  id: string;
  name: string;
  rating: number;
  elo: number;
  wins: number;
  losses: number;
  touchesScored: number;
  touchesReceived: number;
  indicator: number;
};

export type BracketMatch = Bout & {
  round: number;
  matchIndex: number;
  nextMatchId?: string;
  nextSlot?: "aId" | "bId";
};

export type Bracket = {
  size: number;
  rounds: BracketMatch[][];
};

export type TournamentScreen = "fencers" | "poules" | "standings" | "de";
