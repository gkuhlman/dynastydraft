'use client';

import { useState, useEffect } from 'react';
import type { DraftOrderMethod } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface LeagueInputProps {
  onSubmit: (
    leagueId: string,
    method: DraftOrderMethod,
    includePlayoffs: boolean
  ) => void;
  isLoading: boolean;
  initialLeagueId?: string;
  initialMethod?: DraftOrderMethod;
  initialIncludePlayoffs?: boolean;
}

export default function LeagueInput({
  onSubmit,
  isLoading,
  initialLeagueId = '',
  initialMethod = 'standings_max_pf',
  initialIncludePlayoffs = false,
}: LeagueInputProps) {
  const [leagueId, setLeagueId] = useState(initialLeagueId);
  const [method, setMethod] = useState<DraftOrderMethod>(initialMethod);
  const [includePlayoffs, setIncludePlayoffs] = useState(initialIncludePlayoffs);

  // Update state when initial values change (e.g., from URL params)
  useEffect(() => {
    if (initialLeagueId) setLeagueId(initialLeagueId);
  }, [initialLeagueId]);

  useEffect(() => {
    setMethod(initialMethod);
  }, [initialMethod]);

  useEffect(() => {
    setIncludePlayoffs(initialIncludePlayoffs);
  }, [initialIncludePlayoffs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (leagueId.trim()) {
      onSubmit(leagueId.trim(), method, includePlayoffs);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto">
      <div className="space-y-2">
        <Label htmlFor="leagueId">Sleeper League ID</Label>
        <Input
          type="text"
          id="leagueId"
          value={leagueId}
          onChange={(e) => setLeagueId(e.target.value)}
          placeholder="Enter your Sleeper league ID"
          disabled={isLoading}
          className="h-12"
        />
        <p className="text-xs text-muted-foreground">
          Find your league ID in the Sleeper app URL or league settings
        </p>
      </div>

      <div className="space-y-3">
        <Label>Draft Order Method</Label>
        <div className="space-y-2">
          <Card
            className={`cursor-pointer transition-all ${
              method === 'standings'
                ? 'border-primary bg-primary/10 glow-sm'
                : 'hover:border-muted-foreground'
            }`}
            onClick={() => !isLoading && setMethod('standings')}
          >
            <CardContent className="flex items-start gap-3 p-4">
              <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                method === 'standings' ? 'border-primary' : 'border-muted-foreground'
              }`}>
                {method === 'standings' && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </div>
              <div>
                <div className="font-medium">Standings</div>
                <div className="text-sm text-muted-foreground">
                  Draft order based on final standings (worst record picks first)
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${
              method === 'standings_max_pf'
                ? 'border-primary bg-primary/10 glow-sm'
                : 'hover:border-muted-foreground'
            }`}
            onClick={() => !isLoading && setMethod('standings_max_pf')}
          >
            <CardContent className="flex items-start gap-3 p-4">
              <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                method === 'standings_max_pf' ? 'border-primary' : 'border-muted-foreground'
              }`}>
                {method === 'standings_max_pf' && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </div>
              <div>
                <div className="font-medium">Standings + Max PF</div>
                <div className="text-sm text-muted-foreground">
                  Playoff teams (7-12) by finish; Non-playoff teams (1-6) by inverse Max PF
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className={`transition-all ${includePlayoffs ? 'border-primary bg-primary/10' : ''}`}>
        <CardContent className="flex items-center justify-between p-4">
          <div className="space-y-0.5">
            <Label htmlFor="include-playoffs" className="cursor-pointer">
              Include Playoffs in Max PF
            </Label>
            <p className="text-sm text-muted-foreground">
              Calculate Max PF using all weeks including playoffs (weeks 15-17)
            </p>
          </div>
          <Switch
            id="include-playoffs"
            checked={includePlayoffs}
            onCheckedChange={setIncludePlayoffs}
            disabled={isLoading}
          />
        </CardContent>
      </Card>

      <Button
        type="submit"
        disabled={isLoading || !leagueId.trim()}
        className="w-full h-12 text-base font-semibold glow-sm hover:glow"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading...
          </>
        ) : (
          'Generate Draft Board'
        )}
      </Button>
    </form>
  );
}
