/**
 * results.js — Match results + scorers table
 * Data sources: results.json (playerId refs) + roster.json (player details)
 */

document.addEventListener('DOMContentLoaded', initResults);

// ─── State ───────────────────────────────────────────────────────────────────
let roster = {};   // roster.players map, keyed by id

// ─── Bootstrap ───────────────────────────────────────────────────────────────
function initResults() {
    Promise.all([
        fetch('./data/results.json').then(r => r.json()),
        fetch('./data/roster.json').then(r => r.json())
    ])
    .then(([resultsData, rosterData]) => {
        roster = rosterData.players || {};
        window.matchResults = resultsData.matches;
        renderResults(resultsData.matches);
        renderScorersTable(resultsData.matches);
    })
    .catch(err => console.error('[Results] Error cargando datos:', err));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Direct O(1) lookup by playerId — no fuzzy matching needed */
const getPlayer = (playerId) => roster[playerId] || null;

/** "Juan (SENA)" → badge + name, plus vet tag if applicable */
function playerTag(playerId) {
    const p = getPlayer(playerId);
    if (!p) return `Jugador #${playerId}`;
    const vet = p.veteran ? ' <span class="vet-badge">VET</span>' : '';
    return `${p.name}${vet}`;
}

/** Build inline scorer chips for match details */
function buildScorerChips(scorers) {
    if (!scorers?.length) return '';
    const chips = scorers.map(s => {
        const p = getPlayer(s.playerId);
        const name = p ? p.name : `#${s.playerId}`;
        const balls = '⚽'.repeat(s.goals);
        return `<span class="scorer-chip">${balls} ${name} (${s.goals})</span>`;
    }).join('');
    return `<div class="match-scorers-inline">
                <span class="detail-title">Goleadores:</span>
                <div class="scorer-chips">${chips}</div>
            </div>`;
}

/** Lightweight confetti within a card */
function spawnConfetti(card) {
    const layer = card.querySelector('.confetti-layer');
    if (!layer || layer.dataset.fired) return;
    layer.dataset.fired = '1';
    const colors = ['#22c55e','#facc15','#3b82f6','#f43f5e','#a855f7','#fb923c'];
    for (let i = 0; i < 24; i++) {
        const dot = document.createElement('span');
        dot.className = 'confetti-dot';
        dot.style.cssText = `left:${Math.random()*100}%;background:${colors[i%colors.length]};
            animation-delay:${(Math.random()*1).toFixed(2)}s;
            width:${6+Math.random()*6}px;height:${6+Math.random()*6}px;`;
        layer.appendChild(dot);
    }
}

// ─── Render: Match Cards ──────────────────────────────────────────────────────
function renderResults(matches) {
    const grid = document.getElementById('results-grid');
    if (!grid) return;
    grid.innerHTML = '';

    matches.forEach(match => {
        const isWin  = match.homeScore > match.awayScore;
        const isDraw = match.homeScore === match.awayScore;
        const resultClass = isWin ? 'match-win' : isDraw ? 'match-draw' : 'match-loss';
        const badge = isWin
            ? '<span class="result-badge win-badge">Victoria</span>'
            : isDraw
                ? '<span class="result-badge draw-badge">Empate</span>'
                : '<span class="result-badge loss-badge">Derrota</span>';

        const card = document.createElement('div');
        card.className = `match-card ${resultClass}`;

        card.innerHTML = `
            <div class="match-header">
                <div class="match-top-row">
                    <span class="match-date">${formatDate(match.date)}</span>
                    ${badge}
                </div>
                <div class="scoreboard">
                    <span class="team">${match.homeTeam}</span>
                    <span class="score${isWin?' score-win':''}">${match.homeScore}</span>
                    <span class="vs">VS</span>
                    <span class="score${(!isWin&&!isDraw)?' score-loss':''}">${match.awayScore}</span>
                    <span class="team">${match.awayTeam}</span>
                </div>
                <span class="match-status">${match.status}</span>
            </div>
            <div class="match-details">
                ${buildScorerChips(match.scorers)}
                <div class="detail-section">
                    <span class="detail-title">Fortalezas:</span>
                    <div class="detail-items">
                        ${(match.strengths||[]).map(s => `<div class="detail-item strength-item">${s}</div>`).join('')}
                    </div>
                </div>
                <div class="detail-section">
                    <span class="detail-title">Aspectos a Mejorar:</span>
                    <div class="detail-items">
                        ${(match.improvements||[]).map(i => `<div class="detail-item improvement-item">${i}</div>`).join('')}
                    </div>
                </div>
            </div>
            <div class="details-toggle">
                <span class="toggle-text">Ver detalles</span>
                <i class="fas fa-chevron-down toggle-icon"></i>
            </div>
            ${isWin ? '<div class="confetti-layer" aria-hidden="true"></div>' : ''}
        `;

        // Confetti fires on render, not on click
        if (isWin) requestAnimationFrame(() => spawnConfetti(card));

        card.onclick = () => {
            const expanded = card.classList.contains('expanded');
            // Close all other open cards
            document.querySelectorAll('.match-card.expanded').forEach(c => {
                if (c !== card) {
                    c.classList.remove('expanded');
                    c.querySelector('.toggle-text').textContent = 'Ver detalles';
                }
            });
            // Toggle this one
            card.classList.toggle('expanded', !expanded);
            card.querySelector('.toggle-text').textContent = expanded ? 'Ver detalles' : 'Ocultar';
        };

        grid.appendChild(card);
    });
}

// ─── Render: Scorers Table ────────────────────────────────────────────────────
function renderScorersTable(matches) {
    const section = document.getElementById('scorers-section');
    if (!section) return;

    // Aggregate goals by playerId
    const totals = {};
    matches.forEach(m => {
        (m.scorers || []).forEach(({ playerId, goals }) => {
            totals[playerId] = (totals[playerId] || 0) + goals;
        });
    });

    if (!Object.keys(totals).length) { section.style.display = 'none'; return; }

    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const medals = ['🥇','🥈','🥉'];

    const rows = sorted.map(([id, goals], i) => {
        const p = getPlayer(id);
        const name    = p ? p.name : `#${id}`;
        const number  = p ? `#${p.number}` : '';
        const rating  = p ? `⭐ ${p.rating}` : '';
        const vet     = p?.veteran ? '<span class="vet-badge">VET</span>' : '';
        const medal   = medals[i] || `${i+1}.`;
        const balls   = '⚽'.repeat(goals);
        const top     = i === 0 ? ' data-rank="0"' : '';
        return `
        <div class="scorer-row"${top}>
            <div class="scorer-left">
                <span class="scorer-medal">${medal}</span>
                <div class="scorer-info">
                    <span class="scorer-fullname">${name} ${vet}</span>
                    <span class="scorer-meta">${number}${rating ? ' · '+rating : ''}</span>
                </div>
            </div>
            <div class="scorer-right">
                <span class="scorer-balls">${balls}</span>
                <span class="scorer-count">${goals} ${goals===1?'gol':'goles'}</span>
            </div>
        </div>`;
    }).join('');

    section.innerHTML = `
        <div class="scorers-header">
            <i class="fas fa-futbol spin-ball"></i>
            <span>Tabla de Goleadores</span>
        </div>
        <div class="scorers-list">${rows}</div>
    `;
    section.style.display = 'block';
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}
