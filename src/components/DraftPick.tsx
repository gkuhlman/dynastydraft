import type { DraftPick as DraftPickType } from '@/lib/types';

interface DraftPickProps {
  pick: DraftPickType;
  large?: boolean;
}

export default function DraftPick({ pick, large = false }: DraftPickProps) {
  const pickLabel = `${pick.round}.${pick.pick.toString().padStart(2, '0')}`;

  return (
    <div
      className={`rounded-lg border text-center flex flex-col justify-center transition-all hover:scale-[1.02] h-full ${
        large ? 'p-1.5 lg:p-3 min-h-[60px] lg:min-h-[90px]' : 'p-1 lg:p-2 min-h-[50px] lg:min-h-[70px]'
      } ${
        pick.isTraded
          ? 'bg-yellow-500/10 border-yellow-500/40 hover:border-yellow-500/60'
          : 'bg-secondary border-border hover:border-muted-foreground'
      }`}
    >
      <div className={`text-muted-foreground mb-0.5 ${large ? 'text-[10px] lg:text-sm' : 'text-[10px] lg:text-xs'}`}>
        {pickLabel}
      </div>
      <div
        className={`font-medium truncate leading-tight ${large ? 'text-xs lg:text-base' : 'text-[11px] lg:text-sm'}`}
        title={pick.currentOwnerName}
      >
        {pick.currentOwnerName}
      </div>
      {pick.isTraded && (
        <div
          className={`text-yellow-500 mt-0.5 truncate leading-tight ${large ? 'text-[9px] lg:text-sm' : 'text-[9px] lg:text-xs'}`}
          title={`via ${pick.originalOwnerName}`}
        >
          via {pick.originalOwnerName}
        </div>
      )}
    </div>
  );
}
