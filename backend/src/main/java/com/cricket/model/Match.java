package com.cricket.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Match {
    private String id;
    private String team1;
    private String team2;
    private String venue;
    private String matchType; // T20, ODI, TEST
    private int totalOvers;   // 20 for T20, 50 for ODI
    private String tossWinner;
    private String tossDecision; // BAT or BOWL
    private String status; // SCHEDULED, LIVE, COMPLETED, ABANDONED
    private int currentInnings; // 1 or 2
    @Builder.Default
    private List<Innings> innings = new ArrayList<>();
    @Builder.Default
    private List<Player> team1Players = new ArrayList<>();
    @Builder.Default
    private List<Player> team2Players = new ArrayList<>();
    private String result;
    private String manOfTheMatch;
    private LocalDateTime startTime;
    private LocalDateTime lastUpdated;
    @Builder.Default
    private boolean paused = false;
    @Builder.Default
    private List<BallEvent> recentEvents = new ArrayList<>();

    public Innings getCurrentInningsData() {
        if (innings != null && currentInnings > 0 && currentInnings <= innings.size()) {
            return innings.get(currentInnings - 1);
        }
        return null;
    }

    public String getScoreSummary() {
        if (innings == null || innings.isEmpty()) {
            return "Match not started";
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < innings.size(); i++) {
            Innings inn = innings.get(i);
            if (i > 0) sb.append(" | ");
            sb.append(inn.getBattingTeam()).append(": ")
              .append(inn.getTotalRuns()).append("/").append(inn.getTotalWickets())
              .append(" (").append(inn.getOverDisplay()).append(")");
        }
        return sb.toString();
    }
}
