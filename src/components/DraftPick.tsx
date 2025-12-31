import type { DraftPick as DraftPickType } from '@/lib/types';

interface DraftPickProps {
  pick: DraftPickType;
}

export default function DraftPick({ pick }: DraftPickProps) {
  const pickLabel = `${pick.round}.${pick.pick.toString().padStart(2, '0')}`;

  return (
    <div
      className={`p-2 rounded-lg border text-center min-h-[80px] flex flex-col justify-center transition-all hover:scale-[1.02] ${
        pick.isTraded
          ? 'bg-warning/10 border-warning/40 hover:border-warning/60'
          : 'bg-background-secondary border-border hover:border-text-muted'
      }`}
    >
      <div className="text-xs text-text-muted mb-1">{pickLabel}</div>
      <div className="font-medium text-sm text-text-primary truncate" title={pick.currentOwnerName}>
        {pick.currentOwnerName}
      </div>
      {pick.isTraded && (
        <div className="text-xs text-warning mt-1 truncate" title={`via ${pick.originalOwnerName}`}>
          via {pick.originalOwnerName}
        </div>
      )}
    </div>
  );
}
