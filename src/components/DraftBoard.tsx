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

  const gap = large ? 'gap-2 lg:gap-3' : 'gap-1.5 lg:gap-2';

  return (
    <div className={large ? 'space-y-6 lg:space-y-8' : 'space-y-4 lg:space-y-6'}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className={`font-bold ${large ? 'text-2xl lg:text-3xl' : 'text-xl lg:text-2xl'}`}>{leagueName}</h2>
        <Badge
          variant="outline"
          className={`text-primary border-primary ${large ? 'text-sm lg:text-lg px-3 py-1 lg:px-4 lg:py-2' : 'text-sm px-3 py-1'}`}
        >
          {board.season} Draft
        </Badge>
      </div>

      {/* Scroll container for mobile */}
      <div className="overflow-x-auto -mx-2 px-2 pb-2 scrollbar-thin">
        <div
          className={`grid ${gap}`}
          style={{
            gridTemplateColumns: `minmax(50px, 70px) repeat(${numTeams}, minmax(70px, 1fr))`,
            minWidth: `${numTeams * 90 + 80}px`
          }}
        >
          {/* Header row */}
          <div className="text-center font-medium text-muted-foreground text-xs lg:text-sm p-1">
            Round
          </div>
          {Array.from({ length: numTeams }, (_, i) => (
            <div key={i} className="text-center font-medium text-muted-foreground text-xs lg:text-sm p-1">
              <span className="hidden sm:inline">Pick </span>{i + 1}
            </div>
          ))}

          {/* Rounds */}
          {Array.from(picksByRound.entries()).flatMap(([round, picks]) => [
            <div key={`round-${round}`} className="flex items-center justify-center font-bold bg-secondary rounded-lg border text-sm lg:text-base">
              <span className="hidden sm:inline">Rd </span>
              <span className="sm:hidden">R</span>
              {round}
            </div>,
            ...picks
              .sort((a, b) => a.pick - b.pick)
              .map((pick) => (
                <DraftPick key={`${pick.round}-${pick.pick}`} pick={pick} large={large} />
              ))
          ])}
        </div>
      </div>

      {/* Legend */}
      <div className={`flex gap-4 lg:gap-6 justify-center ${large ? 'text-sm lg:text-base' : 'text-xs lg:text-sm'}`}>
        <div className="flex items-center gap-1.5 lg:gap-2">
          <div className="w-3 h-3 lg:w-4 lg:h-4 bg-secondary border rounded" />
          <span className="text-muted-foreground">Original</span>
        </div>
        <div className="flex items-center gap-1.5 lg:gap-2">
          <div className="w-3 h-3 lg:w-4 lg:h-4 bg-yellow-500/20 border border-yellow-500/50 rounded" />
          <span className="text-muted-foreground">Traded</span>
        </div>
      </div>
    </div>
  );
}
