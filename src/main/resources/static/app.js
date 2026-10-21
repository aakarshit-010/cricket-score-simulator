/* ==========================================
   CricLive — Frontend Application Logic
   ========================================== */

// ---- State ----
let stompClient = null;
let matches = [];
let currentMatchId = null;
let currentDetailTab = 'batting';
let currentDetailInnings = 0; // 0 = current/latest
let toastTimeout = null;

// ---- WebSocket Connection ----
function connectWebSocket() {
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.debug = null; // disable debug logging

    stompClient.connect({}, function (frame) {
        updateConnectionStatus(true);

        // Subscribe to all matches updates
        stompClient.subscribe('/topic/matches', function (message) {
            matches = JSON.parse(message.body);
            renderDashboard();
            renderAllMatches();
        });

        // Initial fetch
        fetchAllMatches();
    }, function (error) {
        updateConnectionStatus(false);
        // Reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
    });
}

function subscribeToMatch(matchId) {
    if (!stompClient || !stompClient.connected) return;

    stompClient.subscribe('/topic/match/' + matchId, function (message) {
        const match = JSON.parse(message.body);
        // Update local state
        const idx = matches.findIndex(m => m.id === match.id);
        if (idx >= 0) matches[idx] = match;
        else matches.push(match);

        if (currentMatchId === matchId) {
            renderMatchDetail(match);
        }
        renderDashboard();
    });

    stompClient.subscribe('/topic/ball/' + matchId, function (message) {
        const event = JSON.parse(message.body);
        if (currentMatchId === matchId) {
            showCommentaryToast(event);
        }
    });
}

function updateConnectionStatus(connected) {
    const indicator = document.getElementById('wsStatus');
    const text = document.getElementById('wsStatusText');
    if (connected) {
        indicator.classList.add('connected');
        text.textContent = 'Live';
    } else {
        indicator.classList.remove('connected');
        text.textContent = 'Reconnecting...';
    }
}

// ---- API Calls ----
async function fetchAllMatches() {
    try {
        const res = await fetch('/api/matches');
        matches = await res.json();
        renderDashboard();
        renderAllMatches();
        // Subscribe to each match
        matches.forEach(m => subscribeToMatch(m.id));
    } catch (e) {
        console.error('Failed to fetch matches:', e);
    }
}

async function createMatch(event) {
    event.preventDefault();
    const team1 = document.getElementById('team1Select').value;
    const team2 = document.getElementById('team2Select').value;
    const venue = document.getElementById('venueInput').value;
    const matchType = document.getElementById('matchTypeSelect').value;

    if (team1 === team2) {
        alert('Please select different teams!');
        return;
    }

    try {
        const res = await fetch('/api/matches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ team1, team2, venue, matchType })
        });
        const match = await res.json();
        subscribeToMatch(match.id);
        switchView('dashboard');
    } catch (e) {
        console.error('Failed to create match:', e);
    }
}

async function deleteMatch(matchId, event) {
    event.stopPropagation();
    if (!confirm('Delete this match?')) return;
    try {
        await fetch('/api/matches/' + matchId, { method: 'DELETE' });
        fetchAllMatches();
    } catch (e) {
        console.error('Failed to delete match:', e);
    }
}

// ---- View Management ----
function switchView(viewName) {
    // Deactivate all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    switch (viewName) {
        case 'dashboard':
            document.getElementById('dashboardView').classList.add('active');
            document.getElementById('navDashboard').classList.add('active');
            currentMatchId = null;
            break;
        case 'matches':
            document.getElementById('matchesView').classList.add('active');
            document.getElementById('navMatches').classList.add('active');
            renderAllMatches();
            break;
        case 'create':
            document.getElementById('createView').classList.add('active');
            document.getElementById('navCreate').classList.add('active');
            break;
        case 'matchDetail':
            document.getElementById('matchDetailView').classList.add('active');
            break;
    }
}

