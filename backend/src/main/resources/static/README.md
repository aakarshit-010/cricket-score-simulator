# CricLive Frontend

A clean, responsive, real-time cricket scoring dashboard designed with a modern **White Mode (Light Theme)** by default, along with an optional Dark Mode toggle.

## Directory Structure
```
frontend/
├── index.html        # Main dashboard HTML
├── css/
│   └── styles.css    # Modern White Mode design tokens, layout & responsive styles
├── js/
│   ├── api.js        # REST & WebSocket STOMP service client
│   └── app.js        # Application controller, live match center & tab renderers
└── README.md
```

## Features Displayed
1. **Live Matches Ticker Strip**: Real-time scores and status across all concurrent matches.
2. **Hero Live Scorecard**:
   - Big scoreboard with team flags, live scores, and overs.
   - Run rate telemetry: Current Run Rate (CRR), Required Run Rate (RRR), Target & runs needed.
   - Toss results and match status badges.
3. **Live Batter & Bowler Widgets**:
   - Striker (marked with `*`) and Non-striker with Runs, Balls, 4s, 6s, and Strike Rate.
   - Active Bowler with Overs, Maidens, Runs conceded, Wickets, and Economy.
   - Current Over ball-by-ball chip display (`0`, `1`, `4`, `6`, `W`, `WD`).
   - Current Partnership calculator.
4. **Interactive Simulation Controls**:
   - **⚡ Next Ball**: Trigger a single delivery on demand.
   - **⏩ Next Over**: Complete the current 6-ball over instantly.
   - **⏸️ Pause / ▶️ Resume**: Control auto-simulation pace.
   - **🔄 Reset**: Re-initialize demo matches.
5. **Comprehensive Tabs**:
   - ⚡ **Live Center**: Hero match display, active batters, active bowler, current over, live commentary feed.
   - 📊 **Full Scorecard**: Both Innings Batting table (player, dismissal, runs, balls, 4s, 6s, strike rate), Extras breakdown, Total, Yet to bat, Bowling table (bowler, overs, maidens, runs, wickets, economy), Fall of Wickets.
   - 🎙️ **Ball-by-Ball Commentary**: Every ball with batsman, bowler, outcome, and run description.
   - 👥 **Playing XI & Squads**: Full squad of 11 for Team 1 and Team 2 with player role badges.
   - 📋 **Match Summary & Analysis**: Detailed summary with top performers, match result, and stats breakdown.
   - 🏆 **Tournament Leaderboard**: Top run scorers (Orange Cap) & top wicket takers (Purple Cap) across all matches.
6. **Create Match Form**: Set up a custom match between India, Australia, England, South Africa in T20 or ODI formats.
