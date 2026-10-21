# CricLive Backend (Spring Boot 3.3.2)

A scalable, real-time cricket score management and simulation engine built with Java 17+, Spring Boot, and STOMP WebSockets.

## Architecture & Package Structure
```
backend/
├── src/main/java/com/cricket/
│   ├── controller/
│   │   └── MatchController.java        # REST API endpoints
│   ├── service/
│   │   └── MatchService.java           # Simulation engine & match state manager
│   ├── model/
│   │   ├── Match.java                  # Main match entity with status & teams
│   │   ├── Innings.java                # Innings progression, totals, FOW
│   │   ├── Player.java                 # Batting & bowling statistics
│   │   └── BallEvent.java              # Individual delivery outcome model
│   ├── config/
│   │   ├── WebSocketConfig.java        # STOMP broker & message transport configuration
│   │   └── WebConfig.java              # CORS configuration for frontend
│   └── CricketSimulatorApplication.java # Spring Boot main class
├── src/main/resources/
│   ├── application.properties          # Server port (8080) & config
│   └── static/                         # Built-in static assets
├── pom.xml                             # Maven dependencies
└── mvnw.cmd                            # Maven wrapper
```

## REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/matches` | Get all matches (live & completed) |
| `GET` | `/api/matches/live` | Get only currently active matches |
| `GET` | `/api/matches/completed` | Get all completed matches |
| `GET` | `/api/matches/{id}` | Get complete details for a single match |
| `GET` | `/api/matches/{id}/summary` | Get official match summary & top performers |
| `GET` | `/api/matches/{id}/players?team={name}` | Get player statistics for a team |
| `GET` | `/api/matches/leaderboard` | Get tournament leaderboard (Orange & Purple cap) |
| `POST` | `/api/matches` | Create a new match (`team1`, `team2`, `matchType`, `venue`) |
| `POST` | `/api/matches/{id}/ball` | Trigger a single ball delivery immediately |
| `POST` | `/api/matches/{id}/over` | Simulate 1 full over (6 legal balls) immediately |
| `POST` | `/api/matches/{id}/toggle-pause` | Pause or resume live match auto-simulation |
| `POST` | `/api/matches/reset` | Reset all demo matches to fresh state |
| `DELETE` | `/api/matches/{id}` | Delete a match |

## WebSocket Topics (STOMP Broker)

- `/topic/matches`: Broadcasts updated match summaries whenever scores change.
- `/topic/match/{matchId}`: Pushes detailed updates for a specific match.
- `/topic/ball/{matchId}`: Pushes ball-by-ball commentary and events in real time.

## Running the Backend

From the `backend` folder:
```powershell
.\mvnw.cmd spring-boot:run
```
Or with installed Maven:
```powershell
mvn spring-boot:run
```
Server runs on: `http://localhost:8080`
