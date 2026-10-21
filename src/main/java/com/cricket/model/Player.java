package com.cricket.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Player {
    private String id;
    private String name;
    private String team;
    private String role; // BATSMAN, BOWLER, ALL_ROUNDER, WICKET_KEEPER
    private int runsScored;
    private int ballsFaced;
    private int fours;
    private int sixes;
    private int wicketsTaken;
    private int oversBowled;
    private int runsConceded;
    private int maidens;
    private int catches;
    private boolean isOut;
    private String dismissalType; // BOWLED, CAUGHT, LBW, RUN_OUT, STUMPED, NOT_OUT, etc.
    private String dismissedBy;

    public double getStrikeRate() {
        return ballsFaced > 0 ? (runsScored * 100.0) / ballsFaced : 0.0;
    }

    public double getBattingAverage() {
        return ballsFaced > 0 ? (double) runsScored / (isOut ? 1 : 1) : 0.0;
    }

    public double getEconomyRate() {
        return oversBowled > 0 ? (double) runsConceded / oversBowled : 0.0;
    }
}
