// Polyfills para compatibilidad con Edge
// NodeList.forEach polyfill
if (window.NodeList && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
}

// Array.from polyfill
if (!Array.from) {
    Array.from = function(arrayLike) {
        return Array.prototype.slice.call(arrayLike);
    };
}

// Global variables
var rosterData = null;
var currentLineup = [];
var initialLineup = [];
var draggedElement = null;
var draggedIndex = null;

// Initialize roster on page load
function initRoster() {
    console.log('Iniciando carga del roster...');
    console.log('URL base:', window.location.href);
    
    fetch('data/roster.json')
        .then(function(res) {
            console.log('Respuesta del fetch:', res.status, res.statusText);
            
            if (!res.ok) {
                throw new Error('No se pudo cargar roster.json: ' + res.status + ' ' + res.statusText);
            }
            
            return res.json();
        })
        .then(function(data) {
            rosterData = data;
            console.log('Datos cargados exitosamente:', rosterData);

            // Render all sections
            renderPositionLists();
            renderFullRoster();
            renderDT();
            renderCaptains();
            renderField();
            
            // Highlight veterans
            highlightVeterans();
            
            console.log('Renderizado completado');
        })
        .catch(function(err) {
            console.error('Error inicializando roster:', err);
            console.error('Stack trace:', err.stack);
            showNotification('Error al cargar los datos del equipo. Revisa la consola para más detalles.', 'error');
            
            // Show error on page
            var main = document.querySelector('main');
            if (main) {
                var errorDiv = document.createElement('div');
                errorDiv.style.cssText = 'background: #ffebee; color: #c62828; padding: 20px; margin: 20px; border-radius: 8px; border-left: 4px solid #c62828;';
                errorDiv.innerHTML = '<h3><i class="fas fa-exclamation-triangle"></i> Error al cargar datos</h3>' +
                    '<p><strong>Mensaje:</strong> ' + err.message + '</p>' +
                    '<p><strong>Detalles:</strong> Verifica que el archivo data/roster.json existe y es accesible.</p>' +
                    '<p><strong>URL actual:</strong> ' + window.location.href + '</p>';
                main.insertBefore(errorDiv, main.firstChild);
            }
        });
}

// Render position lists (porteros, defensas, medio, delanteros)
function renderPositionLists() {
    document.querySelectorAll('.players-list').forEach(function(container) {
        var pos = container.getAttribute('data-position');
        if (pos) renderPositionList(pos, container);
    });
}

