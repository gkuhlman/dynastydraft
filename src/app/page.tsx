'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LeagueInput from '@/components/LeagueInput';
import DraftBoard from '@/components/DraftBoard';
import MaxPFComparison from '@/components/MaxPFComparison';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Link, Settings2, Radio } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import type {
  DraftOrderMethod,
  League,
  Roster,
  TeamStanding,
  DraftBoard as DraftBoardType,
  SleeperDraft,
  SleeperDraftPick,
  DraftPick,
} from '@/lib/types';
import {
  fetchLeague,
  fetchDraft,
  fetchDraftPicks,
  fetchRosters,
  fetchUsers,
  fetchAllMatchups,
  fetchTradedPicks,
  fetchPlayers,
  fetchWinnersBracket,
} from '@/lib/sleeper-api';
import { calculateAllMaxPF } from '@/lib/max-pf-calculator';
import { calculateDraftOrder, generateDraftBoard, calculateSleeperDraftOrder } from '@/lib/draft-order';

// Calculate poll interval based on pick timer (in seconds)
function calculatePollInterval(pickTimer: number): number {
  // pollInterval = max(5, min(30, pickTimer / 3)) in seconds, return ms
  const intervalSec = Math.max(5, Math.min(30, pickTimer / 3));
  return intervalSec * 1000;
}

