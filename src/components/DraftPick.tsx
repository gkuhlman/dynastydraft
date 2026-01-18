/* eslint-disable @next/next/no-img-element */
import type { DraftPick as DraftPickType } from '@/lib/types';

interface DraftPickProps {
  pick: DraftPickType;
  large?: boolean;
}

function Avatar({ src, name, size }: { src?: string | null; name: string; size: 'sm' | 'lg' }) {
  const sizeClasses = size === 'lg' ? 'w-8 h-8 lg:w-10 lg:h-10' : 'w-6 h-6 lg:w-8 lg:h-8';
  const textSize = size === 'lg' ? 'text-xs lg:text-sm' : 'text-[10px] lg:text-xs';

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClasses} rounded-full object-cover`}
      />
    );
  }

  // Fallback: first letter of name
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className={`${sizeClasses} rounded-full bg-muted flex items-center justify-center ${textSize} font-medium text-muted-foreground`}>
      {initial}
    </div>
  );
}

// Position colors for NFL positions
const positionColors: Record<string, string> = {
  QB: 'text-red-400',
  RB: 'text-green-400',
  WR: 'text-blue-400',
  TE: 'text-yellow-400',
  K: 'text-purple-400',
  DEF: 'text-orange-400',
};

export default function DraftPick({ pick, large = false }: DraftPickProps) {
  const pickLabel = `${pick.round}.${pick.pick.toString().padStart(2, '0')}`;
  const isPicked = !!pick.pickedPlayer;
  const isOnTheClock = pick.isOnTheClock;

  // Determine card styling based on state
  const getCardClasses = () => {
    const baseClasses = `rounded-lg border text-center flex flex-col items-center justify-center transition-all h-full ${
      large ? 'p-1.5 lg:p-3 min-h-[70px] lg:min-h-[100px]' : 'p-1 lg:p-2 min-h-[60px] lg:min-h-[80px]'
    }`;

    if (isOnTheClock) {
      return `${baseClasses} bg-primary/20 border-primary border-2 animate-pulse`;
    }

    if (isPicked) {
      return `${baseClasses} bg-muted/50 border-border/50 opacity-80`;
    }

    if (pick.isTraded) {
      return `${baseClasses} bg-yellow-500/10 border-yellow-500/40 hover:border-yellow-500/60 hover:scale-[1.02]`;
    }

    return `${baseClasses} bg-secondary border-border hover:border-muted-foreground hover:scale-[1.02]`;
  };

  // If pick has been made, show player info
  if (isPicked && pick.pickedPlayer) {
    const { name, position, team } = pick.pickedPlayer;
    const positionColor = positionColors[position] || 'text-muted-foreground';

    return (
      <div className={getCardClasses()} title={`${name} - ${pick.currentOwnerName}`}>
        <div className={`text-muted-foreground mb-0.5 ${large ? 'text-[10px] lg:text-xs' : 'text-[9px] lg:text-[10px]'}`}>
          {pickLabel}
        </div>
        <div className={`font-bold ${positionColor} ${large ? 'text-[10px] lg:text-sm' : 'text-[9px] lg:text-xs'}`}>
          {position}
        </div>
        <div className={`font-medium truncate w-full leading-tight ${large ? 'text-xs lg:text-sm' : 'text-[10px] lg:text-xs'}`}>
          {name}
        </div>
        {team && (
          <div className={`text-muted-foreground ${large ? 'text-[9px] lg:text-xs' : 'text-[8px] lg:text-[10px]'}`}>
            {team}
          </div>
        )}
      </div>
    );
  }

  // If on the clock, show prominently
  if (isOnTheClock) {
    return (
      <div className={getCardClasses()} title={pick.currentOwnerName}>
        <div className={`text-primary font-bold mb-1 ${large ? 'text-[10px] lg:text-sm' : 'text-[10px] lg:text-xs'}`}>
          {pickLabel}
        </div>
        <Avatar
          src={pick.currentOwnerAvatar}
          name={pick.currentOwnerName}
          size={large ? 'lg' : 'sm'}
        />
        <div className={`text-primary font-semibold mt-1 ${large ? 'text-[9px] lg:text-xs' : 'text-[8px] lg:text-[10px]'}`}>
          ON THE CLOCK
        </div>
      </div>
    );
  }

  // Default: show owner avatar
  return (
    <div className={getCardClasses()} title={pick.currentOwnerName}>
      <div className={`text-muted-foreground mb-1 ${large ? 'text-[10px] lg:text-sm' : 'text-[10px] lg:text-xs'}`}>
        {pickLabel}
      </div>
      <Avatar
        src={pick.currentOwnerAvatar}
        name={pick.currentOwnerName}
        size={large ? 'lg' : 'sm'}
      />
      {pick.isTraded && (
        <div
          className={`text-yellow-500 mt-1 flex items-center gap-1 ${large ? 'text-[9px] lg:text-xs' : 'text-[8px] lg:text-[10px]'}`}
          title={`via ${pick.originalOwnerName}`}
        >
          <span>via</span>
          <Avatar
            src={pick.originalOwnerAvatar}
            name={pick.originalOwnerName}
            size="sm"
          />
        </div>
      )}
    </div>
  );
}
