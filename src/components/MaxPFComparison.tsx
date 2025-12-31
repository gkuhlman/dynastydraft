import type { TeamStanding } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface MaxPFComparisonProps {
  standings: TeamStanding[];
}

export default function MaxPFComparison({ standings }: MaxPFComparisonProps) {
  // Sort by draft position
  const sortedStandings = [...standings].sort(
    (a, b) => (a.draftPosition || 0) - (b.draftPosition || 0)
  );

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-secondary hover:bg-secondary">
          <TableHead className="text-center">Draft Pos</TableHead>
          <TableHead>Team</TableHead>
          <TableHead className="text-center">Record</TableHead>
          <TableHead className="text-right">Points For</TableHead>
          <TableHead className="text-right">Calc Max PF</TableHead>
          <TableHead className="text-right">Sleeper Max PF</TableHead>
          <TableHead className="text-right">Difference</TableHead>
          <TableHead className="text-center">Playoff Finish</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedStandings.map((team) => {
          const diff = team.maxPF - team.sleeperMaxPF;
          const diffColor =
            Math.abs(diff) < 1
              ? 'text-muted-foreground'
              : diff > 0
              ? 'text-green-400'
              : 'text-red-400';

          return (
            <TableRow key={team.rosterId}>
              <TableCell className="text-center font-bold text-primary">
                {team.draftPosition}
              </TableCell>
              <TableCell>
                <div className="font-medium">{team.displayName}</div>
                {team.teamName && (
                  <div className="text-xs text-muted-foreground">{team.teamName}</div>
                )}
              </TableCell>
              <TableCell className="text-center">
                {team.wins}-{team.losses}
                {team.ties > 0 && `-${team.ties}`}
              </TableCell>
              <TableCell className="text-right">
                {team.pointsFor.toFixed(2)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {team.maxPF.toFixed(2)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {team.sleeperMaxPF.toFixed(2)}
              </TableCell>
              <TableCell className={`text-right ${diffColor}`}>
                {diff > 0 ? '+' : ''}
                {diff.toFixed(2)}
              </TableCell>
              <TableCell className="text-center">
                {team.playoffFinish ? (
                  <Badge
                    variant={team.playoffFinish === 1 ? 'default' : 'outline'}
                    className={
                      team.playoffFinish === 1
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30'
                        : team.playoffFinish === 2
                        ? 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                        : 'border-primary text-primary'
                    }
                  >
                    {team.playoffFinish === 1
                      ? 'Champion'
                      : team.playoffFinish === 2
                      ? 'Runner-up'
                      : `${team.playoffFinish}${getOrdinalSuffix(team.playoffFinish)}`}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
