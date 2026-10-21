package com.cricket.service;

import com.cricket.model.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class MatchService {

    private final SimpMessagingTemplate messagingTemplate;
    private final Map<String, Match> matches = new ConcurrentHashMap<>();
    private final Random random = new Random();

    // Real cricket team rosters
    private static final String[][] INDIA_PLAYERS = {
        {"IND1", "Rohit Sharma", "BATSMAN"},
        {"IND2", "Shubman Gill", "BATSMAN"},
        {"IND3", "Virat Kohli", "BATSMAN"},
        {"IND4", "KL Rahul", "WICKET_KEEPER"},
        {"IND5", "Suryakumar Yadav", "BATSMAN"},
        {"IND6", "Hardik Pandya", "ALL_ROUNDER"},
        {"IND7", "Ravindra Jadeja", "ALL_ROUNDER"},
        {"IND8", "Axar Patel", "ALL_ROUNDER"},
        {"IND9", "Jasprit Bumrah", "BOWLER"},
        {"IND10", "Mohammed Siraj", "BOWLER"},
        {"IND11", "Kuldeep Yadav", "BOWLER"}
    };

    private static final String[][] AUSTRALIA_PLAYERS = {
        {"AUS1", "Travis Head", "BATSMAN"},
        {"AUS2", "David Warner", "BATSMAN"},
        {"AUS3", "Steve Smith", "BATSMAN"},
        {"AUS4", "Marnus Labuschagne", "BATSMAN"},
        {"AUS5", "Glenn Maxwell", "ALL_ROUNDER"},
        {"AUS6", "Alex Carey", "WICKET_KEEPER"},
        {"AUS7", "Cameron Green", "ALL_ROUNDER"},
        {"AUS8", "Pat Cummins", "BOWLER"},
        {"AUS9", "Mitchell Starc", "BOWLER"},
        {"AUS10", "Josh Hazlewood", "BOWLER"},
        {"AUS11", "Adam Zampa", "BOWLER"}
    };

    private static final String[][] ENGLAND_PLAYERS = {
        {"ENG1", "Jos Buttler", "WICKET_KEEPER"},
        {"ENG2", "Jonny Bairstow", "BATSMAN"},
        {"ENG3", "Joe Root", "BATSMAN"},
        {"ENG4", "Ben Stokes", "ALL_ROUNDER"},
        {"ENG5", "Harry Brook", "BATSMAN"},
        {"ENG6", "Liam Livingstone", "ALL_ROUNDER"},
        {"ENG7", "Moeen Ali", "ALL_ROUNDER"},
        {"ENG8", "Chris Woakes", "BOWLER"},
        {"ENG9", "Mark Wood", "BOWLER"},
        {"ENG10", "Adil Rashid", "BOWLER"},
        {"ENG11", "Jofra Archer", "BOWLER"}
    };

    private static final String[][] SA_PLAYERS = {
        {"SA1", "Quinton de Kock", "WICKET_KEEPER"},
        {"SA2", "Temba Bavuma", "BATSMAN"},
        {"SA3", "Aiden Markram", "BATSMAN"},
        {"SA4", "Rassie van der Dussen", "BATSMAN"},
        {"SA5", "Heinrich Klaasen", "BATSMAN"},
        {"SA6", "David Miller", "BATSMAN"},
        {"SA7", "Marco Jansen", "ALL_ROUNDER"},
        {"SA8", "Keshav Maharaj", "BOWLER"},
        {"SA9", "Kagiso Rabada", "BOWLER"},
        {"SA10", "Anrich Nortje", "BOWLER"},
        {"SA11", "Lungi Ngidi", "BOWLER"}
    };

    private final Map<String, String[][]> teamRosters = new HashMap<>();

    public MatchService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
        teamRosters.put("India", INDIA_PLAYERS);
        teamRosters.put("Australia", AUSTRALIA_PLAYERS);
        teamRosters.put("England", ENGLAND_PLAYERS);
        teamRosters.put("South Africa", SA_PLAYERS);
    }

    @PostConstruct
    public void init() {
        // Create demo matches on startup
        createMatch("India", "Australia", "Melbourne Cricket Ground", "T20");
        createMatch("England", "South Africa", "Lord's Cricket Ground", "ODI");
    }

    public Match createMatch(String team1, String team2, String venue, String matchType) {
        String id = UUID.randomUUID().toString().substring(0, 8);
        int totalOvers = matchType.equals("T20") ? 20 : 50;

        List<Player> team1Players = createTeamPlayers(team1);
        List<Player> team2Players = createTeamPlayers(team2);

        // Simulate toss
        String tossWinner = random.nextBoolean() ? team1 : team2;
        String tossDecision = random.nextBoolean() ? "BAT" : "BOWL";

        String battingFirst = tossDecision.equals("BAT") ? tossWinner : (tossWinner.equals(team1) ? team2 : team1);
        String bowlingFirst = battingFirst.equals(team1) ? team2 : team1;

        // Initialize first innings
        Innings firstInnings = Innings.builder()
                .inningsNumber(1)
                .battingTeam(battingFirst)
                .bowlingTeam(bowlingFirst)
                .totalRuns(0)
                .totalWickets(0)
                .totalOvers(0)
                .totalBalls(0)
                .extras(0)
                .currentRunRate(0.0)
                .battingOrder(new ArrayList<>(battingFirst.equals(team1) ? team1Players : team2Players))
                .bowlingFigures(new ArrayList<>(bowlingFirst.equals(team1) ? team1Players : team2Players))
                .ballEvents(new ArrayList<>())
                .recentBalls(new ArrayList<>())
                .fallOfWickets(new ArrayList<>())
                .build();

        // Set opening batsmen and bowler
        List<Player> batsmen = firstInnings.getBattingOrder();
        List<Player> bowlers = firstInnings.getBowlingFigures();
        firstInnings.setCurrentBatsmanId(batsmen.get(0).getId());
        firstInnings.setNonStrikerBatsmanId(batsmen.get(1).getId());

        // Pick a bowler (from the bowling team's bowlers)
        Player openingBowler = bowlers.stream()
                .filter(p -> p.getRole().equals("BOWLER") || p.getRole().equals("ALL_ROUNDER"))
                .findFirst()
                .orElse(bowlers.get(bowlers.size() - 1));
        firstInnings.setCurrentBowlerId(openingBowler.getId());

        Match match = Match.builder()
                .id(id)
                .team1(team1)
                .team2(team2)
                .venue(venue)
                .matchType(matchType)
                .totalOvers(totalOvers)
                .tossWinner(tossWinner)
                .tossDecision(tossDecision)
                .status("LIVE")
                .currentInnings(1)
                .innings(new ArrayList<>(List.of(firstInnings)))
                .team1Players(team1Players)
                .team2Players(team2Players)
                .startTime(LocalDateTime.now())
                .lastUpdated(LocalDateTime.now())
                .recentEvents(new ArrayList<>())
                .build();

        matches.put(id, match);
        broadcastMatchUpdate(match);
        return match;
    }

    private List<Player> createTeamPlayers(String teamName) {
        String[][] roster = teamRosters.get(teamName);
        if (roster == null) {
            // Generate generic players if team not in our roster
            List<Player> players = new ArrayList<>();
            for (int i = 1; i <= 11; i++) {
                players.add(Player.builder()
                        .id(teamName.substring(0, 3).toUpperCase() + i)
                        .name("Player " + i)
                        .team(teamName)
                        .role(i <= 5 ? "BATSMAN" : (i <= 8 ? "ALL_ROUNDER" : "BOWLER"))
                        .build());
            }
            return players;
        }

        return Arrays.stream(roster)
                .map(p -> Player.builder()
                        .id(p[0])
                        .name(p[1])
                        .team(teamName)
                        .role(p[2])
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Simulates the next ball for all live matches — called every 3 seconds.
     */
    @Scheduled(fixedRate = 3000)
    public void simulateLiveMatches() {
        matches.values().stream()
                .filter(m -> "LIVE".equals(m.getStatus()) && !m.isPaused())
                .forEach(this::simulateBall);
    }

    private void simulateBall(Match match) {
        Innings currentInnings = match.getCurrentInningsData();
        if (currentInnings == null) return;

        // Find current batsman and bowler
        Player batsman = findPlayerById(currentInnings.getBattingOrder(), currentInnings.getCurrentBatsmanId());
        Player bowler = findPlayerById(currentInnings.getBowlingFigures(), currentInnings.getCurrentBowlerId());
        Player nonStriker = findPlayerById(currentInnings.getBattingOrder(), currentInnings.getNonStrikerBatsmanId());

        if (batsman == null || bowler == null) return;

        // Generate ball outcome
        BallEvent event = generateBallOutcome(match, currentInnings, batsman, bowler);

        // Process the event
        processBallEvent(match, currentInnings, event, batsman, bowler, nonStriker);

        // Update run rate
        currentInnings.updateRunRate();

        // Check if innings is over
        checkInningsCompletion(match, currentInnings);

        match.setLastUpdated(LocalDateTime.now());

        // Add to recent events (keep last 20)
        match.getRecentEvents().add(0, event);
        if (match.getRecentEvents().size() > 20) {
            match.getRecentEvents().remove(match.getRecentEvents().size() - 1);
        }

        // Broadcast update via WebSocket
        broadcastMatchUpdate(match);
        broadcastBallEvent(match.getId(), event);
    }

    private BallEvent generateBallOutcome(Match match, Innings innings, Player batsman, Player bowler) {
        BallEvent.BallEventBuilder builder = BallEvent.builder()
                .matchId(match.getId())
                .innings(innings.getInningsNumber())
                .overNumber(innings.getTotalOvers())
                .ballNumber(innings.getTotalBalls() + 1)
                .batsmanId(batsman.getId())
                .batsmanName(batsman.getName())
                .bowlerId(bowler.getId())
                .bowlerName(bowler.getName())
                .timestamp(System.currentTimeMillis());

        // Probability-based outcome generation
        double rand = random.nextDouble();

        if (rand < 0.02) {
            // Wide (2%)
            builder.isWide(true).runs(1)
                    .commentary("Wide ball by " + bowler.getName() + "! Extra run conceded.");
        } else if (rand < 0.03) {
            // No ball (1%)
            builder.isNoBall(true).runs(1)
                    .commentary("No ball by " + bowler.getName() + "! Free hit coming up.");
        } else if (rand < 0.10) {
            // Wicket (7%)
            String[] wicketTypes = {"BOWLED", "CAUGHT", "LBW", "CAUGHT", "CAUGHT", "RUN_OUT", "STUMPED"};
            String wicketType = wicketTypes[random.nextInt(wicketTypes.length)];
            builder.isWicket(true).runs(0).wicketType(wicketType)
                    .commentary("OUT! " + batsman.getName() + " is " + wicketType.toLowerCase().replace("_", " ")
                            + " by " + bowler.getName() + "! What a delivery!");
        } else if (rand < 0.35) {
            // Dot ball (25%)
            builder.runs(0)
                    .commentary("Dot ball! " + bowler.getName() + " keeps it tight to " + batsman.getName() + ".");
        } else if (rand < 0.55) {
            // 1 run (20%)
            builder.runs(1)
                    .commentary(batsman.getName() + " pushes it for a single. Good running between the wickets.");
        } else if (rand < 0.70) {
            // 2 runs (15%)
            builder.runs(2)
                    .commentary(batsman.getName() + " drives it through the gap for two runs. Well placed!");
        } else if (rand < 0.78) {
            // 3 runs (8%)
            builder.runs(3)
                    .commentary("Three runs! " + batsman.getName() + " finds the gap and they run hard for three.");
        } else if (rand < 0.90) {
            // Four (12%)
            builder.runs(4).isFour(true)
                    .commentary("FOUR! " + batsman.getName() + " smashes it to the boundary! Beautiful shot!");
        } else {
            // Six (10%)
            builder.runs(6).isSix(true)
                    .commentary("SIX! " + batsman.getName() + " launches it into the stands! Massive hit!");
        }

        return builder.build();
    }

    private void processBallEvent(Match match, Innings innings, BallEvent event,
                                   Player batsman, Player bowler, Player nonStriker) {
        innings.getBallEvents().add(event);
        if (innings.getBallEvents().size() > 50) {
            innings.getBallEvents().remove(0);
        }

        if (event.isWide() || event.isNoBall()) {
            // Extras — don't count as a legal delivery
            innings.setTotalRuns(innings.getTotalRuns() + event.getRuns());
            innings.setExtras(innings.getExtras() + event.getRuns());
            if (event.isWide()) innings.setWides(innings.getWides() + 1);
            if (event.isNoBall()) innings.setNoBalls(innings.getNoBalls() + 1);
            bowler.setRunsConceded(bowler.getRunsConceded() + event.getRuns());

            // Update recent balls display
            String ballDisplay = event.isWide() ? "WD" : "NB";
            innings.getRecentBalls().add(ballDisplay);
            if (innings.getRecentBalls().size() > 12) {
                innings.getRecentBalls().remove(0);
            }
            return;
        }

        // Legal delivery
        int runs = event.getRuns();

        // Update batsman stats
        batsman.setBallsFaced(batsman.getBallsFaced() + 1);
        batsman.setRunsScored(batsman.getRunsScored() + runs);
        if (event.isFour()) batsman.setFours(batsman.getFours() + 1);
        if (event.isSix()) batsman.setSixes(batsman.getSixes() + 1);

        // Update bowler stats
        bowler.setRunsConceded(bowler.getRunsConceded() + runs);

        // Update innings totals
        innings.setTotalRuns(innings.getTotalRuns() + runs);

        // Update recent balls display
        String ballDisplay = event.isWicket() ? "W" :
                event.isSix() ? "6" :
                event.isFour() ? "4" :
                String.valueOf(runs);
        innings.getRecentBalls().add(ballDisplay);
        if (innings.getRecentBalls().size() > 12) {
            innings.getRecentBalls().remove(0);
        }

        // Handle wicket
        if (event.isWicket()) {
            innings.setTotalWickets(innings.getTotalWickets() + 1);
            batsman.setOut(true);
            batsman.setDismissalType(event.getWicketType());
            batsman.setDismissedBy(bowler.getName());
            bowler.setWicketsTaken(bowler.getWicketsTaken() + 1);
            innings.getFallOfWickets().add(innings.getTotalRuns());

            // Bring in next batsman
            int nextBatsmanIndex = innings.getTotalWickets() + 1;
            if (nextBatsmanIndex < innings.getBattingOrder().size()) {
                Player nextBatsman = innings.getBattingOrder().get(nextBatsmanIndex);
                innings.setCurrentBatsmanId(nextBatsman.getId());
            }
        }

        // Rotate strike on odd runs
        if (runs % 2 != 0 && !event.isWicket()) {
            String temp = innings.getCurrentBatsmanId();
            innings.setCurrentBatsmanId(innings.getNonStrikerBatsmanId());
            innings.setNonStrikerBatsmanId(temp);
        }

        // Increment ball count
        innings.setTotalBalls(innings.getTotalBalls() + 1);
        if (innings.getTotalBalls() == 6) {
            innings.setTotalOvers(innings.getTotalOvers() + 1);
            innings.setTotalBalls(0);
            bowler.setOversBowled(bowler.getOversBowled() + 1);

            // Check for maiden
            long runsInOver = innings.getBallEvents().stream()
                    .filter(e -> e.getOverNumber() == innings.getTotalOvers() - 1
                            && !e.isWide() && !e.isNoBall())
                    .mapToInt(BallEvent::getRuns)
                    .sum();
            if (runsInOver == 0) bowler.setMaidens(bowler.getMaidens() + 1);

            // Rotate strike at end of over
            String temp = innings.getCurrentBatsmanId();
            innings.setCurrentBatsmanId(innings.getNonStrikerBatsmanId());
            innings.setNonStrikerBatsmanId(temp);

            // Change bowler
            changeBowler(innings);
        }
    }

    private void changeBowler(Innings innings) {
        List<Player> bowlers = innings.getBowlingFigures().stream()
                .filter(p -> p.getRole().equals("BOWLER") || p.getRole().equals("ALL_ROUNDER"))
                .collect(Collectors.toList());

        if (bowlers.isEmpty()) return;

        String currentBowlerId = innings.getCurrentBowlerId();
        // Pick a different bowler
        List<Player> availableBowlers = bowlers.stream()
                .filter(b -> !b.getId().equals(currentBowlerId))
                .collect(Collectors.toList());

        if (!availableBowlers.isEmpty()) {
            Player nextBowler = availableBowlers.get(random.nextInt(availableBowlers.size()));
            innings.setCurrentBowlerId(nextBowler.getId());
        }
    }

    private void checkInningsCompletion(Match match, Innings currentInnings) {
        boolean allOut = currentInnings.getTotalWickets() >= 10;
        boolean oversCompleted = currentInnings.getTotalOvers() >= match.getTotalOvers();
        boolean targetChased = false;

        if (match.getCurrentInnings() == 2) {
            Innings firstInnings = match.getInnings().get(0);
            int target = firstInnings.getTotalRuns() + 1;
            currentInnings.setTarget(target);

            double totalOversDecimal = currentInnings.getTotalOvers() + (currentInnings.getTotalBalls() / 6.0);
            double remainingOvers = match.getTotalOvers() - totalOversDecimal;
            int remainingRuns = target - currentInnings.getTotalRuns();
            if (remainingOvers > 0) {
                currentInnings.setRequiredRunRate(remainingRuns / remainingOvers);
            }

            if (currentInnings.getTotalRuns() >= target) {
                targetChased = true;
            }
        }

        if (allOut || oversCompleted || targetChased) {
            currentInnings.setCompleted(true);

            if (match.getCurrentInnings() == 1) {
                // Start second innings
                startSecondInnings(match);
            } else {
                // Match over
                completeMatch(match);
            }
        }
    }

    private void startSecondInnings(Match match) {
        Innings firstInnings = match.getInnings().get(0);
        String battingTeam = firstInnings.getBowlingTeam();
        String bowlingTeam = firstInnings.getBattingTeam();

        List<Player> battingPlayers = battingTeam.equals(match.getTeam1())
                ? createTeamPlayers(match.getTeam1())
                : createTeamPlayers(match.getTeam2());
        List<Player> bowlingPlayers = bowlingTeam.equals(match.getTeam1())
                ? createTeamPlayers(match.getTeam1())
                : createTeamPlayers(match.getTeam2());

        Innings secondInnings = Innings.builder()
                .inningsNumber(2)
                .battingTeam(battingTeam)
                .bowlingTeam(bowlingTeam)
                .totalRuns(0)
                .totalWickets(0)
                .totalOvers(0)
                .totalBalls(0)
                .extras(0)
                .target(firstInnings.getTotalRuns() + 1)
                .currentRunRate(0.0)
                .battingOrder(new ArrayList<>(battingPlayers))
                .bowlingFigures(new ArrayList<>(bowlingPlayers))
                .ballEvents(new ArrayList<>())
                .recentBalls(new ArrayList<>())
                .fallOfWickets(new ArrayList<>())
                .build();

        secondInnings.setCurrentBatsmanId(battingPlayers.get(0).getId());
        secondInnings.setNonStrikerBatsmanId(battingPlayers.get(1).getId());

        Player openingBowler = bowlingPlayers.stream()
                .filter(p -> p.getRole().equals("BOWLER") || p.getRole().equals("ALL_ROUNDER"))
                .findFirst()
                .orElse(bowlingPlayers.get(bowlingPlayers.size() - 1));
        secondInnings.setCurrentBowlerId(openingBowler.getId());

        match.getInnings().add(secondInnings);
        match.setCurrentInnings(2);

        // Update team player references for the second innings
        if (battingTeam.equals(match.getTeam1())) {
            match.setTeam1Players(battingPlayers);
        } else {
            match.setTeam2Players(battingPlayers);
        }
        if (bowlingTeam.equals(match.getTeam1())) {
            match.setTeam1Players(bowlingPlayers);
        } else {
            match.setTeam2Players(bowlingPlayers);
        }
    }

    private void completeMatch(Match match) {
        match.setStatus("COMPLETED");
        Innings first = match.getInnings().get(0);
        Innings second = match.getInnings().get(1);

        if (second.getTotalRuns() >= first.getTotalRuns() + 1) {
            int wicketsRemaining = 10 - second.getTotalWickets();
            match.setResult(second.getBattingTeam() + " won by " + wicketsRemaining + " wickets");
        } else {
            int runDifference = first.getTotalRuns() - second.getTotalRuns();
            match.setResult(first.getBattingTeam() + " won by " + runDifference + " runs");
        }

        // Determine man of the match (highest runs scorer)
        List<Player> allPlayers = new ArrayList<>();
        allPlayers.addAll(first.getBattingOrder());
        allPlayers.addAll(second.getBattingOrder());
        Player motm = allPlayers.stream()
                .max(Comparator.comparingInt(Player::getRunsScored))
                .orElse(null);
        if (motm != null) {
            match.setManOfTheMatch(motm.getName());
        }
    }

    private Player findPlayerById(List<Player> players, String id) {
        if (id == null || players == null) return null;
        return players.stream()
                .filter(p -> p.getId().equals(id))
                .findFirst()
                .orElse(null);
    }

    private void broadcastMatchUpdate(Match match) {
        messagingTemplate.convertAndSend("/topic/match/" + match.getId(), match);
        messagingTemplate.convertAndSend("/topic/matches", getAllMatches());
    }

    private void broadcastBallEvent(String matchId, BallEvent event) {
        messagingTemplate.convertAndSend("/topic/ball/" + matchId, event);
    }

    // ---- Public API methods ----

    public List<Match> getAllMatches() {
        return new ArrayList<>(matches.values());
    }

    public Match getMatch(String id) {
        return matches.get(id);
    }

    public List<Match> getLiveMatches() {
        return matches.values().stream()
                .filter(m -> "LIVE".equals(m.getStatus()))
                .collect(Collectors.toList());
    }

    public List<Match> getCompletedMatches() {
        return matches.values().stream()
                .filter(m -> "COMPLETED".equals(m.getStatus()))
                .collect(Collectors.toList());
    }

    public List<Player> getPlayerStats(String matchId, String team) {
        Match match = matches.get(matchId);
        if (match == null) return Collections.emptyList();

        List<Player> allPlayers = new ArrayList<>();
        for (Innings inn : match.getInnings()) {
            if (inn.getBattingTeam().equals(team)) {
                allPlayers.addAll(inn.getBattingOrder());
            }
        }
        return allPlayers;
    }

    public Map<String, Object> getMatchSummary(String matchId) {
        Match match = matches.get(matchId);
        if (match == null) return Collections.emptyMap();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("matchId", match.getId());
        summary.put("teams", match.getTeam1() + " vs " + match.getTeam2());
        summary.put("venue", match.getVenue());
        summary.put("matchType", match.getMatchType());
        summary.put("status", match.getStatus());
        summary.put("toss", match.getTossWinner() + " won the toss and chose to " + match.getTossDecision().toLowerCase());
        summary.put("scoreSummary", match.getScoreSummary());
        summary.put("result", match.getResult());
        summary.put("manOfTheMatch", match.getManOfTheMatch());

        List<Map<String, Object>> inningsSummaries = new ArrayList<>();
        for (Innings inn : match.getInnings()) {
            Map<String, Object> innSummary = new LinkedHashMap<>();
            innSummary.put("battingTeam", inn.getBattingTeam());
            innSummary.put("score", inn.getTotalRuns() + "/" + inn.getTotalWickets());
            innSummary.put("overs", inn.getOverDisplay());
            innSummary.put("runRate", String.format("%.2f", inn.getCurrentRunRate()));
            innSummary.put("extras", inn.getExtras());

            // Top scorers
            List<Map<String, Object>> topScorers = inn.getBattingOrder().stream()
                    .filter(p -> p.getBallsFaced() > 0)
                    .sorted(Comparator.comparingInt(Player::getRunsScored).reversed())
                    .limit(3)
                    .map(p -> {
                        Map<String, Object> scorer = new LinkedHashMap<>();
                        scorer.put("name", p.getName());
                        scorer.put("runs", p.getRunsScored());
                        scorer.put("balls", p.getBallsFaced());
                        scorer.put("fours", p.getFours());
                        scorer.put("sixes", p.getSixes());
                        scorer.put("strikeRate", String.format("%.1f", p.getStrikeRate()));
                        return scorer;
                    })
                    .collect(Collectors.toList());
            innSummary.put("topScorers", topScorers);

            // Top wicket takers
            List<Map<String, Object>> topBowlers = inn.getBowlingFigures().stream()
                    .filter(p -> p.getOversBowled() > 0)
                    .sorted(Comparator.comparingInt(Player::getWicketsTaken).reversed())
                    .limit(3)
                    .map(p -> {
                        Map<String, Object> bowlerMap = new LinkedHashMap<>();
                        bowlerMap.put("name", p.getName());
                        bowlerMap.put("wickets", p.getWicketsTaken());
                        bowlerMap.put("overs", p.getOversBowled());
                        bowlerMap.put("runs", p.getRunsConceded());
                        bowlerMap.put("economy", String.format("%.1f", p.getEconomyRate()));
                        return bowlerMap;
                    })
                    .collect(Collectors.toList());
            innSummary.put("topBowlers", topBowlers);

            inningsSummaries.add(innSummary);
        }
        summary.put("innings", inningsSummaries);

        return summary;
    }

    public Match simulateNextBall(String matchId) {
        Match match = matches.get(matchId);
        if (match != null && "LIVE".equals(match.getStatus())) {
            simulateBall(match);
        }
        return match;
    }

    public Match simulateOver(String matchId) {
        Match match = matches.get(matchId);
        if (match != null && "LIVE".equals(match.getStatus())) {
            Innings currentInnings = match.getCurrentInningsData();
            if (currentInnings != null) {
                int currentOver = currentInnings.getTotalOvers();
                int ballsCount = 0;
                while (ballsCount < 6 && "LIVE".equals(match.getStatus()) && currentInnings.getTotalOvers() == currentOver) {
                    simulateBall(match);
                    ballsCount++;
                }
            }
        }
        return match;
    }

    public Match togglePause(String matchId) {
        Match match = matches.get(matchId);
        if (match != null) {
            match.setPaused(!match.isPaused());
            broadcastMatchUpdate(match);
        }
        return match;
    }

    public void resetAllMatches() {
        matches.clear();
        init();
        messagingTemplate.convertAndSend("/topic/matches", getAllMatches());
    }

    public Map<String, Object> getLeaderboard() {
        Map<String, Object> leaderboard = new LinkedHashMap<>();
        List<Player> allBatters = new ArrayList<>();
        List<Player> allBowlers = new ArrayList<>();

        for (Match m : matches.values()) {
            for (Innings inn : m.getInnings()) {
                for (Player p : inn.getBattingOrder()) {
                    if (p.getBallsFaced() > 0) {
                        allBatters.add(p);
                    }
                }
                for (Player p : inn.getBowlingFigures()) {
                    if (p.getOversBowled() > 0) {
                        allBowlers.add(p);
                    }
                }
            }
        }

        List<Player> topBatters = allBatters.stream()
                .sorted(Comparator.comparingInt(Player::getRunsScored).reversed())
                .limit(10)
                .collect(Collectors.toList());

        List<Player> topBowlers = allBowlers.stream()
                .sorted(Comparator.comparingInt(Player::getWicketsTaken).reversed())
                .limit(10)
                .collect(Collectors.toList());

        leaderboard.put("topBatters", topBatters);
        leaderboard.put("topBowlers", topBowlers);
        return leaderboard;
    }

    public void deleteMatch(String id) {
        matches.remove(id);
        messagingTemplate.convertAndSend("/topic/matches", getAllMatches());
    }
}
