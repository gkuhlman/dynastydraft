// Sleeper API Types

export interface LeagueSettings {
  num_teams: number;
  playoff_teams: number;
  playoff_week_start: number;
  draft_rounds: number;
  type: number; // 0 = redraft, 1 = keeper, 2 = dynasty
  best_ball: number;
  last_scored_leg: number;
}

export interface League {
  league_id: string;
  name: string;
  roster_positions: string[];
  settings: LeagueSettings;
  season: string;
  status: string;
  total_rosters: number;
  previous_league_id?: string;
  draft_id?: string;
}

export interface RosterSettings {
  wins: number;
  losses: number;
  ties: number;
  fpts: number;
  fpts_decimal?: number;
  fpts_against?: number;
  fpts_against_decimal?: number;
  ppts?: number; // Potential points (Sleeper's max PF calculation)
  ppts_decimal?: number;
}

export interface Roster {
  roster_id: number;
  owner_id: string;
  settings: RosterSettings;
  players: string[];
  starters: string[];
}

export interface User {
  user_id: string;
  display_name: string;
  avatar?: string | null;
  metadata?: {
    team_name?: string;
  };
}

export interface Matchup {
  roster_id: number;
  matchup_id: number;
  players: string[];
  players_points: Record<string, number>;
  starters: string[];
  starters_points: number[];
  points: number;
  custom_points: number | null;
}

export interface TradedPick {
  round: number;
  season: string;
  roster_id: number; // Original pick owner's roster
  owner_id: number; // Current owner's roster_id
  previous_owner_id: number;
}

export interface Player {
  player_id: string;
  first_name: string;
  last_name: string;
  position: string;
  fantasy_positions: string[];
  team: string | null;
}

export interface PlayoffMatchup {
  r: number; // round
  m: number; // matchup number
  t1: number | null; // team 1 roster_id
  t2: number | null; // team 2 roster_id
  w: number | null; // winner roster_id
  l: number | null; // loser roster_id
  t1_from?: { w?: number; l?: number }; // where t1 came from
  t2_from?: { w?: number; l?: number }; // where t2 came from
  p?: number; // place - the position the winner of this match finishes in
}

export interface SleeperDraft {
  draft_id: string;
  league_id: string;
  season: string;
  status: string;
  type: string; // 'linear', 'snake', etc.
  draft_order: Record<string, number> | null; // user_id -> slot position
  slot_to_roster_id: Record<string, number> | null; // slot -> roster_id
  settings: {
    teams: number;
    rounds: number;
    slots_qb: number;
    slots_rb: number;
    slots_wr: number;
    slots_te: number;
    slots_flex: number;
    slots_k: number;
    slots_bn: number;
    pick_timer: number;
  };
  metadata?: {
    name?: string;
    description?: string;
  };
}

export interface SleeperDraftPick {
  player_id: string;
  picked_by: string; // user_id
  roster_id: string;
  round: number;
  draft_slot: number;
  pick_no: number;
  draft_id: string;
  is_keeper: boolean | null;
  metadata: {
    first_name: string;
    last_name: string;
    position: string;
    team: string | null;
  };
}

// App-specific types

export type DraftOrderMethod = 'standings' | 'standings_max_pf' | 'sleeper_draft';

export interface TeamStanding {
  rosterId: number;
  ownerId: string;
  displayName: string;
  teamName?: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  maxPF: number;
  sleeperMaxPF: number;
  playoffFinish?: number; // 1 = champion, 2 = runner-up, etc.
  draftPosition?: number;
}

export interface PickedPlayer {
  name: string;
  position: string;
  team: string | null;
}

export interface DraftPick {
  season: string;
  round: number;
  pick: number; // 1-12 position in round
  originalOwnerRosterId: number;
  currentOwnerRosterId: number;
  originalOwnerName: string;
  currentOwnerName: string;
  originalOwnerAvatar?: string | null;
  currentOwnerAvatar?: string | null;
  isTraded: boolean;
  // Live draft fields
  pickedPlayer?: PickedPlayer;
  isOnTheClock?: boolean;
}

export interface DraftBoard {
  season: string;
  rounds: number;
  picks: DraftPick[];
}
