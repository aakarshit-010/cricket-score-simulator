/* ==========================================================================
   CricLive — Main Application Controller
   Real-Time Cricket Score Management Platform
   ========================================================================== */

let matchesList = [];
let activeMatchId = null;
let activeDetailTab = 'live'; // 'live', 'scorecard', 'commentary', 'squads', 'summary'
let activeInningsIdx = 0;
let wsClient = null;

// Team Emoji Helpers
const TEAM_FLAGS = {
    'India': '🇮🇳',
    'Australia': '🇦🇺',
    'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'South Africa': '🇿🇦',
    'New Zealand': '🇳🇿',
    'Pakistan': '🇵🇰'
};

function getTeamFlag(team) {
    return TEAM_FLAGS[team] || '🏏';
}

// ---- Initialization ----
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initWebSocket();
    loadMatches();
});

// ---- Theme Toggle ----
function initTheme() {
    const savedTheme = localStorage.getItem('criclive-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeButtonText(savedTheme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('criclive-theme', next);
    updateThemeButtonText(next);
}

function updateThemeButtonText(theme) {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.innerHTML = theme === 'light' 
            ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg> Dark Mode`
            : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg> Light Mode`;
    }
}

// ---- WebSocket ----
function initWebSocket() {
    wsClient = new MatchWebSocket(
        // On Connect
        () => {
            const badge = document.getElementById('wsStatusBadge');
            if (badge) {
                badge.classList.add('connected');
                badge.innerHTML = `<span class="pulse-dot"></span> <span>Live Connected</span>`;
            }
            if (activeMatchId) wsClient.subscribeMatch(activeMatchId);
        },
        // On Disconnect
        () => {
            const badge = document.getElementById('wsStatusBadge');
            if (badge) {
                badge.classList.remove('connected');
                badge.innerHTML = `<span class="pulse-dot"></span> <span>Reconnecting...</span>`;
            }
        },
        // On Matches Update
        (updatedMatches) => {
            matchesList = updatedMatches;
            renderTicker();
            if (activeMatchId) {
                const updatedActive = matchesList.find(m => m.id === activeMatchId);
                if (updatedActive) renderActiveMatch(updatedActive);
            }
        },
        // On Single Match Update
        (updatedMatch) => {
            const idx = matchesList.findIndex(m => m.id === updatedMatch.id);
            if (idx >= 0) matchesList[idx] = updatedMatch;
            else matchesList.push(updatedMatch);

            renderTicker();
            if (activeMatchId === updatedMatch.id) {
                renderActiveMatch(updatedMatch);
            }
        },
        // On Ball Event
        (matchId, ballEvent) => {
            if (activeMatchId === matchId && activeDetailTab === 'commentary') {
                prependCommentaryItem(ballEvent);
            }
        }
    );

    wsClient.connect();
}

// ---- Data Fetching ----
async function loadMatches() {
    try {
        matchesList = await API.getAllMatches();
        renderTicker();

        if (matchesList.length > 0) {
            // Select first live match or first match
            const liveMatch = matchesList.find(m => m.status === 'LIVE');
            selectMatch(liveMatch ? liveMatch.id : matchesList[0].id);
        } else {
            renderEmptyState();
        }
    } catch (err) {
        console.error('Failed to load matches:', err);
    }
}

// ---- Match Selection ----
function selectMatch(matchId) {
    activeMatchId = matchId;
    if (wsClient) wsClient.subscribeMatch(matchId);
    renderTicker();

    const match = matchesList.find(m => m.id === matchId);
    if (match) {
        renderActiveMatch(match);
    }
}

// ---- Ticker Strip Rendering ----
function renderTicker() {
    const strip = document.getElementById('matchTickerStrip');
    if (!strip) return;

    if (matchesList.length === 0) {
        strip.innerHTML = `<span style="font-size:0.85rem;color:var(--text-muted);">No matches currently scheduled</span>`;
        return;
    }

    strip.innerHTML = matchesList.map(m => {
        const isSelected = m.id === activeMatchId;
        const currentInn = m.innings && m.innings.length > 0 ? m.innings[m.currentInnings - 1] || m.innings[0] : null;
        const score = currentInn ? `${currentInn.battingTeam} ${currentInn.totalRuns}/${currentInn.totalWickets} (${currentInn.totalOvers}.${currentInn.totalBalls})` : 'Starts soon';
        
        return `
            <div class="ticker-card ${isSelected ? 'active' : ''}" onclick="selectMatch('${m.id}')">
                ${m.status === 'LIVE' ? '<span class="ticker-live-pill">LIVE</span>' : '<span style="font-size:0.7rem;font-weight:700;color:var(--text-muted);">' + m.status + '</span>'}
                <span class="ticker-teams">${m.team1} vs ${m.team2}</span>
                <span class="ticker-score">${score}</span>
            </div>
        `;
    }).join('');
}

