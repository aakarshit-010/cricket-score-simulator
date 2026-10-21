package com.cricket.controller;

import com.cricket.model.Match;
import com.cricket.model.Player;
import com.cricket.service.MatchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/matches")
public class MatchController {

    private final MatchService matchService;

    public MatchController(MatchService matchService) {
        this.matchService = matchService;
    }

    /**
     * GET /api/matches — list all matches
     */
    @GetMapping
    public ResponseEntity<List<Match>> getAllMatches() {
        return ResponseEntity.ok(matchService.getAllMatches());
    }

    /**
     * GET /api/matches/live — list only live matches
     */
    @GetMapping("/live")
    public ResponseEntity<List<Match>> getLiveMatches() {
        return ResponseEntity.ok(matchService.getLiveMatches());
    }

    /**
     * GET /api/matches/completed — list completed matches
     */
    @GetMapping("/completed")
    public ResponseEntity<List<Match>> getCompletedMatches() {
        return ResponseEntity.ok(matchService.getCompletedMatches());
    }

    /**
     * GET /api/matches/{id} — get a single match by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<Match> getMatch(@PathVariable String id) {
        Match match = matchService.getMatch(id);
        if (match == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(match);
    }

    /**
     * GET /api/matches/{id}/summary — match summary with top performers
     */
    @GetMapping("/{id}/summary")
    public ResponseEntity<Map<String, Object>> getMatchSummary(@PathVariable String id) {
        Map<String, Object> summary = matchService.getMatchSummary(id);
        if (summary.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(summary);
    }

    /**
     * GET /api/matches/{id}/players?team=India — player stats for a team in a match
     */
    @GetMapping("/{id}/players")
    public ResponseEntity<List<Player>> getPlayerStats(
            @PathVariable String id,
            @RequestParam String team) {
        List<Player> players = matchService.getPlayerStats(id, team);
        return ResponseEntity.ok(players);
    }

    /**
     * POST /api/matches — create a new match
     * Body: { "team1": "India", "team2": "Australia", "venue": "MCG", "matchType": "T20" }
     */
    @PostMapping
    public ResponseEntity<Match> createMatch(@RequestBody Map<String, String> request) {
        String team1 = request.getOrDefault("team1", "India");
        String team2 = request.getOrDefault("team2", "Australia");
        String venue = request.getOrDefault("venue", "Stadium");
        String matchType = request.getOrDefault("matchType", "T20");

        Match match = matchService.createMatch(team1, team2, venue, matchType);
        return ResponseEntity.ok(match);
    }

    /**
     * POST /api/matches/{id}/ball — simulate single ball on demand
     */
    @PostMapping("/{id}/ball")
    public ResponseEntity<Match> simulateBall(@PathVariable String id) {
        Match match = matchService.simulateNextBall(id);
        if (match == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(match);
    }

    /**
     * POST /api/matches/{id}/over — simulate full over
     */
    @PostMapping("/{id}/over")
    public ResponseEntity<Match> simulateOver(@PathVariable String id) {
        Match match = matchService.simulateOver(id);
        if (match == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(match);
    }

    /**
     * POST /api/matches/{id}/toggle-pause — pause or resume simulation
     */
    @PostMapping("/{id}/toggle-pause")
    public ResponseEntity<Match> togglePause(@PathVariable String id) {
        Match match = matchService.togglePause(id);
        if (match == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(match);
    }

    /**
     * POST /api/matches/reset — reset demo matches
     */
    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> resetMatches() {
        matchService.resetAllMatches();
        return ResponseEntity.ok(Map.of("message", "Matches reset successfully"));
    }

    /**
     * GET /api/matches/leaderboard — tournament leaders (runs, wickets)
     */
    @GetMapping("/leaderboard")
    public ResponseEntity<Map<String, Object>> getLeaderboard() {
        return ResponseEntity.ok(matchService.getLeaderboard());
    }

    /**
     * DELETE /api/matches/{id} — delete a match
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMatch(@PathVariable String id) {
        matchService.deleteMatch(id);
        return ResponseEntity.noContent().build();
    }
}
