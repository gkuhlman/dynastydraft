import type {
  League,
  Roster,
  User,
  Matchup,
  TradedPick,
  Player,
  PlayoffMatchup,
} from './types';

const BASE_URL = 'https://api.sleeper.app/v1';

// Cache for player data (it's ~5MB)
let playersCache: Record<string, Player> | null = null;

export async function fetchLeague(leagueId: string): Promise<League> {
  const response = await fetch(`${BASE_URL}/league/${leagueId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch league: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchRosters(leagueId: string): Promise<Roster[]> {
  const response = await fetch(`${BASE_URL}/league/${leagueId}/rosters`);
  if (!response.ok) {
    throw new Error(`Failed to fetch rosters: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchUsers(leagueId: string): Promise<User[]> {
  const response = await fetch(`${BASE_URL}/league/${leagueId}/users`);
  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchMatchups(
  leagueId: string,
  week: number
): Promise<Matchup[]> {
  const response = await fetch(
    `${BASE_URL}/league/${leagueId}/matchups/${week}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch matchups for week ${week}: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchAllMatchups(
  leagueId: string,
  weeks: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
): Promise<Map<number, Matchup[]>> {
  const matchupsByWeek = new Map<number, Matchup[]>();

  // Fetch all weeks in parallel
  const results = await Promise.all(
    weeks.map(async (week) => {
      const matchups = await fetchMatchups(leagueId, week);
      return { week, matchups };
    })
  );

  for (const { week, matchups } of results) {
    matchupsByWeek.set(week, matchups);
  }

  return matchupsByWeek;
}

export async function fetchTradedPicks(leagueId: string): Promise<TradedPick[]> {
  const response = await fetch(`${BASE_URL}/league/${leagueId}/traded_picks`);
  if (!response.ok) {
    throw new Error(`Failed to fetch traded picks: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchPlayers(): Promise<Record<string, Player>> {
  // Return cached data if available
  if (playersCache) {
    return playersCache;
  }

  // Check localStorage cache
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('sleeper_players');
    const cacheTime = localStorage.getItem('sleeper_players_time');

    // Cache is valid for 24 hours
    if (cached && cacheTime) {
      const cacheAge = Date.now() - parseInt(cacheTime, 10);
      if (cacheAge < 24 * 60 * 60 * 1000) {
        playersCache = JSON.parse(cached);
        return playersCache!;
      }
    }
  }

  const response = await fetch(`${BASE_URL}/players/nfl`);
  if (!response.ok) {
    throw new Error(`Failed to fetch players: ${response.statusText}`);
  }

  const data = await response.json();
  playersCache = data;

  // Cache in localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('sleeper_players', JSON.stringify(data));
      localStorage.setItem('sleeper_players_time', Date.now().toString());
    } catch (e) {
      // localStorage might be full, ignore
      console.warn('Could not cache player data:', e);
    }
  }

  return data;
}

export async function fetchWinnersBracket(
  leagueId: string
): Promise<PlayoffMatchup[]> {
  const response = await fetch(
    `${BASE_URL}/league/${leagueId}/winners_bracket`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch winners bracket: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchLosersBracket(
  leagueId: string
): Promise<PlayoffMatchup[]> {
  const response = await fetch(
    `${BASE_URL}/league/${leagueId}/losers_bracket`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch losers bracket: ${response.statusText}`);
  }
  return response.json();
}

// Get previous season's league ID (for looking up historical data)
export async function fetchPreviousLeagueId(
  leagueId: string
): Promise<string | null> {
  const league = await fetchLeague(leagueId);
  return league.previous_league_id || null;
}