// ---- Render Active Match & All Its Detailed Sections ----
function renderActiveMatch(match) {
    const container = document.getElementById('activeMatchContainer');
    if (!container) return;

    const inn1 = match.innings && match.innings.length > 0 ? match.innings[0] : null;
    const inn2 = match.innings && match.innings.length > 1 ? match.innings[1] : null;
    const currentInn = match.innings && match.innings.length > 0 ? match.innings[match.currentInnings - 1] || inn1 : null;

    // Team 1 & 2 Scores
    let t1Score = '—', t1Overs = '', t2Score = '—', t2Overs = '';
    if (inn1) {
        if (inn1.battingTeam === match.team1) {
            t1Score = `${inn1.totalRuns}/${inn1.totalWickets}`;
            t1Overs = `(${inn1.totalOvers}.${inn1.totalBalls} ov)`;
        } else {
            t2Score = `${inn1.totalRuns}/${inn1.totalWickets}`;
            t2Overs = `(${inn1.totalOvers}.${inn1.totalBalls} ov)`;
        }
    }
    if (inn2) {
        if (inn2.battingTeam === match.team1) {
            t1Score = `${inn2.totalRuns}/${inn2.totalWickets}`;
            t1Overs = `(${inn2.totalOvers}.${inn2.totalBalls} ov)`;
        } else {
            t2Score = `${inn2.totalRuns}/${inn2.totalWickets}`;
            t2Overs = `(${inn2.totalOvers}.${inn2.totalBalls} ov)`;
        }
    }

    // Active Batters
    let striker = null, nonStriker = null, activeBowler = null;
    if (currentInn) {
        striker = currentInn.battingOrder.find(p => p.id === currentInn.currentBatsmanId);
        nonStriker = currentInn.battingOrder.find(p => p.id === currentInn.nonStrikerBatsmanId);
        activeBowler = currentInn.bowlingFigures.find(p => p.id === currentInn.currentBowlerId);
    }

    // Recent 6 balls for current over
    const recentBallsHtml = (currentInn && currentInn.recentBalls ? currentInn.recentBalls.slice(-6) : []).map(b => {
        let cls = 'dot';
        if (b === 'W') cls = 'w';
        else if (b === '6') cls = 'six';
        else if (b === '4') cls = 'four';
        else if (b === 'WD' || b === 'NB') cls = 'extra';
        else if (parseInt(b) > 0) cls = 'runs';
        return `<span class="ball-circle ${cls}">${b}</span>`;
    }).join('');

    // CRR, RRR, Target calculation
    const crr = currentInn && currentInn.currentRunRate ? currentInn.currentRunRate.toFixed(2) : '0.00';
    let targetText = '';
    if (currentInn && currentInn.target > 0 && !currentInn.completed) {
        const remainingRuns = currentInn.target - currentInn.totalRuns;
        const totalBallsPossible = match.totalOvers * 6;
        const ballsBowled = currentInn.totalOvers * 6 + currentInn.totalBalls;
        const remainingBalls = Math.max(0, totalBallsPossible - ballsBowled);
        const rrr = currentInn.requiredRunRate ? currentInn.requiredRunRate.toFixed(2) : '0.00';
        targetText = `Target: <strong>${currentInn.target}</strong> | Need <strong>${remainingRuns}</strong> runs off <strong>${remainingBalls}</strong> balls (RRR: <strong>${rrr}</strong>)`;
    }

    // Format HTML
    container.innerHTML = `
        <!-- Hero Match Center -->
        <div class="hero-match-card">
            <div class="hero-match-header">
                <div class="hero-match-meta">
                    <span class="badge-tag ${match.status === 'LIVE' ? 'badge-live' : 'badge-format'}">
                        ${match.status === 'LIVE' ? '<span class="pulse-dot"></span> LIVE' : match.status}
                    </span>
                    <span class="badge-tag badge-format">${match.matchType}</span>
                    <span>📍 ${match.venue}</span>
                    <span>🪙 Toss: ${match.tossWinner} opted to ${match.tossDecision.toLowerCase()}</span>
                </div>

                <!-- Simulation Control Buttons -->
                <div class="hero-controls">
                    ${match.status === 'LIVE' ? `
                        <button class="btn-ctrl btn-primary" onclick="simulateBall('${match.id}')" title="Simulate 1 ball immediately">
                            ⚡ Next Ball
                        </button>
                        <button class="btn-ctrl" onclick="simulateOver('${match.id}')" title="Simulate 1 full over (6 balls)">
                            ⏩ Next Over
                        </button>
                        <button class="btn-ctrl" onclick="togglePause('${match.id}')" title="${match.paused ? 'Resume live simulation' : 'Pause live simulation'}">
                            ${match.paused ? '▶️ Resume' : '⏸️ Pause'}
                        </button>
                    ` : ''}
                    <button class="btn-ctrl" onclick="resetAllMatches()" title="Reset all demo matches">
                        🔄 Reset All
                    </button>
                </div>
            </div>

            <!-- Big Scores -->
            <div class="hero-scores-grid">
                <!-- Team 1 -->
                <div class="team-score-block">
                    <div class="team-title-row">
                        <span class="flag-emoji">${getTeamFlag(match.team1)}</span>
                        <span>${match.team1}</span>
                    </div>
                    <div class="team-score-display">${t1Score}</div>
                    <div class="team-overs-display">${t1Overs}</div>
                </div>

                <div class="vs-divider">
                    <span>VS</span>
                    <span style="font-size:0.75rem;font-weight:600;margin-top:0.25rem;">${match.totalOvers} Overs</span>
                </div>

                <!-- Team 2 -->
                <div class="team-score-block right">
                    <div class="team-title-row">
                        <span>${match.team2}</span>
                        <span class="flag-emoji">${getTeamFlag(match.team2)}</span>
                    </div>
                    <div class="team-score-display">${t2Score}</div>
                    <div class="team-overs-display">${t2Overs}</div>
                </div>
            </div>

            <!-- Match Status & Run Rates -->
            <div class="match-status-bar">
                <div style="display:flex;gap:1.5rem;flex-wrap:wrap;align-items:center;">
                    <div class="rate-stat">Current Run Rate: <strong>${crr}</strong></div>
                    ${targetText ? `<div class="rate-stat">${targetText}</div>` : ''}
                    ${currentInn ? `<div class="rate-stat">Extras: <strong>${currentInn.extras}</strong> (w ${currentInn.wides || 0}, nb ${currentInn.noBalls || 0})</div>` : ''}
                </div>
                ${match.result ? `<div class="match-verdict">🏆 ${match.result} ${match.manOfTheMatch ? `| MoM: ${match.manOfTheMatch}` : ''}</div>` : ''}
            </div>

            <!-- Live Batters & Bowler Widgets (Only if match has ongoing innings) -->
            ${currentInn && !currentInn.completed ? `
                <div class="hero-live-widgets">
                    <!-- Live Batters -->
                    <div class="live-widget-card">
                        <div class="widget-title">
                            <span>Batting: ${currentInn.battingTeam}</span>
                            <span>Partnership: ${calcPartnership(striker, nonStriker)}</span>
                        </div>
                        <table class="batter-table">
                            <thead>
                                <tr>
                                    <th>Batter</th>
                                    <th>R</th>
                                    <th>B</th>
                                    <th>4s</th>
                                    <th>6s</th>
                                    <th>SR</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${striker ? `
                                    <tr class="striker-row">
                                        <td><span class="striker-star">*</span> ${striker.name}</td>
                                        <td><strong>${striker.runsScored}</strong></td>
                                        <td>${striker.ballsFaced}</td>
                                        <td>${striker.fours}</td>
                                        <td>${striker.sixes}</td>
                                        <td>${striker.strikeRate.toFixed(1)}</td>
                                    </tr>
                                ` : ''}
                                ${nonStriker ? `
                                    <tr>
                                        <td>${nonStriker.name}</td>
                                        <td><strong>${nonStriker.runsScored}</strong></td>
                                        <td>${nonStriker.ballsFaced}</td>
                                        <td>${nonStriker.fours}</td>
                                        <td>${nonStriker.sixes}</td>
                                        <td>${nonStriker.strikeRate.toFixed(1)}</td>
                                    </tr>
                                ` : ''}
                            </tbody>
                        </table>
                    </div>

                    <!-- Live Bowler -->
                    <div class="live-widget-card">
                        <div class="widget-title">
                            <span>Bowling: ${currentInn.bowlingTeam}</span>
                            <span>Over ${currentInn.totalOvers}.${currentInn.totalBalls}</span>
                        </div>
                        ${activeBowler ? `
                            <table class="bowler-table">
                                <thead>
                                    <tr>
                                        <th>Bowler</th>
                                        <th>O</th>
                                        <th>M</th>
                                        <th>R</th>
                                        <th>W</th>
                                        <th>Econ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style="font-weight:600;">
                                        <td>${activeBowler.name}</td>
                                        <td>${activeBowler.oversBowled}.${currentInn.totalBalls}</td>
                                        <td>${activeBowler.maidens}</td>
                                        <td>${activeBowler.runsConceded}</td>
                                        <td style="color:var(--wicket-bg);font-weight:700;">${activeBowler.wicketsTaken}</td>
                                        <td>${activeBowler.economyRate.toFixed(1)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        ` : ''}
                        <div class="over-balls-row">
                            <span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);margin-right:0.35rem;">THIS OVER:</span>
                            ${recentBallsHtml || '<span style="font-size:0.75rem;color:var(--text-muted);">Starting over...</span>'}
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>

        <!-- Detailed Tabs Navigation -->
        <div class="tabs-navigation">
            <button class="tab-btn ${activeDetailTab === 'live' ? 'active' : ''}" onclick="switchDetailTab('live')">
                ⚡ Live Center
            </button>
            <button class="tab-btn ${activeDetailTab === 'scorecard' ? 'active' : ''}" onclick="switchDetailTab('scorecard')">
                📊 Full Scorecard
            </button>
            <button class="tab-btn ${activeDetailTab === 'commentary' ? 'active' : ''}" onclick="switchDetailTab('commentary')">
                🎙️ Ball-by-Ball Commentary
            </button>
            <button class="tab-btn ${activeDetailTab === 'squads' ? 'active' : ''}" onclick="switchDetailTab('squads')">
                👥 Playing XI & Squads
            </button>
            <button class="tab-btn ${activeDetailTab === 'summary' ? 'active' : ''}" onclick="switchDetailTab('summary')">
                📋 Match Summary & Analysis
            </button>
            <button class="tab-btn ${activeDetailTab === 'leaderboard' ? 'active' : ''}" onclick="switchDetailTab('leaderboard')">
                🏆 Tournament Leaderboard
            </button>
        </div>

        <!-- Tab Content Area -->
        <div id="tabContentArea">
            ${renderCurrentTabContent(match)}
        </div>
    `;
}

function calcPartnership(p1, p2) {
    if (!p1 && !p2) return '0 (0)';
    const runs = (p1 ? p1.runsScored : 0) + (p2 ? p2.runsScored : 0);
    const balls = (p1 ? p1.ballsFaced : 0) + (p2 ? p2.ballsFaced : 0);
    return `${runs} off ${balls} balls`;
}

// ---- Switch Detailed Tabs ----
function switchDetailTab(tabName) {
    activeDetailTab = tabName;
    const match = matchesList.find(m => m.id === activeMatchId);
    if (match) {
        // Update tabs active state
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.textContent.toLowerCase().includes(tabName));
        if (activeBtn) activeBtn.classList.add('active');

        const content = document.getElementById('tabContentArea');
        if (content) content.innerHTML = renderCurrentTabContent(match);
    }
}

// ---- Render Tab Contents ----
function renderCurrentTabContent(match) {
    switch (activeDetailTab) {
        case 'scorecard':
            return renderScorecardTab(match);
        case 'commentary':
            return renderCommentaryTab(match);
        case 'squads':
            return renderSquadsTab(match);
        case 'summary':
            return renderSummaryTab(match);
        case 'leaderboard':
            return renderLeaderboardTab();
        case 'live':
        default:
            return renderLiveCenterTab(match);
    }
}

// 1. Live Center Tab
function renderLiveCenterTab(match) {
    const currentInn = match.innings && match.innings.length > 0 ? match.innings[match.currentInnings - 1] : null;
    const recentEvents = currentInn && currentInn.ballEvents ? currentInn.ballEvents.slice(-15).reverse() : [];

    return `
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:1.5rem;">
            <!-- Left Column: Commentary Feed -->
            <div class="scorecard-section">
                <div class="scorecard-header">
                    <span>🎙️ Recent Ball-by-Ball Feed</span>
                    <button class="btn-ctrl" onclick="switchDetailTab('commentary')">View Full Commentary</button>
                </div>
                <div style="padding:1rem;">
                    <div class="commentary-list">
                        ${recentEvents.length > 0 ? recentEvents.map(renderCommentaryItem).join('') : '<p style="color:var(--text-muted);text-align:center;">Simulation in progress...</p>'}
                    </div>
                </div>
            </div>

            <!-- Right Column: Match Info & Run Distribution -->
            <div>
                <div class="scorecard-section">
                    <div class="scorecard-header">
                        <span>ℹ️ Match Details</span>
                    </div>
                    <div style="padding:1.25rem;font-size:0.875rem;">
                        <p style="margin-bottom:0.6rem;"><strong>Series:</strong> International Cricket Simulation 2026</p>
                        <p style="margin-bottom:0.6rem;"><strong>Match:</strong> ${match.team1} vs ${match.team2} (${match.matchType})</p>
                        <p style="margin-bottom:0.6rem;"><strong>Venue:</strong> ${match.venue}</p>
                        <p style="margin-bottom:0.6rem;"><strong>Toss:</strong> ${match.tossWinner} opted to ${match.tossDecision.toLowerCase()} first</p>
                        <p style="margin-bottom:0.6rem;"><strong>Umpires:</strong> ICC Elite Panel</p>
                        <p><strong>Status:</strong> ${match.status} ${match.result ? `(${match.result})` : ''}</p>
                    </div>
                </div>

                <div class="scorecard-section" style="margin-top:1.5rem;">
                    <div class="scorecard-header">
                        <span>⚡ Quick Actions</span>
                    </div>
                    <div style="padding:1.25rem;display:flex;flex-direction:column;gap:0.75rem;">
                        <button class="btn btn-primary" onclick="simulateBall('${match.id}')">⚡ Trigger Next Delivery</button>
                        <button class="btn btn-secondary" onclick="simulateOver('${match.id}')">⏩ Complete Current Over</button>
                        <button class="btn btn-secondary" onclick="togglePause('${match.id}')">${match.paused ? '▶️ Resume Auto Play' : '⏸️ Pause Auto Play'}</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 2. Full Scorecard Tab (Both Innings with Batting, Bowling, FOW)
