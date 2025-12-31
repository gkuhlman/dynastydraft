import type { DraftPick as DraftPickType } from '@/lib/types';

interface DraftPickProps {
  pick: DraftPickType;
  large?: boolean;
}

export default function DraftPick({ pick, large = false }: DraftPickProps) {
  const pickLabel = `${pick.round}.${pick.pick.toString().padStart(2, '0')}`;

  return (
    <div
      className={`rounded-lg border text-center flex flex-col justify-center transition-all hover:scale-[1.02] ${
        large ? 'p-3 min-h-[100px]' : 'p-2 min-h-[80px]'
      } ${
        pick.isTraded
          ? 'bg-yellow-500/10 border-yellow-500/40 hover:border-yellow-500/60'
          : 'bg-secondary border-border hover:border-muted-foreground'
      }`}
    >
      <div className={`text-muted-foreground mb-1 ${large ? 'text-sm' : 'text-xs'}`}>
        {pickLabel}
      </div>
      <div
        className={`font-medium truncate ${large ? 'text-base' : 'text-sm'}`}
        title={pick.currentOwnerName}
      >
        {pick.currentOwnerName}
      </div>
      {pick.isTraded && (
        <div
          className={`text-yellow-500 mt-1 truncate ${large ? 'text-sm' : 'text-xs'}`}
          title={`via ${pick.originalOwnerName}`}
        >
          via {pick.originalOwnerName}
        </div>
      )}
    </div>
  );
}
