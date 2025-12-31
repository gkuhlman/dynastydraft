import type { DraftBoard as DraftBoardType } from '@/lib/types';
import DraftPick from './DraftPick';
import { Badge } from '@/components/ui/badge';

interface DraftBoardProps {
  boards: DraftBoardType[];
  leagueName: string;
}

export default function DraftBoard({ boards, leagueName }: DraftBoardProps) {
  const board = boards[0];

  if (!board) {
    return <div className="text-center text-muted-foreground">No draft board data</div>;
  }

  const numTeams = board.picks.filter((p) => p.round === 1).length;

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
        <h2 className="text-2xl font-bold">{leagueName}</h2>
        <Badge variant="outline" className="text-primary border-primary text-base px-3 py-1">
          {board.season} Draft
        </Badge>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Header row */}
          <div
            className="grid gap-2 mb-2"
            style={{ gridTemplateColumns: `80px repeat(${numTeams}, minmax(100px, 1fr))` }}
          >
            <div className="text-center font-medium text-muted-foreground text-sm">Round</div>
            {Array.from({ length: numTeams }, (_, i) => (
              <div key={i} className="text-center font-medium text-muted-foreground text-sm">
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
              <div className="flex items-center justify-center font-bold bg-secondary rounded-lg border">
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
          <div className="w-4 h-4 bg-secondary border rounded" />
          <span className="text-muted-foreground">Original Pick</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500/20 border border-yellow-500/50 rounded" />
          <span className="text-muted-foreground">Traded Pick</span>
        </div>
      </div>
    </div>
  );
}
