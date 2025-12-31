import type { DraftBoard as DraftBoardType } from '@/lib/types';
import DraftPick from './DraftPick';
import { Badge } from '@/components/ui/badge';

interface DraftBoardProps {
  boards: DraftBoardType[];
  leagueName: string;
  large?: boolean;
}

export default function DraftBoard({ boards, leagueName, large = false }: DraftBoardProps) {
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

  const minColWidth = large ? '120px' : '100px';
  const roundColWidth = large ? '100px' : '80px';
  const gap = large ? 'gap-3' : 'gap-2';
  const mb = large ? 'mb-3' : 'mb-2';

  return (
    <div className={large ? 'space-y-8' : 'space-y-6'}>
      <div className="flex items-center justify-between">
        <h2 className={`font-bold ${large ? 'text-3xl' : 'text-2xl'}`}>{leagueName}</h2>
        <Badge
          variant="outline"
          className={`text-primary border-primary ${large ? 'text-lg px-4 py-2' : 'text-base px-3 py-1'}`}
        >
          {board.season} Draft
        </Badge>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Header row */}
          <div
            className={`grid ${gap} ${mb}`}
            style={{ gridTemplateColumns: `${roundColWidth} repeat(${numTeams}, minmax(${minColWidth}, 1fr))` }}
          >
            <div className={`text-center font-medium text-muted-foreground ${large ? 'text-base' : 'text-sm'}`}>
              Round
            </div>
            {Array.from({ length: numTeams }, (_, i) => (
              <div key={i} className={`text-center font-medium text-muted-foreground ${large ? 'text-base' : 'text-sm'}`}>
                Pick {i + 1}
              </div>
            ))}
          </div>

          {/* Rounds */}
          {Array.from(picksByRound.entries()).map(([round, picks]) => (
            <div
              key={round}
              className={`grid ${gap} ${mb}`}
              style={{ gridTemplateColumns: `${roundColWidth} repeat(${numTeams}, minmax(${minColWidth}, 1fr))` }}
            >
              <div className={`flex items-center justify-center font-bold bg-secondary rounded-lg border ${large ? 'text-lg' : ''}`}>
                Rd {round}
              </div>
              {picks
                .sort((a, b) => a.pick - b.pick)
                .map((pick) => (
                  <DraftPick key={`${pick.round}-${pick.pick}`} pick={pick} large={large} />
                ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className={`flex gap-6 justify-center ${large ? 'text-base' : 'text-sm'}`}>
        <div className="flex items-center gap-2">
          <div className={`bg-secondary border rounded ${large ? 'w-5 h-5' : 'w-4 h-4'}`} />
          <span className="text-muted-foreground">Original Pick</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`bg-yellow-500/20 border border-yellow-500/50 rounded ${large ? 'w-5 h-5' : 'w-4 h-4'}`} />
          <span className="text-muted-foreground">Traded Pick</span>
        </div>
      </div>
    </div>
  );
}
