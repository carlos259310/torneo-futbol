// Global variables
let rosterData = null;
let currentLineup = [];
let initialLineup = [];

// Initialize roster on page load
async function initRoster() {
    try {
        const res = await fetch('data/roster.json');
        if (!res.ok) throw new Error('No se pudo cargar roster.json');
        rosterData = await res.json();

        // Render all sections
        renderPositionLists();
        renderFullRoster();
        renderDT();
        renderCaptains();
        renderField();
        
        // Highlight veterans
        highlightVeterans();
    } catch (err) {
        console.error('Error inicializando roster:', err);
        showNotification('Error al cargar los datos del equipo', 'error');
    }
}

// Render position lists (porteros, defensas, medio, delanteros)
function renderPositionLists() {
    document.querySelectorAll('.players-list').forEach(container => {
        const pos = container.getAttribute('data-position');
        if (pos) renderPositionList(pos, container);
    });
}

function renderPositionList(positionKey, container) {
    const posList = (rosterData.positions && rosterData.positions[positionKey]) || rosterData[positionKey] || [];
    container.innerHTML = '';
    
    posList.forEach(entry => {
        const playerRef = entry.id ? (rosterData.players && rosterData.players[entry.id]) : entry;
        if (!playerRef) return;
        
        const item = document.createElement('div');
        item.className = 'player-item ' + (entry.priority || playerRef.priority || '');

        const info = document.createElement('div');
        info.className = 'player-info';

        const name = document.createElement('span');
        name.className = 'player-name' + (playerRef.veteran ? ' veteran' : '');
        name.textContent = playerRef.name;

        const number = document.createElement('span');
        number.className = 'player-number';
        number.textContent = playerRef.number ? ('N° ' + playerRef.number) : 'Sin número';

        info.appendChild(name);
        info.appendChild(number);
        item.appendChild(info);
        container.appendChild(item);
    });
}

// Render full roster grid
function renderFullRoster() {
    const grid = document.getElementById('roster-grid');
    const totalEl = document.getElementById('roster-total');
    if (!grid || !rosterData.players) return;
    
    grid.innerHTML = '';
    const ids = Object.keys(rosterData.players).sort((a, b) => {
        const numA = parseInt(rosterData.players[a].number) || 0;
        const numB = parseInt(rosterData.players[b].number) || 0;
        return numA - numB;
    });
    
    ids.forEach(id => {
        const p = rosterData.players[id];
        const card = document.createElement('div');
        card.className = 'roster-card';

        const badge = document.createElement('div');
        badge.className = 'player-number-badge';
        badge.textContent = p.number || '—';

        const info = document.createElement('div');
        info.className = 'roster-info';

        const name = document.createElement('span');
        name.className = 'roster-name' + (p.veteran ? ' veteran' : '');
        name.textContent = p.name;

        info.appendChild(name);
        card.appendChild(badge);
        card.appendChild(info);
        grid.appendChild(card);
    });
    
    if (totalEl) totalEl.textContent = `Total: ${ids.length} jugadores`;
}

// Render DT (Director Técnico)
function renderDT() {
    const dtEntry = rosterData.dt;
    const dtContainer = document.getElementById('dt-info');
    if (!dtContainer) return;
    
    dtContainer.innerHTML = '';
    if (!dtEntry) return;
    
    const player = (dtEntry.id && rosterData.players) ? rosterData.players[dtEntry.id] : null;

    const nameEl = document.createElement('span');
    nameEl.className = 'dt-name';
    nameEl.textContent = player ? player.name : (dtEntry.name || '—');

    dtContainer.appendChild(nameEl);

    if (player && player.number) {
        const numEl = document.createElement('span');
        numEl.className = 'dt-number';
        numEl.textContent = 'N° ' + player.number;
        dtContainer.appendChild(numEl);
    }
}

// Render Captains
function renderCaptains() {
    const caps = rosterData.captains || [];
    const capsContainer = document.getElementById('captains-list');
    if (!capsContainer) return;
    
    capsContainer.innerHTML = '';
    caps.sort((a, b) => (a.order || 0) - (b.order || 0)).forEach(c => {
        const item = document.createElement('div');
        item.className = 'captain-item';

        const rank = document.createElement('div');
        rank.className = 'captain-rank';
        rank.textContent = c.order || '-';

        const player = (c.id && rosterData.players) ? rosterData.players[c.id] : null;
        const displayName = player ? player.name : (c.name || '—');
        const displayNumber = player ? player.number : (c.number || '');
        const isVeteran = player ? !!player.veteran : false;

        const txt = document.createElement('div');
        const nameEl = document.createElement('span');
        nameEl.className = 'player-name' + (isVeteran ? ' veteran' : '');
        nameEl.textContent = displayName;

        const numEl = document.createElement('span');
        numEl.className = 'player-number';
        numEl.textContent = displayNumber ? ('N° ' + displayNumber) : '';

        txt.appendChild(nameEl);
        if (displayNumber) txt.appendChild(document.createTextNode(' '));
        txt.appendChild(numEl);

        item.appendChild(rank);
        item.appendChild(txt);
        capsContainer.appendChild(item);
    });
}

