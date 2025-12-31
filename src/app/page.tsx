'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LeagueInput from '@/components/LeagueInput';
import DraftBoard from '@/components/DraftBoard';
import MaxPFComparison from '@/components/MaxPFComparison';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Link } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import type {
  DraftOrderMethod,
  League,
  Roster,
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

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [standingsLeague, setStandingsLeague] = useState<League | null>(null);
  const [standings, setStandings] = useState<TeamStanding[] | null>(null);
  const [draftBoards, setDraftBoards] = useState<DraftBoardType[] | null>(null);
  const [playoffsIncluded, setPlayoffsIncluded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);

  // Current settings for sharing
  const [currentSettings, setCurrentSettings] = useState<{
    leagueId: string;
    method: DraftOrderMethod;
    includePlayoffs: boolean;
  } | null>(null);

  // Read URL params
  const urlLeagueId = searchParams.get('leagueId') || '';
  const urlMethod = (searchParams.get('method') as DraftOrderMethod) || 'standings_max_pf';
  const urlIncludePlayoffs = searchParams.get('playoffs') === 'true';

  const handleSubmit = useCallback(async (
    leagueId: string,
    method: DraftOrderMethod,
    includePlayoffs: boolean
  ) => {
    setIsLoading(true);
    setError(null);
    setPlayoffsIncluded(includePlayoffs);
    setCurrentSettings({ leagueId, method, includePlayoffs });

    // Update URL with current settings
    const params = new URLSearchParams();
    params.set('leagueId', leagueId);
    params.set('method', method);
    if (includePlayoffs) {
      params.set('playoffs', 'true');
    }
    router.replace(`?${params.toString()}`, { scroll: false });

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
  }, [router]);

  // Auto-load if URL has league ID (only once)
  useEffect(() => {
    if (urlLeagueId && !hasAutoLoaded && !isLoading) {
      setHasAutoLoaded(true);
      handleSubmit(urlLeagueId, urlMethod, urlIncludePlayoffs);
    }
  }, [urlLeagueId, urlMethod, urlIncludePlayoffs, hasAutoLoaded, isLoading, handleSubmit]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
            <LeagueInput
              onSubmit={handleSubmit}
              isLoading={isLoading}
              initialLeagueId={urlLeagueId}
              initialMethod={urlMethod}
              initialIncludePlayoffs={urlIncludePlayoffs}
            />
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
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Link className="h-4 w-4" />
                      Share Draft
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardContent>
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

function LoadingFallback() {
  return (
    <main className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Dynasty Draft Board</h1>
          <p className="text-muted-foreground">
            Generate draft boards with traded picks from your Sleeper league
          </p>
        </div>
        <Card className="mb-8 glow-sm">
          <CardContent className="pt-6 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HomeContent />
    </Suspense>
  );
}
