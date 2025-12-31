'use client';

import { useState } from 'react';
import type { DraftOrderMethod } from '@/lib/types';

interface LeagueInputProps {
  onSubmit: (
    leagueId: string,
    method: DraftOrderMethod,
    includePlayoffs: boolean
  ) => void;
  isLoading: boolean;
}

export default function LeagueInput({ onSubmit, isLoading }: LeagueInputProps) {
  const [leagueId, setLeagueId] = useState('');
  const [method, setMethod] = useState<DraftOrderMethod>('standings_max_pf');
  const [includePlayoffs, setIncludePlayoffs] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (leagueId.trim()) {
      onSubmit(leagueId.trim(), method, includePlayoffs);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto">
      <div>
        <label
          htmlFor="leagueId"
          className="block text-sm font-medium text-text-primary mb-2"
        >
          Sleeper League ID
        </label>
        <input
          type="text"
          id="leagueId"
          value={leagueId}
          onChange={(e) => setLeagueId(e.target.value)}
          placeholder="Enter your Sleeper league ID"
          className="w-full px-4 py-3 bg-background-secondary border border-border rounded-lg text-text-primary placeholder-text-muted focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
          disabled={isLoading}
        />
        <p className="mt-1 text-xs text-text-muted">
          Find your league ID in the Sleeper app URL or league settings
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Draft Order Method
        </label>
        <div className="space-y-2">
          <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
            method === 'standings'
              ? 'bg-accent/10 border-accent/50'
              : 'bg-background-secondary border-border hover:border-text-muted'
          }`}>
            <input
              type="radio"
              name="method"
              value="standings"
              checked={method === 'standings'}
              onChange={() => setMethod('standings')}
              className="mt-1 accent-accent"
              disabled={isLoading}
            />
            <div>
              <div className="font-medium text-text-primary">Standings</div>
              <div className="text-sm text-text-secondary">
                Draft order based on final standings (worst record picks first)
              </div>
            </div>
          </label>

          <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
            method === 'standings_max_pf'
              ? 'bg-accent/10 border-accent/50'
              : 'bg-background-secondary border-border hover:border-text-muted'
          }`}>
            <input
              type="radio"
              name="method"
              value="standings_max_pf"
              checked={method === 'standings_max_pf'}
              onChange={() => setMethod('standings_max_pf')}
              className="mt-1 accent-accent"
              disabled={isLoading}
            />
            <div>
              <div className="font-medium text-text-primary">Standings + Max PF</div>
              <div className="text-sm text-text-secondary">
                Playoff teams (7-12) by finish; Non-playoff teams (1-6) by
                inverse Max PF
              </div>
            </div>
          </label>
        </div>
      </div>

      <div>
        <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
          includePlayoffs
            ? 'bg-accent/10 border-accent/50'
            : 'bg-background-secondary border-border hover:border-text-muted'
        }`}>
          <input
            type="checkbox"
            checked={includePlayoffs}
            onChange={(e) => setIncludePlayoffs(e.target.checked)}
            className="w-4 h-4 accent-accent rounded"
            disabled={isLoading}
          />
          <div>
            <div className="font-medium text-text-primary">Include Playoffs in Max PF</div>
            <div className="text-sm text-text-secondary">
              Calculate Max PF using all weeks including playoffs (weeks 15-17)
            </div>
          </div>
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading || !leagueId.trim()}
        className="w-full py-3 px-4 bg-accent text-background font-semibold rounded-lg hover:bg-accent/90 disabled:bg-text-muted disabled:text-background-secondary disabled:cursor-not-allowed transition-all shadow-glow-sm hover:shadow-glow"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </span>
        ) : (
          'Generate Draft Board'
        )}
      </button>
    </form>
  );
}