function renderPositionList(positionKey, container) {
    var posList = (rosterData.positions && rosterData.positions[positionKey]) || rosterData[positionKey] || [];
    container.innerHTML = '';
    
    posList.forEach(function(entry) {
        var playerRef = entry.id ? (rosterData.players && rosterData.players[entry.id]) : entry;
        if (!playerRef) return;
        
        var item = document.createElement('div');
        item.className = 'player-item ' + (entry.priority || playerRef.priority || '');

        var info = document.createElement('div');
        info.className = 'player-info';

        var name = document.createElement('span');
        name.className = 'player-name' + (playerRef.veteran ? ' veteran' : '');
        name.textContent = playerRef.name;

        var number = document.createElement('span');
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
    
    // Store lineups and add default formation style
    currentLineup = fieldList.map((fp, index) => {
        const defaultStyles = [
            'top: 50%; left: 8%; transform: translateY(-50%);', // goalkeeper
            'top: 30%; left: 28%;', // defender-1
            'top: 70%; left: 28%;', // defender-2
            'top: 30%; left: 55%;', // midfielder-1
            'top: 70%; left: 55%;', // midfielder-2
            'top: 50%; left: 80%; transform: translateY(-50%);' // forward
        ];
        return {
            ...fp,
            customStyle: defaultStyles[index] || ''
        };
    });
    initialLineup = JSON.parse(JSON.stringify(currentLineup));
    
    updateFieldDisplayWithCustomStyles();
}



// Drag and Drop handlers
function handleDragStart(e) {
    draggedElement = this;
    draggedIndex = parseInt(this.dataset.positionIndex);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedIndex);
    console.log('Drag started:', draggedIndex);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    // Remove all drag-over classes
    document.querySelectorAll('.player-on-field').forEach(function(el) {
        el.classList.remove('drag-over');
    });
    draggedElement = null;
    console.log('Drag ended');
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    e.preventDefault();
    if (this !== draggedElement && !this.classList.contains('empty-position')) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    this.classList.remove('drag-over');
    
    if (draggedElement && draggedElement !== this && !this.classList.contains('empty-position')) {
        const targetIndex = parseInt(this.dataset.positionIndex);
        
        console.log('Swapping', draggedIndex, 'with', targetIndex);
        
        // Swap players
        const temp = currentLineup[draggedIndex];
        currentLineup[draggedIndex] = currentLineup[targetIndex];
        currentLineup[targetIndex] = temp;
        
        updateFieldDisplayWithCustomStyles();
        showNotification('Jugadores intercambiados', 'success');
    }
    
    return false;
}

// Remove player from field
function removePlayerFromField(index) {
    const playerRef = currentLineup[index].id ? rosterData.players[currentLineup[index].id] : null;
    const playerName = playerRef ? playerRef.name : 'Jugador';
    
    if (confirm(`¿Quitar a ${playerName} de la alineación?`)) {
        // Keep position structure but remove player id
        currentLineup[index] = {
            class: currentLineup[index].class,
            side: currentLineup[index].side,
            customStyle: currentLineup[index].customStyle,
            id: null
        };
        updateFieldDisplayWithCustomStyles();
        showNotification(`${playerName} removido de la alineación`, 'info');
    }
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
        'defender-3': 'defensas',
        'defender-4': 'defensas',
        'midfielder': 'medio',
        'midfielder-1': 'medio',
        'midfielder-2': 'medio',
        'forward': 'delanteros',
        'forward-1': 'delanteros',
        'forward-2': 'delanteros'
    };

    const positionKey = positionMap[positionClass];
    
    // Verificar que la posición está mapeada
    if (!positionKey) {
        console.error('Posición no mapeada:', positionClass);
        return;
    }
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
    
    // Get list of players already in lineup (excluding current position)
    const playersInLineup = currentLineup
        .map((pos, idx) => idx !== positionIndex ? pos.id : null)
        .filter(id => id !== null);
    
    availablePlayers.forEach(entry => {
        const player = rosterData.players[entry.id];
        if (!player) return;

        const option = document.createElement('div');
        const isAlreadyInLineup = playersInLineup.includes(entry.id);
        
        option.className = 'player-option' + (isAlreadyInLineup ? ' player-disabled' : '');

        const badge = document.createElement('div');
        badge.className = 'player-option-badge';
        badge.textContent = player.number || '—';

        const name = document.createElement('span');
        name.className = 'player-option-name' + (player.veteran ? ' veteran' : '');
        name.textContent = player.name + (isAlreadyInLineup ? ' (Ya en campo)' : '');

        option.appendChild(badge);
        option.appendChild(name);

        option.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Prevent selection if player is already in lineup
            if (isAlreadyInLineup) {
                showNotification(`${player.name} ya está en la alineación`, 'error');
                return;
            }
            
            // Update lineup
            currentLineup[positionIndex] = {
                class: positionClass,
                id: entry.id,
                side: currentLineup[positionIndex].side,
                customStyle: currentLineup[positionIndex].customStyle
            };
            updateFieldDisplayWithCustomStyles();
            closePlayerSelector();
            showNotification(`${player.name} seleccionado como ${positionNames[positionKey]}`, 'success');
        });

        optionsContainer.appendChild(option);
    });

    modal.classList.add('active');
}

