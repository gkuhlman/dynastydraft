'use client';

import { useState } from 'react';
import LeagueInput from '@/components/LeagueInput';
import DraftBoard from '@/components/DraftBoard';
import MaxPFComparison from '@/components/MaxPFComparison';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
      const currentLeague = await fetchLeague(leagueId);
      setLeague(currentLeague);

      const previousLeagueId = currentLeague.previous_league_id;
      const standingsLeagueId = previousLeagueId || leagueId;

      const [standingsLeagueData, rosters, users, winnersBracket, players] =
        await Promise.all([
          previousLeagueId ? fetchLeague(previousLeagueId) : Promise.resolve(currentLeague),
          fetchRosters(standingsLeagueId),
          fetchUsers(standingsLeagueId),
          fetchWinnersBracket(standingsLeagueId),
          fetchPlayers(),
        ]);

      setStandingsLeague(standingsLeagueData);

      const tradedPicks = await fetchTradedPicks(leagueId);

      const weeks = includePlayoffs
        ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
        : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
      const matchupsByWeek = await fetchAllMatchups(standingsLeagueId, weeks);

      const rosterIds = rosters.map((r: Roster) => r.roster_id);
      const maxPFByRoster = calculateAllMaxPF(
        rosterIds,
        matchupsByWeek,
        standingsLeagueData.roster_positions,
        players,
        weeks
      );

      const sleeperMaxPFByRoster = new Map<number, number>();
      for (const roster of rosters) {
        const ppts = roster.settings.ppts || 0;
        const ppts_decimal = roster.settings.ppts_decimal || 0;
        sleeperMaxPFByRoster.set(roster.roster_id, ppts + ppts_decimal / 100);
      }

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
          <h1 className="text-4xl font-bold mb-2">
            Dynasty Draft Board
          </h1>
          <p className="text-muted-foreground">
            Generate draft boards with traded picks from your Sleeper league
          </p>
        </div>

        <Card className="mb-8 glow-sm">
          <CardContent className="pt-6">
            <LeagueInput onSubmit={handleSubmit} isLoading={isLoading} />
          </CardContent>
        </Card>

        {error && (
          <Card className="mb-8 border-destructive bg-destructive/10">
            <CardContent className="pt-6 text-destructive">
              {error}
            </CardContent>
          </Card>
        )}

        {standings && draftBoards && league && (
          <div className="space-y-8">
            {standingsLeague && standingsLeague.league_id !== league.league_id && (
              <Card className="border-primary bg-primary/10">
                <CardContent className="pt-6 text-primary">
                  <strong>Note:</strong> Draft order is based on {standingsLeague.season} season results.
                  Traded picks are from the {league.season} season.
                </CardContent>
              </Card>
            )}

            <Card className="glow-sm">
              <CardContent className="pt-6">
                <DraftBoard boards={draftBoards} leagueName={league.name} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Draft Order & Max PF Comparison
                  {standingsLeague && (
                    <span className="text-base font-normal text-muted-foreground ml-2">
                      ({standingsLeague.season} Season)
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  Calculated Max PF uses {playoffsIncluded ? 'all weeks including playoffs (1-17)' : 'regular season weeks (1-14)'} with optimal
                  lineup placement. Sleeper Max PF is from the API.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MaxPFComparison standings={standings} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
