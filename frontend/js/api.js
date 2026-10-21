/* ==========================================================================
   CricLive API Client — Dedicated Service Layer for REST & WebSockets
   ========================================================================== */

const API_BASE = (window.location.protocol.startsWith('http') && window.location.port === '8080')
    ? '' 
    : 'http://localhost:8080';

const API = {
    // REST API endpoints
    async getAllMatches() {
        const res = await fetch(`${API_BASE}/api/matches`);
        if (!res.ok) throw new Error('Failed to fetch matches');
        return await res.json();
    },

    async getMatch(id) {
        const res = await fetch(`${API_BASE}/api/matches/${id}`);
        if (!res.ok) throw new Error(`Failed to fetch match ${id}`);
        return await res.json();
    },

    async getMatchSummary(id) {
        const res = await fetch(`${API_BASE}/api/matches/${id}/summary`);
        if (!res.ok) throw new Error(`Failed to fetch summary for ${id}`);
        return await res.json();
    },

    async getLeaderboard() {
        const res = await fetch(`${API_BASE}/api/matches/leaderboard`);
        if (!res.ok) throw new Error('Failed to fetch leaderboard');
        return await res.json();
    },

    async createMatch(matchData) {
        const res = await fetch(`${API_BASE}/api/matches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(matchData)
        });
        if (!res.ok) throw new Error('Failed to create match');
        return await res.json();
    },

    async deleteMatch(id) {
        const res = await fetch(`${API_BASE}/api/matches/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`Failed to delete match ${id}`);
        return true;
    },

    async simulateBall(id) {
        const res = await fetch(`${API_BASE}/api/matches/${id}/ball`, { method: 'POST' });
        if (!res.ok) throw new Error(`Failed to simulate ball for ${id}`);
        return await res.json();
    },

    async simulateOver(id) {
        const res = await fetch(`${API_BASE}/api/matches/${id}/over`, { method: 'POST' });
        if (!res.ok) throw new Error(`Failed to simulate over for ${id}`);
        return await res.json();
    },

    async togglePause(id) {
        const res = await fetch(`${API_BASE}/api/matches/${id}/toggle-pause`, { method: 'POST' });
        if (!res.ok) throw new Error(`Failed to toggle pause for ${id}`);
        return await res.json();
    },

    async resetMatches() {
        const res = await fetch('/api/matches/reset', { method: 'POST' });
        if (!res.ok) throw new Error('Failed to reset matches');
        return await res.json();
    }
};

// WebSocket Service with Auto-Reconnect
class MatchWebSocket {
    constructor(onConnect, onDisconnect, onMatchesUpdate, onMatchUpdate, onBallEvent) {
        this.onConnect = onConnect;
        this.onDisconnect = onDisconnect;
        this.onMatchesUpdate = onMatchesUpdate;
        this.onMatchUpdate = onMatchUpdate;
        this.onBallEvent = onBallEvent;
        this.stompClient = null;
        this.activeSubscriptions = new Map();
    }

    connect() {
        const socket = new SockJS(`${API_BASE}/ws`);
        this.stompClient = Stomp.over(socket);
        this.stompClient.debug = null; // suppress noise

        this.stompClient.connect({}, () => {
            if (this.onConnect) this.onConnect();

            // Subscribe to all matches channel
            this.stompClient.subscribe('/topic/matches', (msg) => {
                if (this.onMatchesUpdate) {
                    this.onMatchesUpdate(JSON.parse(msg.body));
                }
            });
        }, (err) => {
            if (this.onDisconnect) this.onDisconnect(err);
            setTimeout(() => this.connect(), 3000);
        });
    }

    subscribeMatch(matchId) {
        if (!this.stompClient || !this.stompClient.connected) return;

        const topicMatch = `/topic/match/${matchId}`;
        const topicBall = `/topic/ball/${matchId}`;

        if (!this.activeSubscriptions.has(topicMatch)) {
            const sub = this.stompClient.subscribe(topicMatch, (msg) => {
                if (this.onMatchUpdate) this.onMatchUpdate(JSON.parse(msg.body));
            });
            this.activeSubscriptions.set(topicMatch, sub);
        }

        if (!this.activeSubscriptions.has(topicBall)) {
            const sub = this.stompClient.subscribe(topicBall, (msg) => {
                if (this.onBallEvent) this.onBallEvent(matchId, JSON.parse(msg.body));
            });
            this.activeSubscriptions.set(topicBall, sub);
        }
    }
}