// Close player selector modal
function closePlayerSelector() {
    const modal = document.getElementById('player-selector-modal');
    modal.classList.remove('active');
    // Clear content after animation
    setTimeout(() => {
        const optionsContainer = document.getElementById('player-options');
        if (optionsContainer) {
            optionsContainer.innerHTML = '';
        }
    }, 300);
}

// Reset lineup to initial state
function resetLineup() {
    if (confirm('¿Estás seguro de que quieres restaurar la alineación inicial?')) {
        currentLineup = JSON.parse(JSON.stringify(initialLineup));
        updateFieldDisplayWithCustomStyles();
        showNotification('Alineación restaurada correctamente', 'success');
    }
}

// Change formation
function changeFormation(formation) {
    const formations = {
        '1-2-2-1': [
            { class: 'goalkeeper', style: 'top: 50%; left: 8%; transform: translateY(-50%);' },
            { class: 'defender-1', style: 'top: 30%; left: 28%;' },
            { class: 'defender-2', style: 'top: 70%; left: 28%;' },
            { class: 'midfielder-1', style: 'top: 30%; left: 55%;' },
            { class: 'midfielder-2', style: 'top: 70%; left: 55%;' },
            { class: 'forward', style: 'top: 50%; left: 80%; transform: translateY(-50%);' }
        ],
        '2-1-2': [
            { class: 'goalkeeper', style: 'top: 50%; left: 8%; transform: translateY(-50%);' },
            { class: 'defender-1', style: 'top: 35%; left: 28%;' },
            { class: 'defender-2', style: 'top: 65%; left: 28%;' },
            { class: 'midfielder', style: 'top: 50%; left: 50%; transform: translateY(-50%);' },
            { class: 'forward-1', style: 'top: 35%; left: 72%;' },
            { class: 'forward-2', style: 'top: 65%; left: 72%;' }
        ],
        '1-3-2': [
            { class: 'goalkeeper', style: 'top: 50%; left: 8%; transform: translateY(-50%);' },
            { class: 'defender-1', style: 'top: 20%; left: 30%;' },
            { class: 'defender-2', style: 'top: 50%; left: 30%; transform: translateY(-50%);' },
            { class: 'defender-3', style: 'top: 80%; left: 30%;' },
            { class: 'midfielder-1', style: 'top: 35%; left: 65%;' },
            { class: 'forward', style: 'top: 65%; left: 65%;' }
        ],
        '1-2-3': [
            { class: 'goalkeeper', style: 'top: 50%; left: 8%; transform: translateY(-50%);' },
            { class: 'defender-1', style: 'top: 35%; left: 28%;' },
            { class: 'defender-2', style: 'top: 65%; left: 28%;' },
            { class: 'midfielder-1', style: 'top: 20%; left: 60%;' },
            { class: 'forward', style: 'top: 50%; left: 60%; transform: translateY(-50%);' },
            { class: 'forward-2', style: 'top: 80%; left: 60%;' }
        ],
        '1-4-1': [
            { class: 'goalkeeper', style: 'top: 50%; left: 8%; transform: translateY(-50%);' },
            { class: 'defender-1', style: 'top: 15%; left: 35%;' },
            { class: 'defender-2', style: 'top: 40%; left: 35%;' },
            { class: 'defender-3', style: 'top: 60%; left: 35%;' },
            { class: 'defender-4', style: 'top: 85%; left: 35%;' },
            { class: 'forward', style: 'top: 50%; left: 75%; transform: translateY(-50%);' }
        ]
    };

    const newFormation = formations[formation];
    if (!newFormation) return;

    // Update positions with new formation styles
    newFormation.forEach((pos, index) => {
        if (currentLineup[index]) {
            currentLineup[index].class = pos.class;
            currentLineup[index].customStyle = pos.style;
        }
    });

    updateFieldDisplayWithCustomStyles();
    showNotification(`Formación cambiada a ${formation}`, 'success');
}

