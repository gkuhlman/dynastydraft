import type { Matchup, Player } from './types';

// Position eligibility for each roster slot
const POSITION_ELIGIBILITY: Record<string, string[]> = {
  QB: ['QB'],
  RB: ['RB'],
  WR: ['WR'],
  TE: ['TE'],
  K: ['K'],
  DEF: ['DEF'],
  FLEX: ['RB', 'WR', 'TE'],
  SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'],
  SUPERFLEX: ['QB', 'RB', 'WR', 'TE'], // Alternative naming
  REC_FLEX: ['WR', 'TE'],
  WRRB_FLEX: ['WR', 'RB'],
  IDP_FLEX: ['DL', 'LB', 'DB'],
  DL: ['DL', 'DE', 'DT'],
  LB: ['LB'],
  DB: ['DB', 'CB', 'S'],
  BN: [], // Bench - not counted
};

// Slots that should be filled last (most flexible)
const SLOT_PRIORITY: Record<string, number> = {
  QB: 1,
  K: 1,
  DEF: 1,
  RB: 2,
  WR: 2,
  TE: 2,
  DL: 2,
  LB: 2,
  DB: 2,
  REC_FLEX: 3,
  WRRB_FLEX: 3,
  FLEX: 4,
  IDP_FLEX: 4,
  SUPER_FLEX: 5,
  SUPERFLEX: 5,
  BN: 99, // Never filled for max PF
};

interface PlayerScore {
  playerId: string;
  points: number;
  position: string;
}

/**
 * Calculate optimal lineup points for a single matchup
 */
export function calculateOptimalLineup(
  matchup: Matchup,
  rosterPositions: string[],
  players: Record<string, Player>
): number {
  // Get all players with their scores and positions
  const playerScores: PlayerScore[] = [];

  for (const [playerId, points] of Object.entries(matchup.players_points)) {
    const player = players[playerId];
    if (player) {
      playerScores.push({
        playerId,
        points: points || 0,
        position: player.position || 'BN',
      });
    } else {
      // Check if it's a defense (format like "PHI", "DAL")
      if (playerId.length <= 3 && playerId === playerId.toUpperCase()) {
        playerScores.push({
          playerId,
          points: points || 0,
          position: 'DEF',
        });
      }
    }
  }

  // Sort players by points descending
  playerScores.sort((a, b) => b.points - a.points);

  // Get starting slots (exclude bench)
  const startingSlots = rosterPositions.filter(
    (slot) => slot !== 'BN' && POSITION_ELIGIBILITY[slot]?.length > 0
  );

  // Sort slots by priority (most restrictive first)
  const sortedSlots = [...startingSlots].sort((a, b) => {
    const priorityA = SLOT_PRIORITY[a] || 50;
    const priorityB = SLOT_PRIORITY[b] || 50;
    return priorityA - priorityB;
  });

  // Greedy assignment
  const usedPlayers = new Set<string>();
  let totalPoints = 0;

  for (const slot of sortedSlots) {
    const eligiblePositions = POSITION_ELIGIBILITY[slot];
    if (!eligiblePositions || eligiblePositions.length === 0) continue;

    // Find best available player for this slot
    const bestPlayer = playerScores.find(
      (p) =>
        !usedPlayers.has(p.playerId) &&
        eligiblePositions.includes(p.position)
    );

    if (bestPlayer) {
      usedPlayers.add(bestPlayer.playerId);
      totalPoints += bestPlayer.points;
    }
  }

  return totalPoints;
}

/**
 * Calculate total max PF for a roster across multiple weeks
 */
export function calculateMaxPF(
  rosterId: number,
  matchupsByWeek: Map<number, Matchup[]>,
  rosterPositions: string[],
  players: Record<string, Player>,
  weeks: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
): number {
  let totalMaxPF = 0;

  for (const week of weeks) {
    const weekMatchups = matchupsByWeek.get(week);
    if (!weekMatchups) continue;

    const rosterMatchup = weekMatchups.find((m) => m.roster_id === rosterId);
    if (!rosterMatchup) continue;

    const weeklyOptimal = calculateOptimalLineup(
      rosterMatchup,
      rosterPositions,
      players
    );
    totalMaxPF += weeklyOptimal;
  }

  return Math.round(totalMaxPF * 100) / 100;
}

/**
 * Calculate max PF for all rosters
 */
export function calculateAllMaxPF(
  rosterIds: number[],
  matchupsByWeek: Map<number, Matchup[]>,
  rosterPositions: string[],
  players: Record<string, Player>,
  weeks?: number[]
): Map<number, number> {
  const maxPFByRoster = new Map<number, number>();

  for (const rosterId of rosterIds) {
    const maxPF = calculateMaxPF(
      rosterId,
      matchupsByWeek,
      rosterPositions,
      players,
      weeks
    );
    maxPFByRoster.set(rosterId, maxPF);
  }

  return maxPFByRoster;
}
