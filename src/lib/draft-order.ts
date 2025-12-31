import type {
  Roster,
  User,
  PlayoffMatchup,
  TradedPick,
  TeamStanding,
  DraftPick,
  DraftBoard,
  DraftOrderMethod,
} from './types';

/**
 * Get display name for a roster
 */
function getDisplayName(
  rosterId: number,
  rosters: Roster[],
  users: User[]
): string {
  const roster = rosters.find((r) => r.roster_id === rosterId);
  if (!roster) return `Team ${rosterId}`;

  const user = users.find((u) => u.user_id === roster.owner_id);
  if (!user) return `Team ${rosterId}`;

  return user.display_name || user.metadata?.team_name || `Team ${rosterId}`;
}

/**
 * Get team name for a roster
 */
function getTeamName(
  rosterId: number,
  rosters: Roster[],
  users: User[]
): string | undefined {
  const roster = rosters.find((r) => r.roster_id === rosterId);
  if (!roster) return undefined;

  const user = users.find((u) => u.user_id === roster.owner_id);
  return user?.metadata?.team_name;
}

/**
 * Calculate playoff finish position from bracket
 * Returns positions 1-6 where 1 = champion
 *
 * The bracket uses a `p` field to indicate the place the winner finishes in.
 * For example:
 * - p: 1 = Championship game (winner = 1st, loser = 2nd)
 * - p: 3 = 3rd place game (winner = 3rd, loser = 4th)
 * - p: 5 = 5th place game (winner = 5th, loser = 6th)
 */
export function calculatePlayoffFinish(
  winnersBracket: PlayoffMatchup[],
  numPlayoffTeams: number
): Map<number, number> {
  const finishPositions = new Map<number, number>();

  // Process matchups that have a `p` (place) field
  // These are the "placement" games where we know exactly what place teams finish
  for (const matchup of winnersBracket) {
    if (matchup.p !== undefined && matchup.w && matchup.l) {
      // Winner gets place `p`, loser gets place `p + 1`
      finishPositions.set(matchup.w, matchup.p);
      finishPositions.set(matchup.l, matchup.p + 1);
    }
  }

  // If no `p` field was found (older bracket format), fall back to round-based logic
  if (finishPositions.size === 0) {
    const maxRound = Math.max(...winnersBracket.map((m) => m.r));

    // Find championship game (highest round, typically the one without p field in older format)
    const championship = winnersBracket.find((m) => m.r === maxRound && m.w && m.l);
    if (championship) {
      finishPositions.set(championship.w!, 1);
      finishPositions.set(championship.l!, 2);
    }

    // Process remaining matchups by round (descending)
    let nextPosition = 3;
    for (let round = maxRound - 1; round >= 1; round--) {
      const roundMatchups = winnersBracket.filter((m) => m.r === round && m.l);
      for (const matchup of roundMatchups) {
        if (matchup.l && !finishPositions.has(matchup.l)) {
          finishPositions.set(matchup.l, nextPosition++);
        }
      }
    }
  }

  return finishPositions;
}

/**
 * Get all playoff team roster IDs from bracket
 */
export function getPlayoffTeams(
  winnersBracket: PlayoffMatchup[]
): Set<number> {
  const playoffTeams = new Set<number>();

  for (const matchup of winnersBracket) {
    if (matchup.t1) playoffTeams.add(matchup.t1);
    if (matchup.t2) playoffTeams.add(matchup.t2);
  }

  return playoffTeams;
}

/**
 * Calculate draft order based on standings only
 * Worst team picks first
 */
export function calculateStandingsOrder(
  rosters: Roster[],
  users: User[],
  maxPFByRoster: Map<number, number>,
  sleeperMaxPFByRoster: Map<number, number>
): TeamStanding[] {
  const standings: TeamStanding[] = rosters.map((roster) => ({
    rosterId: roster.roster_id,
    ownerId: roster.owner_id,
    displayName: getDisplayName(roster.roster_id, rosters, users),
    teamName: getTeamName(roster.roster_id, rosters, users),
    wins: roster.settings.wins,
    losses: roster.settings.losses,
    ties: roster.settings.ties,
    pointsFor: roster.settings.fpts + (roster.settings.fpts_decimal || 0) / 100,
    maxPF: maxPFByRoster.get(roster.roster_id) || 0,
    sleeperMaxPF: sleeperMaxPFByRoster.get(roster.roster_id) || 0,
  }));

  // Sort by wins (ascending = worst first), then by points for (ascending)
  standings.sort((a, b) => {
    if (a.wins !== b.wins) return a.wins - b.wins;
    return a.pointsFor - b.pointsFor;
  });

  // Assign draft positions
  standings.forEach((team, index) => {
    team.draftPosition = index + 1;
  });

  return standings;
}

/**
 * Calculate draft order using standings + max PF method
 * - Positions 7-12: Playoff teams by finish (champion = 12th)
 * - Positions 1-6: Non-playoff teams by inverse max PF (lowest = 1st)
 */