// Update field display with custom styles
function updateFieldDisplayWithCustomStyles() {
    const fieldEl = document.getElementById('field');
    if (!fieldEl) return;
    
    fieldEl.innerHTML = '';
    
    // Add goal area
    const keeperEntry = currentLineup.find(f => f.class === 'goalkeeper');
    if (keeperEntry) {
        const goal = document.createElement('div');
        const side = keeperEntry.side || 'left';
        goal.className = side === 'right' ? 'goal-area goal-right' : 'goal-area goal-left';
        fieldEl.appendChild(goal);
    }

    // Add players with custom positions
    currentLineup.forEach((fp, index) => {
        if (!fp || !fp.class) return;
        
        const playerRef = fp.id ? (rosterData.players && rosterData.players[fp.id]) : null;
        
        if (!playerRef) {
            const placeholder = document.createElement('div');
            placeholder.className = 'player-on-field empty-position';
            placeholder.dataset.positionIndex = index;
            placeholder.dataset.positionClass = fp.class;
            placeholder.innerHTML = '<i class="fas fa-plus"></i>';
            placeholder.title = 'Click para agregar jugador';
            
            // Apply custom style if available
            if (fp.customStyle) {
                placeholder.setAttribute('style', fp.customStyle);
            }
            
            placeholder.addEventListener('click', function() {
                openPlayerSelector(index, fp.class);
            });
            
            fieldEl.appendChild(placeholder);
            return;
        }
        
        const p = document.createElement('div');
        p.className = 'player-on-field ' + (fp.class || '');
        
        if (playerRef.veteran) {
            p.classList.add('veteran-player');
        }
        
        p.dataset.positionIndex = index;
        p.dataset.positionClass = fp.class;
        p.setAttribute('draggable', 'true');
        
        // Apply custom style if available
        if (fp.customStyle) {
            p.setAttribute('style', fp.customStyle + ' position: absolute !important;');
        }
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'player-content';
        contentDiv.style.pointerEvents = 'none';
        if (playerRef.number) {
            contentDiv.innerHTML = `<span class="player-field-name">${playerRef.name}</span><span class="player-field-number">#${playerRef.number}</span>`;
        } else {
            contentDiv.innerHTML = `<span class="player-field-name">${playerRef.name}</span>`;
        }
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-player-btn';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.title = 'Quitar jugador';
        removeBtn.setAttribute('draggable', 'false');
        removeBtn.onclick = function(e) {
            e.stopPropagation();
            e.preventDefault();
            removePlayerFromField(index);
        };
        
        p.appendChild(contentDiv);
        p.appendChild(removeBtn);
        
        p.addEventListener('click', function(e) {
            if (e.target.closest('.remove-player-btn')) return;
            openPlayerSelector(index, fp.class);
        });
        
        p.ondragstart = handleDragStart;
        p.ondragend = handleDragEnd;
        p.ondragover = handleDragOver;
        p.ondrop = handleDrop;
        p.ondragenter = handleDragEnter;
        p.ondragleave = handleDragLeave;

        fieldEl.appendChild(p);
    });
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
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Iniciando aplicación');
    
    // Initialize roster
    initRoster();
    
    // Setup event listeners
    const formationSelect = document.getElementById('formation-select');
    if (formationSelect) {
        formationSelect.addEventListener('change', function(e) {
            changeFormation(e.target.value);
        });
    }
    
    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
        btnReset.addEventListener('click', function(e) {
            e.preventDefault();
            resetLineup();
        });
    }
    
    const selectorClose = document.getElementById('selector-close');
    if (selectorClose) {
        selectorClose.addEventListener('click', function(e) {
            e.preventDefault();
            closePlayerSelector();
        });
    }
    
    const modal = document.getElementById('player-selector-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closePlayerSelector();
            }
        });
    }
    
    const selectorContent = document.querySelector('.selector-content');
    if (selectorContent) {
        selectorContent.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
});

// Make functions globally available for compatibility
window.changeFormation = changeFormation;
window.resetLineup = resetLineup;
window.closePlayerSelector = closePlayerSelector;