// Render field with players
function renderField() {
    const fieldEl = document.getElementById('field');
    const fieldList = rosterData.field || [];
    
    // Store lineups
    currentLineup = [...fieldList];
    initialLineup = JSON.parse(JSON.stringify(fieldList));
    
    updateFieldDisplay();
}

function updateFieldDisplay() {
    const fieldEl = document.getElementById('field');
    if (!fieldEl) return;
    
    fieldEl.innerHTML = '';
    
    // Add goal area where keeper is
    const keeperEntry = currentLineup.find(f => f.class === 'goalkeeper');
    if (keeperEntry) {
        const goal = document.createElement('div');
        const side = keeperEntry.side || 'left';
        goal.className = side === 'right' ? 'goal-area goal-right' : 'goal-area goal-left';
        fieldEl.appendChild(goal);
    }

    // Add players to field
    currentLineup.forEach((fp, index) => {
        const playerRef = fp.id ? (rosterData.players && rosterData.players[fp.id]) : fp;
        if (!playerRef) return;
        
        const p = document.createElement('div');
        p.className = 'player-on-field ' + (fp.class || '');
        
        // Add veteran indicator
        if (playerRef.veteran) {
            p.classList.add('veteran-player');
        }
        
        p.dataset.positionIndex = index;
        p.dataset.positionClass = fp.class;
        
        if (playerRef.number) {
            p.innerHTML = `<span style="font-size:0.75rem">${playerRef.name}</span><span style="font-size:0.8rem">${playerRef.number}</span>`;
        } else {
            p.textContent = playerRef.name;
        }

        p.addEventListener('click', function() {
            openPlayerSelector(index, fp.class);
        });

        fieldEl.appendChild(p);
    });
}

// Open player selector modal
function openPlayerSelector(positionIndex, positionClass) {
    const modal = document.getElementById('player-selector-modal');
    const title = document.getElementById('selector-title');
    const optionsContainer = document.getElementById('player-options');
    
    // Map position class to roster position key
    const positionMap = {
        'goalkeeper': 'porteros',
        'defender-1': 'defensas',
        'defender-2': 'defensas',
        'midfielder-1': 'medio',
        'midfielder-2': 'medio',
        'forward': 'delanteros'
    };

    const positionKey = positionMap[positionClass];
    const positionNames = {
        'porteros': 'Portero',
        'defensas': 'Defensa',
        'medio': 'Mediocampista',
        'delanteros': 'Delantero'
    };

    title.textContent = `Seleccionar ${positionNames[positionKey]}`;
    optionsContainer.innerHTML = '';

    // Get available players for this position
    const availablePlayers = rosterData.positions[positionKey] || [];
    
    availablePlayers.forEach(entry => {
        const player = rosterData.players[entry.id];
        if (!player) return;

        const option = document.createElement('div');
        option.className = 'player-option';

        const badge = document.createElement('div');
        badge.className = 'player-option-badge';
        badge.textContent = player.number || '—';

        const name = document.createElement('span');
        name.className = 'player-option-name' + (player.veteran ? ' veteran' : '');
        name.textContent = player.name;

        option.appendChild(badge);
        option.appendChild(name);

        option.addEventListener('click', function() {
            // Update lineup
            currentLineup[positionIndex] = {
                class: positionClass,
                id: entry.id,
                side: currentLineup[positionIndex].side
            };
            updateFieldDisplay();
            closePlayerSelector();
            showNotification(`${player.name} seleccionado como ${positionNames[positionKey]}`, 'success');
        });

        optionsContainer.appendChild(option);
    });

    modal.classList.add('active');
}

// Close player selector modal
function closePlayerSelector() {
    document.getElementById('player-selector-modal').classList.remove('active');
}

// Reset lineup to initial state
function resetLineup() {
    if (confirm('¿Estás seguro de que quieres restaurar la alineación inicial?')) {
        currentLineup = JSON.parse(JSON.stringify(initialLineup));
        updateFieldDisplay();
        showNotification('Alineación restaurada', 'success');
    }
}

// Highlight veterans in lists
function highlightVeterans() {
    document.querySelectorAll('.player-name.veteran').forEach(player => {
        const playerItem = player.closest('.player-item');
        if (playerItem) playerItem.style.backgroundColor = '#f0f8ff';
    });
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#e53935' : '#2196f3'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 3000;
        animation: slideInRight 0.3s ease;
        font-weight: 500;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize on page load
document.addEventListener('DOMContentLoaded', initRoster);
