package com.cricket.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BallEvent {
    private String matchId;
    private int innings;
    private int overNumber;
    private int ballNumber;
    private String batsmanId;
    private String batsmanName;
    private String bowlerId;
    private String bowlerName;
    private int runs;
    private boolean isWicket;
    private boolean isWide;
    private boolean isNoBall;
    private boolean isBye;
    private boolean isLegBye;
    private boolean isFour;
    private boolean isSix;
    private String wicketType;
    private String commentary;
    private long timestamp;
}