function openMatchDetail(matchId) {
    currentMatchId = matchId;
    currentDetailInnings = 0;
    switchView('matchDetail');

    const match = matches.find(m => m.id === matchId);
    if (match) {
        renderMatchDetail(match);
        subscribeToMatch(matchId);
    }
}

// ---- Rendering ----
function renderDashboard() {
    const liveMatches = matches.filter(m => m.status === 'LIVE');
    const completedMatches = matches.filter(m => m.status === 'COMPLETED');

    // Update stats
    document.getElementById('liveCount').textContent = liveMatches.length;
    document.getElementById('completedCount').textContent = completedMatches.length;
    document.getElementById('totalCount').textContent = matches.length;

    // Render live matches
    const liveGrid = document.getElementById('liveMatchesGrid');
    const noLive = document.getElementById('noLiveMatches');

    if (liveMatches.length === 0) {
        liveGrid.innerHTML = '';
        liveGrid.appendChild(noLive);
        noLive.style.display = 'block';
    } else {
        liveGrid.innerHTML = liveMatches.map(m => renderMatchCard(m, true)).join('');
    }

    // Render completed matches
    const completedGrid = document.getElementById('completedMatchesGrid');
    const noCompleted = document.getElementById('noCompletedMatches');

    if (completedMatches.length === 0) {
        completedGrid.innerHTML = '';
        completedGrid.appendChild(noCompleted);
        noCompleted.style.display = 'block';
    } else {
        completedGrid.innerHTML = completedMatches.map(m => renderMatchCard(m, false)).join('');
    }
}

function renderMatchCard(match, isLive) {
    const currentInnings = match.innings && match.innings.length > 0
        ? match.innings[match.currentInnings - 1] || match.innings[match.innings.length - 1]
        : null;

    let team1Score = '—';
    let team2Score = '—';
    let team1Overs = '';
    let team2Overs = '';
    let battingTeam = '';
    let recentBalls = [];
    let crr = 0;
    let rrr = 0;
    let target = 0;

    if (match.innings && match.innings.length > 0) {
        const inn1 = match.innings[0];
        const inn1Team = inn1.battingTeam;
        const inn1Score = `${inn1.totalRuns}/${inn1.totalWickets}`;
        const inn1Overs = `(${inn1.overDisplay || inn1.totalOvers + '.' + inn1.totalBalls})`;

        if (inn1Team === match.team1) {
            team1Score = inn1Score;
            team1Overs = inn1Overs;
        } else {
            team2Score = inn1Score;
            team2Overs = inn1Overs;
        }

        if (match.innings.length > 1) {
            const inn2 = match.innings[1];
            const inn2Team = inn2.battingTeam;
            const inn2Score = `${inn2.totalRuns}/${inn2.totalWickets}`;
            const inn2Overs = `(${inn2.overDisplay || inn2.totalOvers + '.' + inn2.totalBalls})`;

            if (inn2Team === match.team1) {
                team1Score = inn2Score;
                team1Overs = inn2Overs;
            } else {
                team2Score = inn2Score;
                team2Overs = inn2Overs;
            }
        }

        if (currentInnings) {
            battingTeam = currentInnings.battingTeam;
            recentBalls = currentInnings.recentBalls || [];
            crr = currentInnings.currentRunRate || 0;
            rrr = currentInnings.requiredRunRate || 0;
            target = currentInnings.target || 0;
        }
    }

    const statusBadge = isLive
        ? `<span class="match-badge badge-live"><span class="pulse-dot"></span>LIVE</span>`
        : `<span class="match-badge badge-completed">COMPLETED</span>`;

    const typeBadge = match.matchType === 'T20'
        ? `<span class="match-badge badge-t20">T20</span>`
        : `<span class="match-badge badge-odi">ODI</span>`;

    const recentBallsHtml = recentBalls.slice(-8).map(b => {
        let cls = '';
        if (b === 'W') cls = 'wicket';
        else if (b === '4') cls = 'four';
        else if (b === '6') cls = 'six';
        else if (b === '0') cls = 'dot';
        else if (b === 'WD' || b === 'NB') cls = 'extra';
        return `<span class="ball-chip ${cls}">${b}</span>`;
    }).join('');

    const team1Batting = battingTeam === match.team1;
    const team2Batting = battingTeam === match.team2;

    let footerHtml = '';
    if (isLive) {
        footerHtml = `
            <div class="match-footer">
                <div class="match-crr">CRR: <span>${crr.toFixed(2)}</span></div>
                ${target > 0 ? `<div class="match-crr">Need: <span>${target - (currentInnings ? currentInnings.totalRuns : 0)}</span> | RRR: <span>${rrr.toFixed(2)}</span></div>` : ''}
            </div>`;
    } else {
        footerHtml = `
            <div class="match-footer">
                <div class="match-result">${match.result || ''}</div>
                ${match.manOfTheMatch ? `<div class="match-crr">MoM: <span>${match.manOfTheMatch}</span></div>` : ''}
            </div>`;
    }

    return `
        <div class="match-card ${isLive ? 'live-card' : ''} card-enter" onclick="openMatchDetail('${match.id}')">
            <div class="match-card-header">
                <div style="display:flex;gap:0.5rem;">${statusBadge}${typeBadge}</div>
                <span class="match-venue">${match.venue}</span>
            </div>
            <div class="match-teams">
                <div class="team-row ${team1Batting ? 'batting' : ''}">
                    <div class="team-name">
                        ${team1Batting ? '<span class="batting-indicator"></span>' : ''}
                        ${match.team1}
                    </div>
                    <div>
                        <span class="team-score">${team1Score}</span>
                        <span class="team-overs">${team1Overs}</span>
                    </div>
                </div>
                <div class="team-row ${team2Batting ? 'batting' : ''}">
                    <div class="team-name">
                        ${team2Batting ? '<span class="batting-indicator"></span>' : ''}
                        ${match.team2}
                    </div>
                    <div>
                        <span class="team-score">${team2Score}</span>
                        <span class="team-overs">${team2Overs}</span>
                    </div>
                </div>
            </div>
            ${recentBallsHtml ? `<div class="recent-balls">${recentBallsHtml}</div>` : ''}
            ${footerHtml}
        </div>
    `;
}