function renderScorecardTab(match) {
    if (!match.innings || match.innings.length === 0) {
        return `<div class="empty-state"><p>No scorecard data available yet.</p></div>`;
    }

    return match.innings.map((inn, innIdx) => {
        const battingRows = inn.battingOrder
            .filter(p => p.ballsFaced > 0 || p.out || p.id === inn.currentBatsmanId || p.id === inn.nonStrikerBatsmanId)
            .map(p => {
                const isCurrent = p.id === inn.currentBatsmanId || p.id === inn.nonStrikerBatsmanId;
                const status = p.out 
                    ? `${p.dismissalType ? p.dismissalType.toLowerCase().replace('_', ' ') : 'out'} ${p.dismissedBy ? 'b ' + p.dismissedBy : ''}`
                    : (isCurrent && !inn.completed ? 'batting *' : 'not out');

                return `
                    <tr>
                        <td class="player-name-bold">${p.name} ${isCurrent && !inn.completed ? '<span class="striker-star">*</span>' : ''}</td>
                        <td class="dismissal-info">${status}</td>
                        <td class="num-cell-highlight">${p.runsScored}</td>
                        <td>${p.ballsFaced}</td>
                        <td>${p.fours}</td>
                        <td>${p.sixes}</td>
                        <td class="num-cell-highlight">${p.strikeRate.toFixed(1)}</td>
                    </tr>
                `;
            }).join('');

        const didNotBat = inn.battingOrder
            .filter(p => p.ballsFaced === 0 && !p.out && p.id !== inn.currentBatsmanId && p.id !== inn.nonStrikerBatsmanId)
            .map(p => p.name)
            .join(', ');

        const bowlingRows = inn.bowlingFigures
            .filter(p => p.oversBowled > 0 || (inn.currentBowlerId === p.id && !inn.completed))
            .map(p => `
                <tr>
                    <td class="player-name-bold">${p.name}</td>
                    <td class="num-cell-highlight">${p.oversBowled}</td>
                    <td>${p.maidens}</td>
                    <td class="num-cell-highlight">${p.runsConceded}</td>
                    <td class="num-cell-highlight" style="color:var(--wicket-bg);">${p.wicketsTaken}</td>
                    <td>${p.economyRate.toFixed(1)}</td>
                </tr>
            `).join('');

        // Fall of wickets reconstruction
        let fowHtml = '';
        if (inn.fallOfWickets && inn.fallOfWickets.length > 0) {
            fowHtml = `
                <div class="fow-container">
                    <div class="fow-title">Fall of Wickets:</div>
                    <div class="fow-list">
                        ${inn.fallOfWickets.map((score, idx) => `
                            <span class="fow-chip"><strong>${idx + 1}-${score}</strong></span>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        return `
            <div class="scorecard-section" style="margin-bottom:2rem;">
                <div class="scorecard-header">
                    <span>${inn.battingTeam} Innings</span>
                    <span><strong>${inn.totalRuns}/${inn.totalWickets}</strong> (${inn.totalOvers}.${inn.totalBalls} Ov) • RR: ${inn.currentRunRate.toFixed(2)}</span>
                </div>

                <!-- Batting Table -->
                <table class="scorecard-table">
                    <thead>
                        <tr>
                            <th>Batter</th>
                            <th>Dismissal</th>
                            <th>R</th>
                            <th>B</th>
                            <th>4s</th>
                            <th>6s</th>
                            <th>SR</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${battingRows}
                        <tr style="background:var(--bg-muted);font-weight:700;">
                            <td colspan="2">Extras: (w ${inn.wides || 0}, nb ${inn.noBalls || 0}, b ${inn.byes || 0}, lb ${inn.legByes || 0})</td>
                            <td colspan="5">${inn.extras}</td>
                        </tr>
                        <tr style="background:var(--bg-page);font-weight:800;font-size:0.95rem;">
                            <td colspan="2">TOTAL (${inn.totalOvers}.${inn.totalBalls} Overs, RR: ${inn.currentRunRate.toFixed(2)})</td>
                            <td colspan="5">${inn.totalRuns}/${inn.totalWickets}</td>
                        </tr>
                    </tbody>
                </table>

                ${didNotBat ? `
                    <div style="padding:0.6rem 1.25rem;font-size:0.8rem;color:var(--text-secondary);background:var(--bg-surface);border-top:1px solid var(--border-color);">
                        <strong>Yet to bat:</strong> ${didNotBat}
                    </div>
                ` : ''}

                ${fowHtml}

                <!-- Bowling Table -->
                <div class="scorecard-header" style="border-top:1px solid var(--border-color);margin-top:0.5rem;">
                    <span>Bowling Figures</span>
                </div>
                <table class="scorecard-table">
                    <thead>
                        <tr>
                            <th>Bowler</th>
                            <th>O</th>
                            <th>M</th>
                            <th>R</th>
                            <th>W</th>
                            <th>Econ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bowlingRows}
                    </tbody>
                </table>
            </div>
        `;
    }).join('');
}

// 3. Commentary Tab
function renderCommentaryTab(match) {
    const currentInn = match.innings && match.innings.length > 0 ? match.innings[match.currentInnings - 1] : null;
    if (!currentInn || !currentInn.ballEvents || currentInn.ballEvents.length === 0) {
        return `<div class="empty-state"><p>No commentary available yet.</p></div>`;
    }

    const events = [...currentInn.ballEvents].reverse();

    return `
        <div class="scorecard-section">
            <div class="scorecard-header">
                <span>🎙️ Live Ball-by-Ball Commentary (${currentInn.battingTeam} Innings)</span>
                <span style="font-size:0.8rem;color:var(--text-secondary);">Showing all ${events.length} deliveries</span>
            </div>
            <div style="padding:1.25rem;">
                <div class="commentary-list" id="fullCommentaryList">
                    ${events.map(renderCommentaryItem).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderCommentaryItem(e) {
    let typeClass = '';
    let badgeText = `${e.runs} run${e.runs === 1 ? '' : 's'}`;

    if (e.wicket) {
        typeClass = 'wicket';
        badgeText = 'WICKET';
    } else if (e.six) {
        typeClass = 'six';
        badgeText = 'SIX';
    } else if (e.four) {
        typeClass = 'boundary';
        badgeText = 'FOUR';
    } else if (e.runs === 0 && !e.wide && !e.noBall) {
        badgeText = 'DOT';
    }

    return `
        <div class="commentary-item ${typeClass}">
            <div class="commentary-over">${e.overNumber}.${e.ballNumber}</div>
            <div class="commentary-text">
                <div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;">
                    <strong>${e.bowlerName} to ${e.batsmanName}</strong>
                    <span class="badge-tag ${e.wicket ? 'badge-live' : 'badge-format'}">${badgeText}</span>
                </div>
                <p style="color:var(--text-secondary);font-size:0.85rem;">${e.commentary}</p>
            </div>
        </div>
    `;
}

function prependCommentaryItem(event) {
    const list = document.getElementById('fullCommentaryList');
    if (list) {
        const div = document.createElement('div');
        div.innerHTML = renderCommentaryItem(event);
        list.insertBefore(div.firstElementChild, list.firstChild);
    }
}

// 4. Squads & Playing XI Tab
function renderSquadsTab(match) {
    const renderTeamSquad = (teamName, players) => `
        <div class="scorecard-section">
            <div class="scorecard-header">
                <span>${getTeamFlag(teamName)} ${teamName} Playing XI</span>
            </div>
            <table class="scorecard-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Player Name</th>
                        <th>Role</th>
                    </tr>
                </thead>
                <tbody>
                    ${players.map((p, idx) => `
                        <tr>
                            <td style="color:var(--text-muted);width:40px;">${idx + 1}</td>
                            <td class="player-name-bold">${p.name}</td>
                            <td><span class="badge-tag badge-format">${p.role.replace('_', ' ')}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    return `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">
            ${renderTeamSquad(match.team1, match.team1Players)}
            ${renderTeamSquad(match.team2, match.team2Players)}
        </div>
    `;
}

// 5. Match Summary & Analysis Tab
function renderSummaryTab(match) {
    return `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">
            <div class="scorecard-section">
                <div class="scorecard-header">
                    <span>📋 Official Match Summary</span>
                </div>
                <div style="padding:1.5rem;font-size:0.9rem;display:flex;flex-direction:column;gap:0.75rem;">
                    <div><strong>Fixture:</strong> ${match.team1} vs ${match.team2}</div>
                    <div><strong>Format:</strong> ${match.matchType} (${match.totalOvers} Overs per side)</div>
                    <div><strong>Stadium:</strong> ${match.venue}</div>
                    <div><strong>Toss Result:</strong> ${match.tossWinner} won the toss and elected to ${match.tossDecision.toLowerCase()} first</div>
                    <div><strong>Match Status:</strong> ${match.status}</div>
                    <div><strong>Result:</strong> ${match.result || 'Match currently in progress'}</div>
                    ${match.manOfTheMatch ? `<div><strong>Player of the Match:</strong> 🌟 ${match.manOfTheMatch}</div>` : ''}
                </div>
            </div>

            <div class="scorecard-section">
                <div class="scorecard-header">
                    <span>📊 Innings Breakdown</span>
                </div>
                <div style="padding:1.5rem;display:flex;flex-direction:column;gap:1rem;">
                    ${match.innings.map(inn => `
                        <div style="background:var(--bg-muted);padding:1rem;border-radius:var(--radius-md);">
                            <div style="font-weight:700;font-size:1rem;margin-bottom:0.25rem;">${inn.battingTeam}</div>
                            <div style="font-size:1.4rem;font-family:var(--font-mono);font-weight:800;color:var(--primary);">
                                ${inn.totalRuns}/${inn.totalWickets} <span style="font-size:0.9rem;color:var(--text-secondary);font-weight:600;">(${inn.totalOvers}.${inn.totalBalls} ov)</span>
                            </div>
                            <div style="font-size:0.85rem;color:var(--text-secondary);margin-top:0.25rem;">
                                Run Rate: <strong>${inn.currentRunRate.toFixed(2)}</strong> | Extras: <strong>${inn.extras}</strong>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// 6. Tournament Leaderboard Tab
async function renderLeaderboardTab() {
    try {
        const data = await API.getLeaderboard();
        const topBatters = data.topBatters || [];
        const topBowlers = data.topBowlers || [];

        const content = document.getElementById('tabContentArea');
        if (!content) return;

        content.innerHTML = `
            <div class="leaderboard-grid">
                <!-- Top Run Scorers -->
                <div class="leaderboard-card">
                    <div class="leaderboard-header">
                        <span>🏏 Most Runs (Orange Cap)</span>
                        <span style="font-size:0.75rem;color:var(--text-muted);">Tournament</span>
                    </div>
                    <table class="scorecard-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Batter</th>
                                <th>Runs</th>
                                <th>Balls</th>
                                <th>SR</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${topBatters.map((p, idx) => `
                                <tr>
                                    <td style="color:var(--text-muted);width:30px;">${idx + 1}</td>
                                    <td class="player-name-bold">${p.name} <span style="font-size:0.75rem;color:var(--text-muted);">(${p.team})</span></td>
                                    <td class="num-cell-highlight" style="color:var(--primary);">${p.runsScored}</td>
                                    <td>${p.ballsFaced}</td>
                                    <td>${p.strikeRate.toFixed(1)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Top Wicket Takers -->
                <div class="leaderboard-card">
                    <div class="leaderboard-header">
                        <span>🎯 Most Wickets (Purple Cap)</span>
                        <span style="font-size:0.75rem;color:var(--text-muted);">Tournament</span>
                    </div>
                    <table class="scorecard-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Bowler</th>
                                <th>Wkts</th>
                                <th>Overs</th>
                                <th>Econ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${topBowlers.map((p, idx) => `
                                <tr>
                                    <td style="color:var(--text-muted);width:30px;">${idx + 1}</td>
                                    <td class="player-name-bold">${p.name} <span style="font-size:0.75rem;color:var(--text-muted);">(${p.team})</span></td>
                                    <td class="num-cell-highlight" style="color:var(--wicket-bg);">${p.wicketsTaken}</td>
                                    <td>${p.oversBowled}</td>
                                    <td>${p.economyRate.toFixed(1)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (e) {
        console.error('Failed to load leaderboard:', e);
    }
}

// ---- Simulation Actions ----
async function simulateBall(matchId) {
    try {
        const updated = await API.simulateBall(matchId);
        renderActiveMatch(updated);
    } catch (e) {
        console.error(e);
    }
}

async function simulateOver(matchId) {
    try {
        const updated = await API.simulateOver(matchId);
        renderActiveMatch(updated);
    } catch (e) {
        console.error(e);
    }
}

async function togglePause(matchId) {
    try {
        const updated = await API.togglePause(matchId);
        renderActiveMatch(updated);
    } catch (e) {
        console.error(e);
    }
}

async function resetAllMatches() {
    if (!confirm('Reset all demo matches back to start?')) return;
    try {
        await API.resetMatches();
        await loadMatches();
    } catch (e) {
        console.error(e);
    }
}

// ---- Create Match View ----
function showCreateMatchModal() {
    const container = document.getElementById('activeMatchContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="form-card">
            <h2 style="font-size:1.4rem;font-weight:800;margin-bottom:0.5rem;color:var(--text-primary);">Create New Match</h2>
            <p style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:1.5rem;">Configure and simulate a brand new live cricket match.</p>

            <form onsubmit="handleCreateMatch(event)">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Team 1</label>
                        <select class="form-select" id="newTeam1" required>
                            <option value="India">🇮🇳 India</option>
                            <option value="Australia">🇦🇺 Australia</option>
                            <option value="England">🏴󠁧󠁢󠁥󠁮󠁧󠁿 England</option>
                            <option value="South Africa">🇿🇦 South Africa</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Team 2</label>
                        <select class="form-select" id="newTeam2" required>
                            <option value="Australia">🇦🇺 Australia</option>
                            <option value="India">🇮🇳 India</option>
                            <option value="England">🏴󠁧󠁢󠁥󠁮󠁧󠁿 England</option>
                            <option value="South Africa">🇿🇦 South Africa</option>
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Match Format</label>
                        <select class="form-select" id="newMatchType" required>
                            <option value="T20">T20 (20 Overs)</option>
                            <option value="ODI">ODI (50 Overs)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Stadium / Venue</label>
                        <input type="text" class="form-input" id="newVenue" value="Wankhede Stadium, Mumbai" required>
                    </div>
                </div>

                <div style="display:flex;gap:1rem;margin-top:1rem;">
                    <button type="submit" class="btn btn-primary" style="flex:1;">🏏 Start Match Simulation</button>
                    <button type="button" class="btn btn-secondary" onclick="loadMatches()">Cancel</button>
                </div>
            </form>
        </div>
    `;
}

async function handleCreateMatch(e) {
    e.preventDefault();
    const team1 = document.getElementById('newTeam1').value;
    const team2 = document.getElementById('newTeam2').value;
    const matchType = document.getElementById('newMatchType').value;
    const venue = document.getElementById('newVenue').value;

    if (team1 === team2) {
        alert('Please select two different teams.');
        return;
    }

    try {
        const newMatch = await API.createMatch({ team1, team2, matchType, venue });
        await loadMatches();
        selectMatch(newMatch.id);
    } catch (err) {
        alert('Error creating match: ' + err.message);
    }
}

function renderEmptyState() {
    const container = document.getElementById('activeMatchContainer');
    if (!container) return;
    container.innerHTML = `
        <div class="empty-state">
            <h3>No matches found</h3>
            <p>Create a new match or reset to start live simulations.</p>
            <button class="btn btn-primary" style="margin-top:1rem;" onclick="showCreateMatchModal()">+ Create Match</button>
        </div>
    `;
}