export function calculateStandingsMaxPFOrder(
  rosters: Roster[],
  users: User[],
  maxPFByRoster: Map<number, number>,
  sleeperMaxPFByRoster: Map<number, number>,
  winnersBracket: PlayoffMatchup[],
  numPlayoffTeams: number
): TeamStanding[] {
  const playoffTeams = getPlayoffTeams(winnersBracket);
  const playoffFinish = calculatePlayoffFinish(winnersBracket, numPlayoffTeams);

  const standings: TeamStanding[] = rosters.map((roster) => ({
    rosterId: roster.roster_id,
    ownerId: roster.owner_id,
    displayName: getDisplayName(roster.roster_id, rosters, users),
    teamName: getTeamName(roster.roster_id, rosters, users),
    wins: roster.settings.wins,
    losses: roster.settings.losses,
    ties: roster.settings.ties,
    pointsFor: roster.settings.fpts + (roster.settings.fpts_decimal || 0) / 100,
    maxPF: maxPFByRoster.get(roster.roster_id) || 0,
    sleeperMaxPF: sleeperMaxPFByRoster.get(roster.roster_id) || 0,
    playoffFinish: playoffFinish.get(roster.roster_id),
  }));

  // Separate playoff and non-playoff teams
  const playoffStandings = standings.filter((t) =>
    playoffTeams.has(t.rosterId)
  );
  const nonPlayoffStandings = standings.filter(
    (t) => !playoffTeams.has(t.rosterId)
  );

  // Sort playoff teams by finish position (1st place = last pick)
  playoffStandings.sort((a, b) => {
    const finishA = a.playoffFinish || 99;
    const finishB = b.playoffFinish || 99;
    return finishB - finishA; // Higher finish (worse) picks earlier
  });

  // Sort non-playoff teams by max PF (lowest first)
  nonPlayoffStandings.sort((a, b) => a.maxPF - b.maxPF);

  // Combine: non-playoff (1-6) + playoff (7-12)
  const combined = [...nonPlayoffStandings, ...playoffStandings];

  // Assign draft positions
  combined.forEach((team, index) => {
    team.draftPosition = index + 1;
  });

  return combined;
}

/**
 * Get current owner of a pick after trades
 */
export function getPickOwner(
  tradedPicks: TradedPick[],
  season: string,
  round: number,
  originalRosterId: number
): number {
  // Find if this pick was traded
  const trade = tradedPicks.find(
    (t) =>
      t.season === season &&
      t.round === round &&
      t.roster_id === originalRosterId
  );

  return trade ? trade.owner_id : originalRosterId;
}

/**
 * Generate complete draft board
 */
export function generateDraftBoard(
  standings: TeamStanding[],
  tradedPicks: TradedPick[],
  rosters: Roster[],
  users: User[],
  season: string,
  draftRounds: number
): DraftBoard {
  const picks: DraftPick[] = [];

  // Create a map of draft position to roster ID
  const positionToRoster = new Map<number, number>();
  for (const team of standings) {
    if (team.draftPosition) {
      positionToRoster.set(team.draftPosition, team.rosterId);
    }
  }

  for (let round = 1; round <= draftRounds; round++) {
    for (let pick = 1; pick <= standings.length; pick++) {
      const originalOwnerRosterId = positionToRoster.get(pick)!;
      const currentOwnerRosterId = getPickOwner(
        tradedPicks,
        season,
        round,
        originalOwnerRosterId
      );

      picks.push({
        season,
        round,
        pick,
        originalOwnerRosterId,
        currentOwnerRosterId,
        originalOwnerName: getDisplayName(originalOwnerRosterId, rosters, users),
        currentOwnerName: getDisplayName(currentOwnerRosterId, rosters, users),
        isTraded: originalOwnerRosterId !== currentOwnerRosterId,
      });
    }
  }

  return {
    season,
    rounds: draftRounds,
    picks,
  };
}

/**
 * Main function to calculate draft order
 */
export function calculateDraftOrder(
  method: DraftOrderMethod,
  rosters: Roster[],
  users: User[],
  maxPFByRoster: Map<number, number>,
  sleeperMaxPFByRoster: Map<number, number>,
  winnersBracket?: PlayoffMatchup[],
  numPlayoffTeams?: number
): TeamStanding[] {
  if (method === 'standings') {
    return calculateStandingsOrder(rosters, users, maxPFByRoster, sleeperMaxPFByRoster);
  } else {
    if (!winnersBracket || !numPlayoffTeams) {
      throw new Error('Winners bracket and playoff teams required for standings + max PF method');
    }
    return calculateStandingsMaxPFOrder(
      rosters,
      users,
      maxPFByRoster,
      sleeperMaxPFByRoster,
      winnersBracket,
      numPlayoffTeams
    );
  }
}
