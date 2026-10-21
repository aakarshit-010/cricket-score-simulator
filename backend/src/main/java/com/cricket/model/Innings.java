package com.cricket.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Innings {
    private int inningsNumber;
    private String battingTeam;
    private String bowlingTeam;
    private int totalRuns;
    private int totalWickets;
    private int totalOvers;
    private int totalBalls; // balls in current over
    private int extras;
    private int wides;
    private int noBalls;
    private int byes;
    private int legByes;
    private double currentRunRate;
    private double requiredRunRate;
    private int target;
    @Builder.Default
    private List<Player> battingOrder = new ArrayList<>();
    @Builder.Default
    private List<Player> bowlingFigures = new ArrayList<>();
    @Builder.Default
    private List<BallEvent> ballEvents = new ArrayList<>();
    private String currentBatsmanId;
    private String nonStrikerBatsmanId;
    private String currentBowlerId;
    @Builder.Default
    private List<String> recentBalls = new ArrayList<>(); // last 6 balls display
    @Builder.Default
    private boolean isCompleted = false;
    @Builder.Default
    private List<Integer> fallOfWickets = new ArrayList<>(); // score at which each wicket fell

    public String getOverDisplay() {
        return totalOvers + "." + totalBalls;
    }

    public void updateRunRate() {
        double totalOversDecimal = totalOvers + (totalBalls / 6.0);
        this.currentRunRate = totalOversDecimal > 0 ? totalRuns / totalOversDecimal : 0.0;
    }
}