function renderAllMatches() {
    const list = document.getElementById('allMatchesList');
    if (matches.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>No matches found</p></div>';
        return;
    }

    list.innerHTML = matches.map(m => {
        const statusBadge = m.status === 'LIVE'
            ? `<span class="match-badge badge-live"><span class="pulse-dot"></span>LIVE</span>`
            : `<span class="match-badge badge-completed">COMPLETED</span>`;

        const typeBadge = m.matchType === 'T20'
            ? `<span class="match-badge badge-t20">T20</span>`
            : `<span class="match-badge badge-odi">ODI</span>`;

        return `
            <div class="match-list-item" onclick="openMatchDetail('${m.id}')">
                <div style="display:flex;gap:0.5rem;">${statusBadge}${typeBadge}</div>
                <div class="match-list-teams">${m.team1} vs ${m.team2}</div>
                <div class="match-list-score">${m.scoreSummary || ''}</div>
                <div class="match-list-status">
                    <button class="btn btn-delete" onclick="deleteMatch('${m.id}', event)">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderMatchDetail(match) {
    const container = document.getElementById('matchDetailContent');
    if (!match || !match.innings || match.innings.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Match data not available</p></div>';
        return;
    }

    const displayInningsIndex = currentDetailInnings < match.innings.length
        ? currentDetailInnings
        : match.innings.length - 1;
    const innings = match.innings[displayInningsIndex];

    // Build scoreboard
    let scoreboardHtml = `
        <div class="detail-scoreboard">
            <div class="detail-match-info">
                <div class="detail-match-title">${match.team1} vs ${match.team2}</div>
                <div class="detail-match-meta">${match.matchType} • ${match.venue} • Toss: ${match.tossWinner} (${match.tossDecision})</div>
            </div>
            <div class="detail-scores">
                <div class="detail-team">
                    <div class="detail-team-name">${match.team1}</div>
                    <div class="detail-team-score">${getTeamScore(match, match.team1)}</div>
                    <div class="detail-team-overs">${getTeamOvers(match, match.team1)}</div>
                </div>
                <div class="detail-vs">VS</div>
                <div class="detail-team">
                    <div class="detail-team-name">${match.team2}</div>
                    <div class="detail-team-score">${getTeamScore(match, match.team2)}</div>
                    <div class="detail-team-overs">${getTeamOvers(match, match.team2)}</div>
                </div>
            </div>
            ${match.result ? `<div class="detail-result-bar">${match.result}${match.manOfTheMatch ? ` | Player of the Match: ${match.manOfTheMatch}` : ''}</div>` : ''}
            ${innings.target > 0 && !innings.completed ? `
                <div class="target-info">
                    Target: <span>${innings.target}</span> |
                    Need: <span>${innings.target - innings.totalRuns}</span> from <span>${remainingBalls(match, innings)}</span> balls |
                    RRR: <span>${innings.requiredRunRate ? innings.requiredRunRate.toFixed(2) : '0.00'}</span>
                </div>` : ''}
            <div class="run-rate-row">
                <div class="rate-item">Run Rate: <strong>${innings.currentRunRate ? innings.currentRunRate.toFixed(2) : '0.00'}</strong></div>
                <div class="rate-item">Extras: <strong>${innings.extras || 0}</strong> (wd ${innings.wides || 0}, nb ${innings.noBalls || 0})</div>
            </div>
        </div>
    `;

    // Innings tabs
    let inningsTabsHtml = `<div class="innings-tabs">`;
    match.innings.forEach((inn, idx) => {
        const active = idx === displayInningsIndex ? 'active' : '';
        inningsTabsHtml += `<button class="innings-tab ${active}" onclick="switchInningsTab(${idx})">${inn.battingTeam} Innings</button>`;
    });
    inningsTabsHtml += `</div>`;

    // Batting table
    const battingRows = innings.battingOrder
        .filter(p => p.ballsFaced > 0 || p.id === innings.currentBatsmanId || p.id === innings.nonStrikerBatsmanId)
        .map(p => {
            const isCurrentBatsman = p.id === innings.currentBatsmanId || p.id === innings.nonStrikerBatsmanId;
            const statusClass = p.out ? 'player-dismissed' : (isCurrentBatsman && !innings.completed ? 'player-not-out' : '');
            const status = p.out ? (p.dismissalType || 'out') : (isCurrentBatsman && !innings.completed ? 'batting *' : 'not out');
            const dismissal = p.out ? `${p.dismissalType ? p.dismissalType.toLowerCase().replace('_', ' ') : ''} ${p.dismissedBy ? 'b ' + p.dismissedBy : ''}` : status;

            return `
                <tr>
                    <td class="player-name">${p.name}</td>
                    <td class="${statusClass}" style="font-size:0.75rem;">${dismissal}</td>
                    <td class="highlight-cell">${p.runsScored}</td>
                    <td>${p.ballsFaced}</td>
                    <td>${p.fours}</td>
                    <td>${p.sixes}</td>
                    <td class="highlight-cell">${p.strikeRate ? p.strikeRate.toFixed(1) : '0.0'}</td>
                </tr>
            `;
        }).join('');

    // Bowling table
    const bowlingRows = innings.bowlingFigures
        .filter(p => p.oversBowled > 0)
        .map(p => `
            <tr>
                <td class="player-name">${p.name}</td>
                <td class="highlight-cell">${p.oversBowled}</td>
                <td>${p.maidens}</td>
                <td class="highlight-cell">${p.runsConceded}</td>
                <td class="highlight-cell" style="color: var(--wicket-color); font-weight:700;">${p.wicketsTaken}</td>
                <td>${p.economyRate ? p.economyRate.toFixed(1) : '0.0'}</td>
            </tr>
        `).join('');

    // Commentary (last 30 events)
    const events = innings.ballEvents ? innings.ballEvents.slice(-30).reverse() : [];
    const commentaryHtml = events.map(e => {
        let textClass = '';
        if (e.wicket) textClass = 'wicket-event';
        else if (e.six) textClass = 'six-event';
        else if (e.four) textClass = 'boundary-event';

        const overDisplay = `${e.overNumber}.${e.ballNumber}`;
        return `
            <div class="commentary-item">
                <span class="commentary-over">${overDisplay}</span>
                <span class="commentary-text ${textClass}">${e.commentary || ''}</span>
            </div>
        `;
    }).join('');

    // Recent balls
    const recentBalls = innings.recentBalls || [];
    const recentBallsHtml = recentBalls.slice(-12).map(b => {
        let cls = '';
        if (b === 'W') cls = 'wicket';
        else if (b === '4') cls = 'four';
        else if (b === '6') cls = 'six';
        else if (b === '0') cls = 'dot';
        else if (b === 'WD' || b === 'NB') cls = 'extra';
        return `<span class="ball-chip ${cls}">${b}</span>`;
    }).join('');

    container.innerHTML = `
        ${scoreboardHtml}
        ${recentBallsHtml ? `<div class="recent-balls" style="margin-bottom:1.5rem;">${recentBallsHtml}</div>` : ''}
        ${inningsTabsHtml}
        <div class="stats-table-wrapper">
            <div class="stats-table-header">🏏 Batting — ${innings.battingTeam}</div>
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>Batter</th>
                        <th>Status</th>
                        <th>R</th>
                        <th>B</th>
                        <th>4s</th>
                        <th>6s</th>
                        <th>SR</th>
                    </tr>
                </thead>
                <tbody>
                    ${battingRows || '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);">No batting data yet</td></tr>'}
                </tbody>
            </table>
        </div>
        <div class="stats-table-wrapper">
            <div class="stats-table-header">🎳 Bowling — ${innings.bowlingTeam}</div>
            <table class="stats-table">
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
                    ${bowlingRows || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No bowling data yet</td></tr>'}
                </tbody>
            </table>
        </div>
        <div class="commentary-section">
            <div class="commentary-header">💬 Live Commentary</div>
            <div class="commentary-list">
                ${commentaryHtml || '<div class="commentary-item"><span class="commentary-text">Awaiting play...</span></div>'}
            </div>
        </div>
    `;
}

function switchInningsTab(idx) {
    currentDetailInnings = idx;
    const match = matches.find(m => m.id === currentMatchId);
    if (match) renderMatchDetail(match);
}

// ---- Helpers ----
function getTeamScore(match, teamName) {
    for (let i = match.innings.length - 1; i >= 0; i--) {
        if (match.innings[i].battingTeam === teamName) {
            const inn = match.innings[i];
            return `${inn.totalRuns}/${inn.totalWickets}`;
        }
    }
    return '—';
}

function getTeamOvers(match, teamName) {
    for (let i = match.innings.length - 1; i >= 0; i--) {
        if (match.innings[i].battingTeam === teamName) {
            const inn = match.innings[i];
            return `(${inn.overDisplay || inn.totalOvers + '.' + inn.totalBalls} ov)`;
        }
    }
    return '';
}

function remainingBalls(match, innings) {
    const totalBallsInMatch = match.totalOvers * 6;
    const ballsPlayed = innings.totalOvers * 6 + innings.totalBalls;
    return totalBallsInMatch - ballsPlayed;
}

// ---- Toast ----
function showCommentaryToast(event) {
    const toast = document.getElementById('commentaryToast');
    const content = document.getElementById('toastContent');

    let icon = '🏏';
    if (event.wicket) icon = '🔴';
    else if (event.six) icon = '💥';
    else if (event.four) icon = '🟢';
    else if (event.wide) icon = '⚠️';
    else if (event.noBall) icon = '⚠️';

    content.innerHTML = `${icon} ${event.commentary || 'Ball delivered'}`;
    toast.classList.add('show');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 2800);
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', function () {
    connectWebSocket();
    fetchAllMatches();
});
