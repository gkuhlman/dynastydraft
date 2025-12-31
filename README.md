# Dynasty Draft Board

A Next.js application for generating dynasty fantasy football draft boards from your Sleeper league. Automatically calculates draft order based on standings and Max PF, handles traded picks, and displays a visual draft board.

## Features

- **Two Draft Order Methods:**
  - **Standings** - Draft order based on final standings (worst record picks first)
  - **Standings + Max PF** - Playoff teams (7-12) ordered by finish; Non-playoff teams (1-6) ordered by inverse Max Potential Points

- **Max PF Calculation** - Calculates optimal lineup points for each team respecting roster position constraints (QB, RB, WR, TE, FLEX, SUPERFLEX, etc.)

- **Traded Picks Support** - Automatically fetches and displays traded picks with visual indicators

- **Dynasty League Support** - Automatically detects previous season data for leagues that have rolled over to a new season

- **Sleeper-Inspired Dark Theme** - Clean, modern dark UI with glowing accents

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/gkuhlman/dynastydraft.git
cd dynastydraft

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Finding Your League ID

Your Sleeper league ID can be found in:
- The URL when viewing your league: `https://sleeper.com/leagues/YOUR_LEAGUE_ID`
- League settings in the Sleeper app

## How It Works

### Draft Order Calculation

**Standings Mode:**
- Teams are ordered by wins (ascending), then points for (ascending)
- Worst team picks first

**Standings + Max PF Mode:**
1. Playoff teams (positions 7-12) are ordered by playoff finish (champion picks last)
2. Non-playoff teams (positions 1-6) are ordered by inverse Max PF (lowest Max PF picks first)

### Max Potential Points (Max PF)

Max PF is calculated by finding the optimal lineup each week based on:
- Each player's actual points scored
- Roster position constraints from your league settings
- Proper handling of FLEX, SUPERFLEX, and other multi-position slots

The calculation respects position eligibility:
- QB slots: Only QBs
- RB/WR/TE slots: Only that position
- FLEX: RB, WR, or TE
- SUPERFLEX: QB, RB, WR, or TE

### Dynasty League Support

For dynasty leagues that have rolled over to a new season:
- Enter your **current** league ID (the new season)
- The app automatically fetches standings and matchup data from the **previous** season
- Traded picks are fetched from the current season

## Tech Stack

- [Next.js 14](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Sleeper API](https://docs.sleeper.com/) - Fantasy football data

## API Endpoints Used

- `GET /v1/league/{league_id}` - League info and roster positions
- `GET /v1/league/{league_id}/rosters` - Team standings
- `GET /v1/league/{league_id}/users` - User display names
- `GET /v1/league/{league_id}/matchups/{week}` - Weekly player scores
- `GET /v1/league/{league_id}/traded_picks` - Traded draft picks
- `GET /v1/league/{league_id}/winners_bracket` - Playoff results
- `GET /v1/players/nfl` - Player positions (cached locally)

## License

MIT
