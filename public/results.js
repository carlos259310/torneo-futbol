document.addEventListener('DOMContentLoaded', initResults);

function initResults() {
    if (window.matchResults && window.matchResults.length > 0) {
        renderResults(window.matchResults);
        return;
    }

    fetch('./data/results.json')
        .then(response => response.json())
        .then(data => {
            window.matchResults = data.matches;
            renderResults(data.matches);
        })
        .catch(err => {
            console.error('Error cargando resultados:', err);
            // Fallback match if fetch fails
            renderResults([
                {
                    "id": 1,
                    "date": "2026-02-08",
                    "homeTeam": "Tránsito de Girón",
                    "awayTeam": "Auto Aprender",
                    "homeScore": 1,
                    "awayScore": 2,
                    "status": "Finalizado",
                    "strengths": ["Buen control del medio campo", "Comunicación constante"],
                    "improvements": ["Falta de contundencia", "Repliegue defensivo lento"]
                }
            ]);
        });
}

function renderResults(matches) {
    const grid = document.getElementById('results-grid');
    if (!grid) return;
    grid.innerHTML = '';

    matches.forEach(match => {
        const card = document.createElement('div');
        card.className = 'match-card';
        
        card.innerHTML = `
            <div class="match-header">
                <span class="match-date">${new Date(match.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                <div class="scoreboard">
                    <span class="team">${match.homeTeam}</span>
                    <span class="score">${match.homeScore}</span>
                    <span class="vs">VS</span>
                    <span class="score">${match.awayScore}</span>
                    <span class="team">${match.awayTeam}</span>
                </div>
                <span class="match-status">${match.status}</span>
            </div>
            <div class="match-details">
                <div class="detail-section">
                    <span class="detail-title">Fortalezas:</span>
                    <div class="detail-items">
                        ${match.strengths.map(s => `<div class="detail-item strength-item">${s}</div>`).join('')}
                    </div>
                </div>
                <div class="detail-section">
                    <span class="detail-title">Aspectos a Mejorar:</span>
                    <div class="detail-items">
                        ${match.improvements.map(i => `<div class="detail-item improvement-item">${i}</div>`).join('')}
                    </div>
                </div>
            </div>
            <div class="details-toggle">
                <span class="toggle-text">Ver detalles</span>
                <i class="fas fa-chevron-down toggle-icon"></i>
            </div>
        `;

        // Initialize globally if not exists
        if (typeof activeResultsCard === 'undefined') window.activeResultsCard = null;

        card.onclick = () => {
            // Close all other cards
            document.querySelectorAll('.match-card').forEach(c => {
                if (c !== card) {
                    c.classList.remove('expanded');
                    const txt = c.querySelector('.toggle-text');
                    if (txt) txt.textContent = 'Ver detalles';
                }
            });

            const isExpanded = card.classList.toggle('expanded');
            const toggleText = card.querySelector('.toggle-text');
            
            if (isExpanded) {
                if (toggleText) toggleText.textContent = 'Ocultar';
            } else {
                if (toggleText) toggleText.textContent = 'Ver detalles';
            }
        };

        grid.appendChild(card);
    });
}
