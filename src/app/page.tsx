'use client';

import { useState } from 'react';
import LeagueInput from '@/components/LeagueInput';
import DraftBoard from '@/components/DraftBoard';
import MaxPFComparison from '@/components/MaxPFComparison';
import type {
  DraftOrderMethod,
  League,
  Roster,
  User,
  TeamStanding,
  DraftBoard as DraftBoardType,
} from '@/lib/types';
import {
  fetchLeague,
  fetchRosters,
  fetchUsers,
  fetchAllMatchups,
  fetchTradedPicks,
  fetchPlayers,
  fetchWinnersBracket,
} from '@/lib/sleeper-api';
import { calculateAllMaxPF } from '@/lib/max-pf-calculator';
import { calculateDraftOrder, generateDraftBoard } from '@/lib/draft-order';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [standingsLeague, setStandingsLeague] = useState<League | null>(null);
  const [standings, setStandings] = useState<TeamStanding[] | null>(null);
  const [draftBoards, setDraftBoards] = useState<DraftBoardType[] | null>(null);
  const [playoffsIncluded, setPlayoffsIncluded] = useState(false);

  const handleSubmit = async (
    leagueId: string,
    method: DraftOrderMethod,
    includePlayoffs: boolean
  ) => {
    setIsLoading(true);
    setError(null);
    setPlayoffsIncluded(includePlayoffs);

    try {
      // First fetch the current league to check for previous_league_id
      const currentLeague = await fetchLeague(leagueId);
      setLeague(currentLeague);

      // Determine which league to use for standings/matchups
      // If there's a previous_league_id, use that for historical data
      const previousLeagueId = currentLeague.previous_league_id;
      const standingsLeagueId = previousLeagueId || leagueId;

      console.log('Current league:', leagueId, 'Season:', currentLeague.season);
      console.log('Using for standings:', standingsLeagueId);

      // Fetch data from the standings league (previous season)
      const [standingsLeagueData, rosters, users, winnersBracket, players] =
        await Promise.all([
          previousLeagueId ? fetchLeague(previousLeagueId) : Promise.resolve(currentLeague),
          fetchRosters(standingsLeagueId),
          fetchUsers(standingsLeagueId),
          fetchWinnersBracket(standingsLeagueId),
          fetchPlayers(),
        ]);

      setStandingsLeague(standingsLeagueData);

      // Fetch traded picks from CURRENT league (for the upcoming draft)
      const tradedPicks = await fetchTradedPicks(leagueId);

      // Fetch matchups from standings league
      // Regular season is weeks 1-14, playoffs are 15-17
      const weeks = includePlayoffs
        ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
        : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
      const matchupsByWeek = await fetchAllMatchups(standingsLeagueId, weeks);

      // Calculate max PF for all rosters using standings league roster positions
      const rosterIds = rosters.map((r: Roster) => r.roster_id);
      const maxPFByRoster = calculateAllMaxPF(
        rosterIds,
        matchupsByWeek,
        standingsLeagueData.roster_positions,
        players,
        weeks
      );

      // Get Sleeper's max PF from roster settings (ppts)
      const sleeperMaxPFByRoster = new Map<number, number>();
      for (const roster of rosters) {
        const ppts = roster.settings.ppts || 0;
        const ppts_decimal = roster.settings.ppts_decimal || 0;
        sleeperMaxPFByRoster.set(roster.roster_id, ppts + ppts_decimal / 100);
      }

      // Calculate draft order using standings league data
      const teamStandings = calculateDraftOrder(
        method,
        rosters,
        users,
        maxPFByRoster,
        sleeperMaxPFByRoster,
        winnersBracket,
        standingsLeagueData.settings.playoff_teams
      );

      setStandings(teamStandings);

      // Generate draft board for the current league's season
      // The draft year is the current league's season (e.g., 2026 league = 2026 draft)
      const draftYear = currentLeague.season;
      const board = generateDraftBoard(
        teamStandings,
        tradedPicks,
        rosters,
        users,
        draftYear,
        currentLeague.settings.draft_rounds
      );

      setDraftBoards([board]);
    } catch (err) {
      console.error('Error fetching league data:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch league data. Please check the league ID and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-text-primary mb-2">
            Dynasty Draft Board
          </h1>
          <p className="text-text-secondary">
            Generate draft boards with traded picks from your Sleeper league
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 mb-8 shadow-glow-sm">
          <LeagueInput onSubmit={handleSubmit} isLoading={isLoading} />
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-8">
            {error}
          </div>
        )}

        {standings && draftBoards && league && (
          <div className="space-y-8">
            {/* Season Info Banner */}
            {standingsLeague && standingsLeague.league_id !== league.league_id && (
              <div className="bg-accent/10 border border-accent/30 text-accent px-4 py-3 rounded-lg">
                <strong>Note:</strong> Draft order is based on {standingsLeague.season} season results.
                Traded picks are from the {league.season} season.
              </div>
            )}

            {/* Draft Board */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-glow-sm">
              <DraftBoard boards={draftBoards} leagueName={league.name} />
            </div>

            {/* Max PF Comparison */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-xl font-bold text-text-primary mb-4">
                Draft Order & Max PF Comparison
                {standingsLeague && (
                  <span className="text-base font-normal text-text-secondary ml-2">
                    ({standingsLeague.season} Season)
                  </span>
                )}
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                Calculated Max PF uses {playoffsIncluded ? 'all weeks including playoffs (1-17)' : 'regular season weeks (1-14)'} with optimal
                lineup placement. Sleeper Max PF is from the API.
              </p>
              <MaxPFComparison standings={standings} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