// Merge draft picks into the board
function applyDraftPicks(
  board: DraftBoardType,
  draftPicks: SleeperDraftPick[]
): DraftBoardType {
  const pickedByPosition = new Map<string, SleeperDraftPick>();

  for (const pick of draftPicks) {
    const key = `${pick.round}-${pick.draft_slot}`;
    pickedByPosition.set(key, pick);
  }

  // Find the next pick (on the clock)
  const totalPicks = draftPicks.length;
  const numTeams = board.picks.length / board.rounds;
  const nextPickNum = totalPicks + 1;
  const nextRound = Math.ceil(nextPickNum / numTeams);
  const nextSlot = ((nextPickNum - 1) % numTeams) + 1;

  const updatedPicks: DraftPick[] = board.picks.map((pick) => {
    const key = `${pick.round}-${pick.pick}`;
    const draftPick = pickedByPosition.get(key);

    const isOnTheClock = pick.round === nextRound && pick.pick === nextSlot;

    if (draftPick) {
      return {
        ...pick,
        pickedPlayer: {
          name: `${draftPick.metadata.first_name} ${draftPick.metadata.last_name}`,
          position: draftPick.metadata.position,
          team: draftPick.metadata.team,
        },
        isOnTheClock: false,
      };
    }

    return {
      ...pick,
      isOnTheClock,
    };
  });

  return {
    ...board,
    picks: updatedPicks,
  };
}

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
  const [isSharedView, setIsSharedView] = useState(false);
  const [showForm, setShowForm] = useState(true);

  // Live mode state
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [sleeperDraft, setSleeperDraft] = useState<SleeperDraft | null>(null);
  const [baseDraftBoard, setBaseDraftBoard] = useState<DraftBoardType | null>(null);
  const [liveDraftPicks, setLiveDraftPicks] = useState<SleeperDraftPick[]>([]);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Read URL params
  const urlLeagueId = searchParams.get('leagueId') || '';
  const urlMethod = (searchParams.get('method') as DraftOrderMethod) || 'sleeper_draft';
  const urlIncludePlayoffs = searchParams.get('playoffs') === 'true';

  // Determine if this is a shared view on initial load
  useEffect(() => {
    if (urlLeagueId && !hasAutoLoaded) {
      setIsSharedView(true);
      setShowForm(false);
    }
  }, [urlLeagueId, hasAutoLoaded]);

  const handleSubmit = useCallback(async (
    leagueId: string,
    method: DraftOrderMethod,
    includePlayoffs: boolean
  ) => {
    setIsLoading(true);
    setError(null);
    setPlayoffsIncluded(includePlayoffs);

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

      // Validate supported league formats (redraft, keeper, dynasty)
      const supportedTypes = [0, 1, 2]; // 0 = redraft, 1 = keeper, 2 = dynasty
      if (!supportedTypes.includes(currentLeague.settings.type)) {
        throw new Error(
          `Unsupported league type. This tool supports Redraft, Keeper, and Dynasty leagues.`
        );
      }

      // Validate draft status
      const validStatuses = ['pre_draft', 'drafting'];
      if (!validStatuses.includes(currentLeague.status)) {
        if (currentLeague.status === 'complete') {
          throw new Error(
            'This league\'s draft has already been completed. Enter the current season\'s league ID to view the upcoming draft.'
          );
        }
        throw new Error(
          `Unexpected league status: "${currentLeague.status}". Expected a league with an upcoming or in-progress draft.`
        );
      }

      // Validate current season
      const currentYear = new Date().getFullYear();
      const leagueSeason = parseInt(currentLeague.season, 10);
      if (leagueSeason < currentYear) {
        throw new Error(
          `This is a ${currentLeague.season} season league. Please enter the current ${currentYear} season league ID.`
        );
      }

      setLeague(currentLeague);

      // Handle Sleeper Draft Order method differently
      if (method === 'sleeper_draft') {
        const draftId = currentLeague.draft_id;
        if (!draftId) {
          throw new Error('No draft found for this league. The draft may not be set up yet.');
        }

        const [sleeperDraft, rosters, users, tradedPicks] = await Promise.all([
          fetchDraft(draftId),
          fetchRosters(leagueId),
          fetchUsers(leagueId),
          fetchTradedPicks(leagueId),
        ]);

        if (!sleeperDraft.slot_to_roster_id) {
          throw new Error('Draft order has not been set yet in Sleeper.');
        }

        setStandingsLeague(currentLeague);

        const teamStandings = calculateSleeperDraftOrder(sleeperDraft, rosters, users);
        setStandings(teamStandings);

        const draftYear = currentLeague.season;
        const draftRounds = sleeperDraft.settings.rounds || currentLeague.settings.draft_rounds;
        const board = generateDraftBoard(
          teamStandings,
          tradedPicks,
          rosters,
          users,
          draftYear,
          draftRounds
        );

        // Store for live mode
        setSleeperDraft(sleeperDraft);
        setBaseDraftBoard(board);
        setLiveDraftPicks([]);
        setDraftBoards([board]);
      } else {
        // Standings-based methods
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
      }
    } catch (err) {
      console.error('Error fetching league data:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch league data. Please check the league ID and try again.'
      );
      // Show form on error so user can try again
      setShowForm(true);
      setIsSharedView(false);
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

  // Live mode polling
  useEffect(() => {
    if (!isLiveMode || !sleeperDraft || !baseDraftBoard) {
      // Clean up any existing polling
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    const pollInterval = calculatePollInterval(sleeperDraft.settings.pick_timer);

    const pollForPicks = async () => {
      try {
        const picks = await fetchDraftPicks(sleeperDraft.draft_id);
        setLiveDraftPicks(picks);

        // Apply picks to the board
        const updatedBoard = applyDraftPicks(baseDraftBoard, picks);
        setDraftBoards([updatedBoard]);
      } catch (err) {
        console.error('Error polling for draft picks:', err);
      }
    };

    // Poll immediately on enable
    pollForPicks();

    // Set up interval
    pollingRef.current = setInterval(pollForPicks, pollInterval);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isLiveMode, sleeperDraft, baseDraftBoard]);

  // Toggle live mode
  const toggleLiveMode = useCallback(() => {
    if (isLiveMode) {
      // Turning off - reset to base board
      setIsLiveMode(false);
      if (baseDraftBoard) {
        setDraftBoards([baseDraftBoard]);
      }
    } else {
      // Turning on
      setIsLiveMode(true);
    }
  }, [isLiveMode, baseDraftBoard]);

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

  const handleShowForm = () => {
    setShowForm(true);
    setIsSharedView(false);
  };

  // Shared view - draft board front and center
  if (isSharedView && !showForm && (draftBoards || isLoading)) {
    return (
      <main className="min-h-screen py-6 px-4 football-field-bg">
        <div className="max-w-[1600px] mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground text-lg">Loading draft board...</p>
            </div>
          ) : error ? (
            <Card className="border-destructive bg-destructive/10">
              <CardContent className="pt-6 text-destructive text-center">
                <p className="mb-4">{error}</p>
                <Button onClick={handleShowForm} variant="outline">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : standings && draftBoards && league && (
            <div className="space-y-6">
              {/* Header with share and settings buttons */}
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-muted-foreground">Draft Board</h1>
                <div className="flex gap-2">
                  {sleeperDraft && (
                    <Button
                      variant={isLiveMode ? 'default' : 'outline'}
                      size="sm"
                      onClick={toggleLiveMode}
                      className={`gap-2 ${isLiveMode ? 'bg-red-600 hover:bg-red-700' : ''}`}
                    >
                      <Radio className={`h-4 w-4 ${isLiveMode ? 'animate-pulse' : ''}`} />
                      {isLiveMode ? 'Live' : 'Go Live'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShowForm}
                    className="gap-2"
                  >
                    <Settings2 className="h-4 w-4" />
                    Settings
                  </Button>
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
                        Share
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {isLiveMode && sleeperDraft && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  Live Mode: {liveDraftPicks.length} picks made • Polling every {Math.round(calculatePollInterval(sleeperDraft.settings.pick_timer) / 1000)}s
                </div>
              )}

              {standingsLeague && standingsLeague.league_id !== league.league_id && (
                <div className="text-sm text-primary bg-primary/10 border border-primary/30 rounded-lg px-4 py-2">
                  Draft order based on {standingsLeague.season} season. Traded picks from {league.season}.
                </div>
              )}

              {/* Main draft board - large and prominent */}
              <Card className="glow">
                <CardContent className="pt-8 pb-8 px-6">
                  <DraftBoard boards={draftBoards} leagueName={league.name} large />
                </CardContent>
              </Card>

              {/* Collapsible Max PF section - only for dynasty/keeper leagues */}
              {league.settings.type !== 0 && (
                <details className="group">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors list-none flex items-center gap-2">
                    <span className="text-sm">View Draft Order Details</span>
                    <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <Card className="mt-4">
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
                </details>
              )}
            </div>
          )}
        </div>
      </main>
    );
  }

  // Regular view with form
  return (
    <main className="min-h-screen py-8 px-4 football-field-bg">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Sleeper Draft Board
          </h1>
          <p className="text-muted-foreground">
            Generate draft boards with traded picks for your Sleeper league
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
                <div className="flex gap-2">
                  {sleeperDraft && (
                    <Button
                      variant={isLiveMode ? 'default' : 'outline'}
                      size="sm"
                      onClick={toggleLiveMode}
                      className={`gap-2 ${isLiveMode ? 'bg-red-600 hover:bg-red-700' : ''}`}
                    >
                      <Radio className={`h-4 w-4 ${isLiveMode ? 'animate-pulse' : ''}`} />
                      {isLiveMode ? 'Live' : 'Go Live'}
                    </Button>
                  )}
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
                </div>
              </CardHeader>
              <CardContent>
                <DraftBoard boards={draftBoards} leagueName={league.name} />
              </CardContent>
            </Card>

            {/* Max PF section - only for dynasty/keeper leagues */}
            {league.settings.type !== 0 && (
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
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function LoadingFallback() {
  return (
    <main className="min-h-screen py-8 px-4 football-field-bg">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center py-24">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-lg">Loading...</p>
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
