import type { DraftBoard as DraftBoardType } from '@/lib/types';
import DraftPick from './DraftPick';

interface DraftBoardProps {
  boards: DraftBoardType[];
  leagueName: string;
}

export default function DraftBoard({ boards, leagueName }: DraftBoardProps) {
  const board = boards[0];

  if (!board) {
    return <div className="text-center text-text-secondary">No draft board data</div>;
  }

  // Get number of teams from first round picks
  const numTeams = board.picks.filter((p) => p.round === 1).length;

  // Group picks by round
  const picksByRound = new Map<number, typeof board.picks>();
  for (const pick of board.picks) {
    if (!picksByRound.has(pick.round)) {
      picksByRound.set(pick.round, []);
    }
    picksByRound.get(pick.round)!.push(pick);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-primary">{leagueName}</h2>
        <span className="text-lg font-medium text-accent">{board.season} Draft</span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Header row with pick numbers */}
          <div
            className="grid gap-2 mb-2"
            style={{ gridTemplateColumns: `80px repeat(${numTeams}, minmax(100px, 1fr))` }}
          >
            <div className="text-center font-medium text-text-muted">Round</div>
            {Array.from({ length: numTeams }, (_, i) => (
              <div key={i} className="text-center font-medium text-text-muted">
                Pick {i + 1}
              </div>
            ))}
          </div>

          {/* Rounds */}
          {Array.from(picksByRound.entries()).map(([round, picks]) => (
            <div
              key={round}
              className="grid gap-2 mb-2"
              style={{ gridTemplateColumns: `80px repeat(${numTeams}, minmax(100px, 1fr))` }}
            >
              <div className="flex items-center justify-center font-bold text-text-primary bg-background-secondary rounded-lg border border-border">
                Rd {round}
              </div>
              {picks
                .sort((a, b) => a.pick - b.pick)
                .map((pick) => (
                  <DraftPick key={`${pick.round}-${pick.pick}`} pick={pick} />
                ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-6 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-background-secondary border border-border rounded" />
          <span className="text-text-secondary">Original Pick</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-warning/20 border border-warning/50 rounded" />
          <span className="text-text-secondary">Traded Pick</span>
        </div>
      </div>
    </div>
  );
}
