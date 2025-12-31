import type { TeamStanding } from '@/lib/types';

interface MaxPFComparisonProps {
  standings: TeamStanding[];
}

export default function MaxPFComparison({ standings }: MaxPFComparisonProps) {
  // Sort by draft position
  const sortedStandings = [...standings].sort(
    (a, b) => (a.draftPosition || 0) - (b.draftPosition || 0)
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-background-secondary border-b border-border">
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              Draft Pos
            </th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              Team
            </th>
            <th className="px-4 py-3 text-center font-medium text-text-secondary">
              Record
            </th>
            <th className="px-4 py-3 text-right font-medium text-text-secondary">
              Points For
            </th>
            <th className="px-4 py-3 text-right font-medium text-text-secondary">
              Calc Max PF
            </th>
            <th className="px-4 py-3 text-right font-medium text-text-secondary">
              Sleeper Max PF
            </th>
            <th className="px-4 py-3 text-right font-medium text-text-secondary">
              Difference
            </th>
            <th className="px-4 py-3 text-center font-medium text-text-secondary">
              Playoff Finish
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedStandings.map((team) => {
            const diff = team.maxPF - team.sleeperMaxPF;
            const diffColor =
              Math.abs(diff) < 1
                ? 'text-text-muted'
                : diff > 0
                ? 'text-green-400'
                : 'text-red-400';

            return (
              <tr
                key={team.rosterId}
                className="border-b border-border hover:bg-card-hover transition-colors"
              >
                <td className="px-4 py-3 text-center font-bold text-accent">
                  {team.draftPosition}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-text-primary">{team.displayName}</div>
                  {team.teamName && (
                    <div className="text-xs text-text-muted">{team.teamName}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-text-primary">
                  {team.wins}-{team.losses}
                  {team.ties > 0 && `-${team.ties}`}
                </td>
                <td className="px-4 py-3 text-right text-text-primary">
                  {team.pointsFor.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-text-primary">
                  {team.maxPF.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-text-secondary">
                  {team.sleeperMaxPF.toFixed(2)}
                </td>
                <td className={`px-4 py-3 text-right ${diffColor}`}>
                  {diff > 0 ? '+' : ''}
                  {diff.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center">
                  {team.playoffFinish ? (
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        team.playoffFinish === 1
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          : team.playoffFinish === 2
                          ? 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                          : 'bg-accent/20 text-accent border border-accent/30'
                      }`}
                    >
                      {team.playoffFinish === 1
                        ? 'Champion'
                        : team.playoffFinish === 2
                        ? 'Runner-up'
                        : `${team.playoffFinish}${getOrdinalSuffix(team.playoffFinish)}`}
                    </span>
                  ) : (
                    <span className="text-text-muted">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
