// ============================================================================
// POLYFILLS
// ============================================================================

if (window.NodeList && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
}

if (!Array.from) {
    Array.from = function(arrayLike) {
        return Array.prototype.slice.call(arrayLike);
    };
}

// ============================================================================
// GLOBAL STATE
// ============================================================================

var rosterData = {}; // Will be populated from JSON
var currentLineup = []; // Empieza vacío
var draggedPlayerId = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', initRoster);

// Fallback data for file:// access where fetch is blocked
const FALLBACK_DATA = {
    "players": {
        "1": { "name": "Fernando (Nuevo)", "number": "99", "veteran": false, "rating": 4.2, "strengths": ["Buenos reflejos", "Buenas atajadas", "Reacción rápida"], "improvements": ["Salida con los pies", "A veces mide mal las salidas"] },
        "2": { "name": "Gregorio", "number": "17", "veteran": true, "rating": 3.8, "strengths": ["Visión de juego", "Equilibrio"], "improvements": ["Estado físico", "Constancia en el juego"] },
        "3": { "name": "Carlos Daniel", "number": "15", "veteran": false, "rating": 4.2, "strengths": ["Anticipación", "Corte de balón", "Marca fuerte"], "improvements": ["Salida limpia", "Juego asociativo", "Estado físico"] },
        "4": { "name": "Fredual Guevara", "number": "2", "veteran": false, "rating": 3.6, "strengths": ["Juego asociativo", "Ubicación en ataque"], "improvements": ["Constancia en el juego", "Agresividad en marca"] },
        "5": { "name": "Fernando (Señor)", "number": "7", "veteran": true, "rating": 3.5, "strengths": ["Inteligencia táctica", "Liderazgo"], "improvements": ["Precisión en pases", "Estado físico"] },
        "6": { "name": "Javier", "number": "27", "veteran": false, "rating": 4.3, "strengths": ["Creatividad", "Pase filtrado", "Definición"], "improvements": ["Intensidad en marca", "Apoyo defensivo"] },
        "7": { "name": "Harold Charris", "number": "9", "veteran": false, "rating": 4.5, "strengths": ["Liderazgo", "Organización", "Pase filtrado"], "improvements": ["Control emocional", "Trato con los compañeros","A veces no suelta el balón"] },
        "8": { "name": "Jhon Vill", "number": "22", "veteran": false, "rating": 4.2, "strengths": ["Presión alta", "Buena marca", "Solidaridad defensiva"], "improvements": ["Definición", "Juego asociativo en ataque"] },
        "9": { "name": "Carlos Medina", "number": "94", "veteran": false, "rating": 3.9, "strengths": ["Visión de juego", "Juego asociativo"], "improvements": ["Definición", "Intensidad en marca"] },
        "10": { "name": "Juan Duarte", "number": "10", "veteran": false, "rating": 3.9, "strengths": ["Cambio de ritmo", "Regate", "Remate media distancia"], "improvements": ["Juego asociativo", "Recuperación tras pérdida", "Compromiso en marca"] },
        "11": { "name": "Cristian", "number": "4", "veteran": false, "rating": 3.8, "strengths": ["Marca intensa", "Recuperación de balón"], "improvements": ["Toma de decisiones", "Estado físico"] },
        "12": { "name": "Ingeniero John", "number": "3", "veteran": true, "rating": 3.3, "strengths": ["Apoyo defensivo", "Orden táctico"], "improvements": ["Técnica básica", "Intensidad en marca"] },
        "13": { "name": "Juan (SENA)", "number": "23", "veteran": false, "rating": 3.6, "strengths": ["Desmarque", "Juego en corto"], "improvements": ["Definición", "Control de balón", "Compromiso en marca"] }
    },
    "positions": {
        "porteros": [ { "id": "1", "priority": "high-priority" }, { "id": "2", "priority": "medium-priority" }, { "id": "3", "priority": "medium-priority" }, { "id": "4", "priority": "low-priority" }, { "id": "7", "priority": "low-priority" } ],
        "defensas": [ { "id": "3", "priority": "high-priority" }, { "id": "2", "priority": "medium-priority" }, { "id": "11", "priority": "medium-priority" }, { "id": "4", "priority": "low-priority" }, { "id": "5", "priority": "low-priority" }, { "id": "6", "priority": "low-priority" }, { "id": "12", "priority": "high-priority" } ],
        "medio": [ { "id": "7", "priority": "high-priority" }, { "id": "8", "priority": "high-priority" }, { "id": "6", "priority": "medium-priority" }, { "id": "9", "priority": "medium-priority" }, { "id": "2", "priority": "medium-priority" }, { "id": "3", "priority": "low-priority" }, { "id": "12", "priority": "medium-priority" }, { "id": "13", "priority": "medium-priority" } ],
        "delanteros": [ { "id": "10", "priority": "high-priority" }, { "id": "8", "priority": "medium-priority" }, { "id": "7", "priority": "low-priority" }, { "id": "13", "priority": "high-priority" } ]
    },
    "captains": [ { "order": 1, "id": "7" }, { "order": 2, "id": "3" }, { "order": 3, "id": "8" }, { "order": 4, "id": "1" } ],
    "dt": { "id": "5" },
    "field": [
        { "class": "goalkeeper", "id": "1", "side": "left" },
        { "class": "defender-1", "id": "2" },
        { "class": "defender-2", "id": "3" },
        { "class": "midfielder-1", "id": "6" },
        { "class": "midfielder-2", "id": "7" },
        { "class": "forward", "id": "8" }
    ]
};

function initRoster() {
    console.log('Iniciando carga del sistema...');

    // Prioridad 1: Fetch desde roster.json
    fetch('./data/roster.json')
        .then(function(response) {
            if (!response.ok) throw new Error('HTTP error ' + response.status);
            return response.json();
        })
        .then(function(data) {
            console.log('Datos cargados vía Fetch:', data);
            rosterData = data;
            initializeApp();
        })
        .catch(function(err) {
            console.warn('Fetch falló, usando datos fallback:', err);
            
            // Prioridad 2: Fallback embebido
            rosterData = FALLBACK_DATA;
            initializeApp();
            
            showNotification('Modo sin conexión: Datos internos', 'info');
        });
}

function initializeApp() {
    try {
        // Render sections
        renderPositionLists();
        renderFullRoster();
        renderDT();
        renderCaptains();
        renderConvocatoria();
        initializeEmptyLineup();
        updateConvocatoriaStats();
        // highlightVeterans(); // Removed as it might not be needed or function missing in snippet
        
        console.log('Renderizado completado');
    } catch (err) {
        console.error('Error durante la inicialización de la app:', err);
    }
}

// ============================================================================
// RENDERING FUNCTIONS
// ============================================================================

function renderPositionLists() {
    document.querySelectorAll('.players-list').forEach(function(container) {
        var pos = container.getAttribute('data-position');
        if (pos) renderPositionList(pos, container);
    });
}

function renderPositionList(positionKey, container) {
    var posList = (rosterData.positions && rosterData.positions[positionKey]) || [];
    container.innerHTML = '';
    
    posList.forEach(function(entry) {
        var playerRef = rosterData.players[entry.id];
        if (!playerRef) return;
        
        var item = document.createElement('div');
        item.className = 'player-item ' + (entry.priority || '');

        var info = document.createElement('div');
        info.className = 'player-info';

        var namePart = document.createElement('div');
        namePart.style.display = 'flex';
        namePart.style.flexDirection = 'column';

        var name = document.createElement('span');
        name.className = 'player-name' + (playerRef.veteran ? ' veteran' : '');
        name.textContent = playerRef.name;

        var subInfo = document.createElement('div');
        subInfo.style.display = 'flex';
        subInfo.style.gap = '8px';
        subInfo.style.alignItems = 'center';

        var number = document.createElement('span');
        number.className = 'player-number';
        number.textContent = playerRef.number ? ('N° ' + playerRef.number) : 'S/N';

        subInfo.appendChild(number);

        if (playerRef.rating) {
            var rating = document.createElement('span');
            rating.className = 'player-rating-mini';
            rating.innerHTML = '<i class="fas fa-star" style="color:var(--accent); font-size:0.7rem;"></i> ' + playerRef.rating;
            rating.style.fontSize = '0.75rem';
            rating.style.fontWeight = '700';
            subInfo.appendChild(rating);
        }

        namePart.appendChild(name);
        namePart.appendChild(subInfo);
        info.appendChild(namePart);
        
        item.appendChild(info);
        container.appendChild(item);
    });
}

function renderFullRoster() {
    var grid = document.getElementById('roster-grid');
    var totalEl = document.getElementById('roster-total');
    if (!grid || !rosterData.players) return;
    
    grid.innerHTML = '';
    var ids = Object.keys(rosterData.players).sort(function(a, b) {
        var numA = parseInt(rosterData.players[a].number) || 0;
        var numB = parseInt(rosterData.players[b].number) || 0;
        return numA - numB;
    });
    
    ids.forEach(function(id) {
        var p = rosterData.players[id];
        var card = document.createElement('div');
        card.className = 'roster-card';

        // Rating prominence
        if (p.rating) {
            var ratingBadge = document.createElement('div');
            ratingBadge.className = 'player-rating-badge';
            ratingBadge.innerHTML = '<i class="fas fa-star"></i> ' + p.rating;
            card.appendChild(ratingBadge);
        }

        // Header Section
        var header = document.createElement('div');
        header.className = 'roster-header';

        var badge = document.createElement('div');
        badge.className = 'player-number-badge';
        badge.textContent = p.number || '—';

        var info = document.createElement('div');
        info.className = 'roster-info';

        var name = document.createElement('span');
        name.className = 'roster-name' + (p.veteran ? ' veteran' : '');
        name.textContent = p.name;
        
        var positionsDiv = document.createElement('div');
        positionsDiv.className = 'roster-positions';
        
        var playerPositions = getPlayerPositions(id);
        playerPositions.forEach(function(pos) {
            var posBadge = document.createElement('span');
            posBadge.className = 'roster-pos-badge pos-' + pos.key;
            posBadge.textContent = pos.label;
            posBadge.title = pos.full + ' - Prioridad: ' + pos.priority;
            positionsDiv.appendChild(posBadge);
        });

        info.appendChild(name);
        info.appendChild(positionsDiv);
        header.appendChild(badge);
        header.appendChild(info);
        card.appendChild(header);

        // Details Section
        var detailsDiv = document.createElement('div');
        detailsDiv.className = 'roster-details';

        if (p.strengths && p.strengths.length > 0) {
            var sGroup = document.createElement('div');
            sGroup.className = 'detail-group';
            sGroup.innerHTML = '<span class="detail-label">Habilidades:</span>' +
                '<div class="detail-content">' + 
                p.strengths.map(function(s) { return '<span class="detail-tag strength-tag">' + s + '</span>'; }).join('') + 
                '</div>';
            detailsDiv.appendChild(sGroup);
        }

        if (p.improvements && p.improvements.length > 0) {
            var iGroup = document.createElement('div');
            iGroup.className = 'detail-group';
            iGroup.innerHTML = '<span class="detail-label">A mejorar:</span>' +
                '<div class="detail-content">' + 
                p.improvements.map(function(i) { return '<span class="detail-tag improvement-tag">' + i + '</span>'; }).join('') + 
                '</div>';
            detailsDiv.appendChild(iGroup);
        }

        card.appendChild(detailsDiv);

        // Explicit Toggle
        var toggleDiv = document.createElement('div');
        toggleDiv.className = 'card-toggle';
        toggleDiv.innerHTML = '<span class="toggle-text">Ver detalles</span> <i class="fas fa-chevron-down toggle-icon"></i>';
        card.appendChild(toggleDiv);

        // Toggle Expand Logic
        card.onclick = function() {
            // Close others if open (optional UI preference)
            document.querySelectorAll('.roster-card.expanded').forEach(function(c) {
                if (c !== card) {
                    c.classList.remove('expanded');
                    var txt = c.querySelector('.toggle-text');
                    if (txt) txt.textContent = 'Ver detalles';
                }
            });
            
            var isExpanded = card.classList.toggle('expanded');
            var toggleText = card.querySelector('.toggle-text');
            if (toggleText) {
                toggleText.textContent = isExpanded ? 'Ocultar' : 'Ver detalles';
            }
        };

        grid.appendChild(card);
    });
    
    if (totalEl) totalEl.textContent = 'Total: ' + ids.length + ' jugadores';
}

function renderDT() {
    var dtEntry = rosterData.dt;
    var dtContainer = document.getElementById('dt-info');
    if (!dtContainer || !dtEntry) return;
    
    dtContainer.innerHTML = '';
    var player = rosterData.players[dtEntry.id];
    if (!player) return;

    var dtCard = document.createElement('div');
    dtCard.className = 'dt-card-display';
    dtCard.innerHTML = 
        '<div class="dt-icon-wrapper"><i class="fas fa-user-tie"></i></div>' +
        '<div class="dt-details">' +
        '  <span class="dt-role-label">Director Técnico</span>' +
        '  <div class="dt-main-info">' +
        '    <span class="dt-name">' + player.name + '</span>' +
        (player.number ? '    <span class="dt-number">N° ' + player.number + '</span>' : '') +
        '  </div>' +
        '</div>';
        
    dtContainer.appendChild(dtCard);
}

function renderCaptains() {
    var caps = rosterData.captains || [];
    var capsContainer = document.getElementById('captains-list');
    if (!capsContainer) return;
    
    capsContainer.innerHTML = '';
    caps.sort(function(a, b) { return (a.order || 0) - (b.order || 0); }).forEach(function(c) {
        var item = document.createElement('div');
        item.className = 'captain-item';

        var rank = document.createElement('div');
        rank.className = 'captain-rank';
        rank.textContent = c.order || '-';

        var player = rosterData.players[c.id];
        var txt = document.createElement('div');
        var nameEl = document.createElement('span');
        nameEl.className = 'player-name' + (player && player.veteran ? ' veteran' : '');
        nameEl.textContent = player ? player.name : '—';

        var numEl = document.createElement('span');
        numEl.className = 'player-number';
        numEl.textContent = player && player.number ? ('N° ' + player.number) : '';

        txt.appendChild(nameEl);
        if (player && player.number) txt.appendChild(document.createTextNode(' '));
        txt.appendChild(numEl);

        item.appendChild(rank);
        item.appendChild(txt);
        capsContainer.appendChild(item);
    });
}

// ============================================================================
// CONVOCATORIA (Ahora "Lista Disponible")
// ============================================================================

function renderConvocatoria() {
    var list = document.getElementById('convocatoria-list');
    if (!list || !rosterData.players) return;
    
    list.innerHTML = '';
    
    var ids = Object.keys(rosterData.players).sort(function(a, b) {
        var numA = parseInt(rosterData.players[a].number) || 0;
        var numB = parseInt(rosterData.players[b].number) || 0;
        return numA - numB;
    });
    
    ids.forEach(function(id) {
        // Filtrar si ya está en la alineación
        var isAssigned = currentLineup.some(function(slot) { return slot.id === id; });
        if (isAssigned) return;

        var player = rosterData.players[id];
        
        var item = document.createElement('div');
        item.className = 'convocado-item' + (player.veteran ? ' veteran-item' : '');
        item.dataset.playerId = id;
        item.setAttribute('draggable', 'true');
        
        // Remove Checkbox - Todos disponibles
        
        var badge = document.createElement('div');
        badge.className = 'player-badge-mini';
        badge.textContent = player.number || '—';
        
        var infoContainer = document.createElement('div');
        infoContainer.className = 'convocado-info';
        
        var nameSpan = document.createElement('span');
        nameSpan.className = 'convocado-name' + (player.veteran ? ' veteran' : '');
        nameSpan.textContent = player.name;
        
        var subInfoDiv = document.createElement('div');
        subInfoDiv.style.display = 'flex';
        subInfoDiv.style.alignItems = 'center';
        subInfoDiv.style.gap = '8px';

        var positionsDiv = document.createElement('div');
        positionsDiv.className = 'player-positions-badges';
        
        var playerPositions = getPlayerPositions(id);
        playerPositions.forEach(function(pos) {
            var posBadge = document.createElement('span');
            posBadge.className = 'pos-badge pos-' + pos.key;
            posBadge.textContent = pos.label;
            posBadge.title = pos.full + ' - ' + pos.priority;
            positionsDiv.appendChild(posBadge);
        });

        subInfoDiv.appendChild(positionsDiv);

        if (player.rating) {
            var ratingSpan = document.createElement('span');
            ratingSpan.className = 'convocado-rating';
            ratingSpan.innerHTML = '<i class="fas fa-star"></i> ' + player.rating;
            ratingSpan.style.fontSize = '0.7rem';
            ratingSpan.style.fontWeight = '800';
            ratingSpan.style.color = 'var(--accent)';
            subInfoDiv.appendChild(ratingSpan);
        }
        
        infoContainer.appendChild(nameSpan);
        infoContainer.appendChild(subInfoDiv);
        
        // Drag handlers simplified
        item.ondragstart = function(e) {
            draggedPlayerId = id;
            e.dataTransfer.setData('text/plain', JSON.stringify({ 
                type: 'roster-add', playerId: id 
            }));
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        };
        
        item.ondragend = function() {
            item.classList.remove('dragging');
            draggedPlayerId = null;
        };
        
        item.appendChild(badge);
        item.appendChild(infoContainer);
        
        if (player.veteran) {
            var veteranBadge = document.createElement('span');
            veteranBadge.className = 'veteran-badge-mini';
            veteranBadge.innerHTML = '<i class="fas fa-star"></i>';
            item.appendChild(veteranBadge);
        }
        
        list.appendChild(item);
    });
}

function toggleConvocatoria(playerId) {
   // Deprecated function kept empty to prevent errors if called, though UI no longer calls it
}

function updateConvocatoriaStats() {
    var count = document.getElementById('convocados-count');
    // Count all players as available
    var total = Object.keys(rosterData.players).length;
    if (count) count.textContent = total;
}

function selectAllPlayers() {
    // No-op
}

function clearConvocatoria() {
    // No-op
}

// ============================================================================
// FIELD & LINEUP
// ============================================================================

function getFormationConfig(formation) {
    var configs = {
        '1-2-2-1': [ // GK + 2 Def + 2 Mid + 1 Fwd = 6
            { class: 'goalkeeper', style: 'top: 50%; left: 8%; transform: translateY(-50%);' },
            { class: 'defender-1', style: 'top: 30%; left: 28%;' },
            { class: 'defender-2', style: 'top: 70%; left: 28%;' },
            { class: 'midfielder-1', style: 'top: 30%; left: 55%;' },
            { class: 'midfielder-2', style: 'top: 70%; left: 55%;' },
            { class: 'forward', style: 'top: 50%; left: 80%; transform: translateY(-50%);' }
        ],
        '1-2-1-2': [ // GK + 2 Def + 1 Mid + 2 Fwd = 6
            { class: 'goalkeeper', style: 'top: 50%; left: 8%; transform: translateY(-50%);' },
            { class: 'defender-1', style: 'top: 25%; left: 30%;' },
            { class: 'defender-2', style: 'top: 75%; left: 30%;' },
            { class: 'midfielder-1', style: 'top: 50%; left: 55%; transform: translateY(-50%);' },
            { class: 'forward', style: 'top: 30%; left: 80%;' },
            { class: 'forward-2', style: 'top: 70%; left: 80%;' }
        ],
        '1-2-3': [ // GK + 2 Def + 3 Fwd = 6
            { class: 'goalkeeper', style: 'top: 50%; left: 8%; transform: translateY(-50%);' },
            { class: 'defender-1', style: 'top: 30%; left: 25%;' },
            { class: 'defender-2', style: 'top: 70%; left: 25%;' },
            { class: 'midfielder-1', style: 'top: 50%; left: 50%; transform: translateY(-50%);' }, /* Pivot/Center Fwd */
            { class: 'forward', style: 'top: 25%; left: 75%;' },
            { class: 'forward-2', style: 'top: 75%; left: 75%;' }
        ],
        '1-3-2': [ // GK + 3 Def + 2 Fwd = 6
            { class: 'goalkeeper', style: 'top: 50%; left: 8%; transform: translateY(-50%);' },
            { class: 'defender-1', style: 'top: 20%; left: 35%;' },
            { class: 'defender-2', style: 'top: 50%; left: 30%; transform: translateY(-50%);' },
            { class: 'defender-3', style: 'top: 80%; left: 35%;' },
            { class: 'forward', style: 'top: 35%; left: 75%;' },
            { class: 'forward-2', style: 'top: 65%; left: 75%;' }
        ],
        '1-4-1': [ // GK + 4 Def + 1 Fwd = 6
            { class: 'goalkeeper', style: 'top: 50%; left: 8%; transform: translateY(-50%);' },
            { class: 'defender-1', style: 'top: 15%; left: 35%;' },
            { class: 'defender-2', style: 'top: 38%; left: 35%;' },
            { class: 'defender-3', style: 'top: 62%; left: 35%;' },
            { class: 'defender-4', style: 'top: 85%; left: 35%;' },
            { class: 'forward', style: 'top: 50%; left: 75%; transform: translateY(-50%);' }
        ],
        '1-1-2-1-1': [ // Romboide: GK + 1 Def + 2 Wing + 1 AMC + 1 Fwd
            { class: 'goalkeeper', style: 'top: 50%; left: 8%; transform: translateY(-50%);' },
            { class: 'defender-1', style: 'top: 50%; left: 25%; transform: translateY(-50%);' }, /* Libero */
            { class: 'midfielder-1', style: 'top: 20%; left: 45%;' }, /* Left Wing */
            { class: 'midfielder-2', style: 'top: 80%; left: 45%;' }, /* Right Wing */
            { class: 'midfielder-3', style: 'top: 50%; left: 60%; transform: translateY(-50%);' }, /* Enganche/Volante */
            { class: 'forward', style: 'top: 50%; left: 85%; transform: translateY(-50%);' }
        ],
        '1-3-1-1': [ // Control: GK + 1 Def + 3 Mid + 1 Fwd (Standard 1-3-1 in 6-a-side)
            { class: 'goalkeeper', style: 'top: 50%; left: 8%; transform: translateY(-50%);' },
            { class: 'defender-1', style: 'top: 50%; left: 25%; transform: translateY(-50%);' },
            { class: 'midfielder-1', style: 'top: 20%; left: 50%;' },
            { class: 'midfielder-2', style: 'top: 50%; left: 50%; transform: translateY(-50%);' },
            { class: 'midfielder-3', style: 'top: 80%; left: 50%;' },
            { class: 'forward', style: 'top: 50%; left: 80%; transform: translateY(-50%);' }
        ]
    };
    
    return configs[formation] || configs['1-2-2-1'];
}

function initializeEmptyLineup() {
    var formation = getFormationConfig('1-2-2-1');
    currentLineup = formation.map(function(pos) {
        return {
            class: pos.class,
            style: pos.style,
            id: null // VACÍO
        };
    });
    updateFieldDisplay();
    validateLineup();
}


function resetLineup() {
    var selector = document.getElementById('formation-select');
    var formationName = selector ? selector.value : '1-2-2-1';
    var formation = getFormationConfig(formationName);
    
    // Map existing players to new positions based on index
    var newLineup = formation.map(function(posTemplate, i) {
        var existingPlayerId = currentLineup[i] ? currentLineup[i].id : null;
        return {
            class: posTemplate.class,
            style: posTemplate.style,
            id: existingPlayerId
        };
    });
    
    currentLineup = newLineup;
    updateFieldDisplay();
    renderConvocatoria(); // Sincronizar lista
    showNotification('Posiciones restablecidas', 'info');
}

// DOM Caching for performance
var fieldEl = document.getElementById('field');

function updateFieldDisplay() {
    if (!fieldEl) {
        fieldEl = document.getElementById('field'); // Try to get it again if null
        if (!fieldEl) return;
    }
    
    // Use DocumentFragment to batch DOM updates (improves performance / reduces reflows)
    var fragment = document.createDocumentFragment();
    
    // Goal area
    var hasGoalkeeper = currentLineup.some(function(p) { return p.class && p.class.includes('goalkeeper'); });
    if (hasGoalkeeper) {
        var goal = document.createElement('div');
        goal.className = 'goal-area goal-left';
        fragment.appendChild(goal);
    }
    
    // Render positions
    currentLineup.forEach(function(pos, index) {
        if (!pos) return;
        var slot = createFieldSlot(pos, index);
        fragment.appendChild(slot);
    });
    
    // Clear and Append in one go
    fieldEl.innerHTML = '';
    fieldEl.appendChild(fragment);
    
    // Re-bind container events (since innerHTML cleared them? No, container events stay on fieldEl)
    // But good to double check fieldEl events aren't lost. 
    // Actually, fieldEl keys are global, so we don't need to re-add them if we don't replace fieldEl itself.
    // However, innerHTML = '' is safe for children.
}

function createFieldSlot(pos, index) {
    var slot = document.createElement('div');
    slot.className = 'field-slot ' + (pos.class || '');
    slot.dataset.positionIndex = index;
    slot.setAttribute('style', pos.style);
    
    if (!pos.id) {
        // --- EMPTY SLOT ---
        slot.classList.add('empty-slot');
        slot.innerHTML = '<i class="fas fa-plus"></i>';
        slot.title = 'Seleccionar jugador';
        
        slot.onclick = function() { openPlayerSelection(index); };
    
        // Drag Events
        slot.ondragover = handleDragOver;
        slot.ondragleave = handleDragLeave;
        slot.ondrop = function(e) { handleSlotDrop(e, index); };
        
    } else {
        // --- OCCUPIED SLOT ---
        var player = rosterData.players[pos.id];
        if (!player) return slot; // Should not happen
        
        slot.classList.add('occupied-slot');
        if (player.veteran) slot.classList.add('veteran-player');
        
        // Draggable
        slot.draggable = true;
        slot.ondragstart = function(e) {
            e.dataTransfer.setData('text/plain', JSON.stringify({ 
                type: 'field-move', index: index, playerId: pos.id,
                offsetX: e.offsetX, offsetY: e.offsetY
            }));
            e.dataTransfer.effectAllowed = "move";
            slot.classList.add('dragging');
            // Timeout hack for ghost image
            setTimeout(function() { slot.classList.add('invisible-drag'); }, 0);
        };
        
        slot.ondragend = function() {
            slot.classList.remove('dragging');
            slot.classList.remove('invisible-drag');
        };

        // DOM Content
        if (player.number) {
            var numDiv = document.createElement('div');
            numDiv.className = 'player-field-number';
            numDiv.textContent = player.number;
            slot.appendChild(numDiv);
        }

        var content = document.createElement('div');
        content.className = 'player-content';
        
        var nameHTML = '<div class="player-field-name ' + (player.veteran ? 'veteran' : '') + '">' + 
            player.name + (player.veteran ? ' <i class="fas fa-star" style="color:var(--accent); font-size:0.75em;"></i>' : '') + 
            '</div>';
        
        var ratingHTML = '';
        if (player.rating) {
            ratingHTML = '<div class="player-field-rating">' + player.rating.toFixed(1) + '</div>';
        }
        
        content.innerHTML = nameHTML + ratingHTML;
        
        slot.appendChild(content);
        
        var removeBtn = document.createElement('button');
        removeBtn.className = 'remove-player-btn';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.onclick = function(e) {
            e.stopPropagation();
            removePlayerFromPosition(index);
        };
        removeBtn.ondragstart = function(e) { e.preventDefault(); e.stopPropagation(); };
        
        slot.appendChild(content);
        slot.appendChild(removeBtn);
        
        // Interaction
        slot.onmouseenter = function() { showPlayerPopover(pos.id, slot); };
        slot.onmouseleave = hidePlayerPopover;
        
        slot.onclick = function(e) {
            if (slot.classList.contains('dragging')) return;
            e.stopPropagation(); // Prevent bubbling
            
            // Toggle fixed popover on click if preferred, 
            // or just use click to remove as before but with a delay/long-press?
            // The prompt asks for hover/click to show details.
            showPlayerPopover(pos.id, slot);
            
            // To maintain "click to remove" functionality, 
            // maybe we only remove if they click the "X" specifically?
            // The existing code has a removeBtn.
        };
        
        // Allow Swap Drop
        slot.ondragover = handleDragOver;
        slot.ondragleave = handleDragLeave;
        slot.ondrop = function(e) { handleSlotDrop(e, index); };
    }
    return slot;
}

// ============================================================================
// POPOVER LOGIC
// ============================================================================

var activePopover = null;

function showPlayerPopover(playerId, anchorElement) {
    hidePlayerPopover();
    
    var p = rosterData.players[playerId];
    if (!p) return;
    
    var popover = document.createElement('div');
    popover.className = 'player-popover';
    
    var html = '<div class="popover-header">' +
               '  <span class="popover-name">' + p.name + '</span>' +
               (p.rating ? '  <span class="popover-rating"><i class="fas fa-star"></i> ' + p.rating + '</span>' : '') +
               '</div>';
               
    if (p.strengths && p.strengths.length > 0) {
        html += '<div class="popover-section">' +
                '  <span class="popover-label">Habilidades:</span>' +
                '  <div class="popover-tags">' +
                p.strengths.map(function(s) { return '<span class="popover-tag strength">' + s + '</span>'; }).join('') +
                '  </div>' +
                '</div>';
    }
    
    if (p.improvements && p.improvements.length > 0) {
        html += '<div class="popover-section">' +
                '  <span class="popover-label">A mejorar:</span>' +
                '  <div class="popover-tags">' +
                p.improvements.map(function(i) { return '<span class="popover-tag improvement">' + i + '</span>'; }).join('') +
                '  </div>' +
                '</div>';
    }
    
    popover.innerHTML = html;
    anchorElement.appendChild(popover);
    
    // Force reflow for animation
    setTimeout(function() {
        popover.classList.add('show');
    }, 10);
    
    activePopover = popover;
}

function hidePlayerPopover() {
    if (activePopover) {
        var p = activePopover;
        p.classList.remove('show');
        activePopover = null;
        // Immediate pointer-events disabling
        p.style.pointerEvents = 'none';
        
        // Remove from DOM after transition
        setTimeout(function() {
            if (p && p.parentNode) p.parentNode.removeChild(p);
        }, 200);
    }
    
    // Safety check: remove any stale popovers that might have been lost in race conditions
    document.querySelectorAll('.player-popover:not(.show)').forEach(function(stale) {
        if (!activePopover || stale !== activePopover) {
            setTimeout(function() {
                if (stale.parentNode) stale.parentNode.removeChild(stale);
            }, 250);
        }
    });
}

// Shared Drag Handlers to minimize function creation
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}
function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}


function handleSlotDrop(e, targetIndex) {
    e.preventDefault();
    e.stopPropagation(); // IMPORTANTE: Evitar que el campo recoja el drop como movimiento libre
    
    try {
        var data = e.dataTransfer.getData('text/plain');
        var source = data ? JSON.parse(data) : null;
        
        if (!source) {
             if (draggedPlayerId) {
                 assignPlayerToPosition(targetIndex, draggedPlayerId);
                 draggedPlayerId = null;
             }
             return;
        }
        
        if (source.type === 'field-move') {
            // Intercambiar Field <-> Field
            var fromIndex = source.index;
            if (fromIndex === targetIndex) return;
            
            var temp = currentLineup[targetIndex].id;
            currentLineup[targetIndex].id = currentLineup[fromIndex].id;
            currentLineup[fromIndex].id = temp;
            
            updateFieldDisplay();
            
            // Animación de intercambio
            var slots = document.querySelectorAll('.field-slot');
            slots.forEach(function(s) {
                var idx = s.dataset.positionIndex;
                if (idx == targetIndex || idx == fromIndex) {
                    s.classList.add('swapping');
                    setTimeout(function() { s.classList.remove('swapping'); }, 400);
                }
            });
            
            validateLineup();
            showNotification('Posiciones intercambiadas', 'success');
            
        } else if (source.type === 'roster-add') {
            // Asignar desde Roster
            assignPlayerToPosition(targetIndex, source.playerId);
        }
    } catch(err) { 
        console.error('Error en drop:', err);
        if (draggedPlayerId) {
             assignPlayerToPosition(targetIndex, draggedPlayerId);
             draggedPlayerId = null; 
        }
    }
}

function handleFieldFreeDrop(e, fieldEl) {
    var data = e.dataTransfer.getData('text/plain');
    if (!data) return;
    
    try {
        var source = JSON.parse(data);
        if (source.type === 'field-move') {
            var rect = fieldEl.getBoundingClientRect();
            var x = e.clientX - rect.left - (source.offsetX || 32); 
            var y = e.clientY - rect.top - (source.offsetY || 32);
            
            // Constrain
            x = Math.max(0, Math.min(x, rect.width - 64));
            y = Math.max(0, Math.min(y, rect.height - 64));
            
            // Convert to %
            var leftPct = (x / rect.width) * 100;
            var topPct = (y / rect.height) * 100;
            
            currentLineup[source.index].style = 'left:' + leftPct + '%; top:' + topPct + '%;';
            updateFieldDisplay();
        }
    } catch(err) { console.error(err); }
}

function assignPlayerToPosition(positionIndex, playerId) {
    // Check if already in lineup
    var alreadyAssigned = currentLineup.some(function(p, idx) {
        return p.id === playerId && idx !== positionIndex;
    });
    
    if (alreadyAssigned) {
        showNotification('Jugador ya está en otra posición', 'warning');
        return;
    }
    
    currentLineup[positionIndex].id = playerId;
    updateFieldDisplay();
    validateLineup();
    renderConvocatoria(); // Sincronizar lista
    
    var player = rosterData.players[playerId];
    showNotification(player.name + ' agregado', 'success');
}

function removePlayerFromPosition(positionIndex) {
    var playerId = currentLineup[positionIndex].id;
    if (!playerId) return;
    
    var player = rosterData.players[playerId];
    currentLineup[positionIndex].id = null;
    
    updateFieldDisplay();
    validateLineup();
    renderConvocatoria(); // Sincronizar lista
    showNotification(player.name + ' quitado', 'info');
}

// ============================================================================
// MOBILE/MODAL SELECTION LOGIC
// ============================================================================

var currentSlotIndex = null;

function openPlayerSelection(slotIndex) {
    currentSlotIndex = slotIndex;
    var modal = document.getElementById('player-selection-modal');
    var list = document.getElementById('modal-players-list');
    
    if (!modal || !list) return;
    
    list.innerHTML = '';
    
    // Suggest relevant roles
    var slotConfig = currentLineup[slotIndex];
    var suggestedRole = '';
    if (slotConfig.class.includes('goal')) suggestedRole = 'porteros';
    else if (slotConfig.class.includes('def')) suggestedRole = 'defensas';
    else if (slotConfig.class.includes('mid')) suggestedRole = 'medio';
    else if (slotConfig.class.includes('for')) suggestedRole = 'delanteros';
    
    document.getElementById('modal-title').textContent = 'Seleccionar ' + (suggestedRole ? suggestedRole.toUpperCase() : 'Jugador');
    
    // Sort: Suggested role first, then number
    var ids = Object.keys(rosterData.players);
    
    ids.sort(function(a, b) {
        var pA = rosterData.players[a];
        var pB = rosterData.players[b];
        
        // Check if players have the role
        var rolesA = getPlayerPositions(a).map(p => p.key);
        var rolesB = getPlayerPositions(b).map(p => p.key);
        
        var matchA = rolesA.includes(suggestedRole);
        var matchB = rolesB.includes(suggestedRole);
        
        if (matchA && !matchB) return -1;
        if (!matchA && matchB) return 1;
        
        return (parseInt(pA.number) || 99) - (parseInt(pB.number) || 99);
    });
    
    ids.forEach(function(id) {
        // Skip already assigned
        if (currentLineup.some(p => p.id === id)) return;
        
        var player = rosterData.players[id];
        var positions = getPlayerPositions(id);
        
        var item = document.createElement('div');
        item.className = 'modal-player-item';
        
        // Highlight compatible players
        var isCompatible = positions.some(p => p.key === suggestedRole);
        if (isCompatible) item.style.background = '#f0fdf4'; // Light green hint
        
        item.onclick = function() {
            assignPlayerToPosition(currentSlotIndex, id);
            closePlayerModal();
            renderConvocatoria(); // Sincronizar lista
        };
        
        var badge = document.createElement('div');
        badge.className = 'player-number-badge';
        badge.style.width = '32px'; 
        badge.style.height = '32px';
        badge.style.fontSize = '0.8rem';
        badge.textContent = player.number || '-';
        
        var info = document.createElement('div');
        info.style.flex = '1';
        
        var nameDiv = document.createElement('div');
        nameDiv.className = 'modal-player-name';
        nameDiv.textContent = player.name + (player.veteran ? ' ★' : '');
        
        var roleDiv = document.createElement('div');
        roleDiv.className = 'modal-player-number';
        roleDiv.textContent = positions.map(p => p.label).join(', ');
        
        info.appendChild(nameDiv);
        info.appendChild(roleDiv);
        
        item.appendChild(badge);
        item.appendChild(info);
        
        list.appendChild(item);
    });
    
    modal.classList.remove('hidden');
}

function closePlayerModal() {
    var modal = document.getElementById('player-selection-modal');
    if (modal) modal.classList.add('hidden');
    currentSlotIndex = null;
}

function changeFormation(formation) {
    var newFormation = getFormationConfig(formation);
    
    var doChange = function() {
        // Keep assigned players if possible
        var assignedPlayers = currentLineup.filter(function(p) { return p.id; }).map(function(p) { return p.id; });
        
        currentLineup = newFormation.map(function(pos, idx) {
            return {
                class: pos.class,
                style: pos.style,
                id: assignedPlayers[idx] || null
            };
        });
        
        updateFieldDisplay();
        validateLineup();
        renderConvocatoria(); // Sincronizar lista
        showNotification('Formación cambiada a ' + formation, 'success');
    };
    
    if (currentLineup.length !== newFormation.length) {
        showConfirm(
            'Cambiar formación',
            'Esto ajustará las posiciones. ¿Continuar?',
            doChange
        );
    } else {
        doChange();
    }
}

function clearLineup() {
    showConfirm(
        '¿Vaciar alineación?',
        'Se quitarán todos los jugadores del campo.',
        function() {
            currentLineup.forEach(function(pos) { pos.id = null; });
            updateFieldDisplay();
            validateLineup();
            renderConvocatoria(); // Sincronizar lista
            showNotification('Alineación vaciada', 'info');
        }
    );
}

function autoLineup() {
    showConfirm(
        'Alineación automática',
        '¿Deseas generar la mejor alineación posible priorizando veteranos y nivel de juego?',
        function() {
            var players = rosterData.players;
            var positions = rosterData.positions;
            var formation = currentLineup;
            
            // 1. Obtener todos los jugadores con sus datos procesados
            var pool = Object.keys(players).map(function(id) {
                var p = players[id];
                return { 
                    id: id, 
                    rating: parseFloat(p.rating) || 0, 
                    veteran: p.veteran || false
                };
            });

            // 2. SELECCIÓN: Priorizar EXACTAMENTE un Veterano y luego los mejores Ratings
            // Ordenar veteranos por rating para elegir al mejor como obligatorio
            var veterans = pool.filter(function(p) { return p.veteran; });
            veterans.sort(function(a, b) { return b.rating - a.rating; });

            var nonChosen = pool.filter(function(p) { return true; }); // Copia de todos los jugadores

            var chosenPlayers = [];
            
            // Elegir al mejor veterano disponible como obligatorio
            if (veterans.length > 0) {
                chosenPlayers.push(veterans[0]);
                // Eliminarlo de la bolsa de no elegidos
                nonChosen = nonChosen.filter(function(p) { return p.id !== veterans[0].id; });
            }

            // Ordenar el resto por rating descendente para completar los 6
            nonChosen.sort(function(a, b) { return b.rating - a.rating; });

            // Rellenar hasta tener 6 jugadores en total
            chosenPlayers = chosenPlayers.concat(nonChosen.slice(0, 6 - chosenPlayers.length));
            
            // Marcar como no asignados para el paso de ubicación en el campo
            chosenPlayers.forEach(function(p) { p.assigned = false; });

            // 3. ASIGNACIÓN AL CAMPO (Priorizar especialidades)
            formation.forEach(function(slot) { slot.id = null; });

            var classToKey = { 'goalkeeper': 'porteros', 'defender': 'defensas', 'midfielder': 'medio', 'forward': 'delanteros' };
            var priorityMap = { 'high-priority': 500, 'medium-priority': 200, 'low-priority': 50 };

            // Paso A: Asignar Portero primero (el más específico)
            var gkIdx = -1;
            for(var i=0; i<formation.length; i++) { if(formation[i].class.indexOf('goalkeeper') !== -1) { gkIdx = i; break; } }
            
            if (gkIdx !== -1) {
                chosenPlayers.sort(function(a, b) {
                    var aScore = (function() {
                        var list = positions.porteros || [];
                        for(var j=0; j<list.length; j++) { if(list[j].id === a.id) return priorityMap[list[j].priority] + a.rating; }
                        return a.rating;
                    })();
                    var bScore = (function() {
                        var list = positions.porteros || [];
                        for(var j=0; j<list.length; j++) { if(list[j].id === b.id) return priorityMap[list[j].priority] + b.rating; }
                        return b.rating;
                    })();
                    return bScore - aScore;
                });
                formation[gkIdx].id = chosenPlayers[0].id;
                chosenPlayers[0].assigned = true;
            }

            // Paso B: Asignar el resto buscando afinidad con el slot
            formation.forEach(function(slot, sIdx) {
                if (slot.id) return; // Saltamos el portero ya asignado

                var slotRole = null;
                for(var key in classToKey) { if (slot.class.indexOf(key) !== -1) { slotRole = classToKey[key]; break; } }

                var candidates = chosenPlayers.filter(function(p) { return !p.assigned; });
                candidates.sort(function(a, b) {
                    var aScore = (function() {
                        var list = positions[slotRole] || [];
                        for(var j=0; j<list.length; j++) { if(list[j].id === a.id) return priorityMap[list[j].priority] + a.rating; }
                        return a.rating;
                    })();
                    var bScore = (function() {
                        var list = positions[slotRole] || [];
                        for(var j=0; j<list.length; j++) { if(list[j].id === b.id) return priorityMap[list[j].priority] + b.rating; }
                        return b.rating;
                    })();
                    return bScore - aScore;
                });

                if (candidates.length > 0) {
                    formation[sIdx].id = candidates[0].id;
                    for(var i=0; i<chosenPlayers.length; i++) { if(chosenPlayers[i].id === candidates[0].id) { chosenPlayers[i].assigned = true; break; } }
                }
            });

            updateFieldDisplay();
            validateLineup();
            renderConvocatoria(); // Sincronizar lista
            showNotification('Alineación optimizada generada', 'success');
        }
    );
}


function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    var isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    
    var icon = document.getElementById('theme-icon');
    if (icon) {
        // If dark mode is active, show SUN (to switch to light)
        // If light mode is active, show MOON (to switch to dark)
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Check saved theme on load
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    // Ensure icon matches on load
    var icon = document.getElementById('theme-icon');
    if (icon) icon.className = 'fas fa-sun';
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateLineup() {
    var warnings = document.getElementById('lineup-warnings');
    if (!warnings) return;
    
    warnings.innerHTML = '';
    var issues = [];
    
    var emptyCount = currentLineup.filter(function(p) { return !p.id; }).length;
    var filledCount = currentLineup.length - emptyCount;
    
    if (filledCount === 0) {
        issues.push({ type: 'info', icon: 'info-circle', text: 'Alineación vacía. Arrastra jugadores o usa Auto.' });
    } else if (emptyCount > 0) {
        issues.push({ type: 'warning', icon: 'exclamation-triangle', text: emptyCount + ' posición(es) sin asignar' });
    }
    
    if (!rosterData || !rosterData.players) return [];

    var veteranIds = Object.keys(rosterData.players).filter(function(id) {
        return rosterData.players[id].veteran;
    });
    
    var veteransInLineup = currentLineup.filter(function(p) {
        return p.id && rosterData.players[p.id].veteran;
    }).length;
    
    if (veteransInLineup < 1 && filledCount > 0) {
        issues.push({ type: 'error', icon: 'star', text: 'Se requiere al menos 1 veterano en cancha' });
    }
    
    if (issues.length === 0 && filledCount === currentLineup.length) {
        warnings.innerHTML = '<div class="lineup-success"><i class="fas fa-check-circle"></i> Alineación completa</div>';
    } else {
        issues.forEach(function(issue) {
            var div = document.createElement('div');
            div.className = 'lineup-alert lineup-' + issue.type;
            div.innerHTML = '<i class="fas fa-' + issue.icon + '"></i> ' + issue.text;
            warnings.appendChild(div);
        });
    }
}

// ============================================================================
// UTILITIES
// ============================================================================

function getPlayerPositions(playerId) {
    var positions = [];
    var positionMap = {
        'porteros': { label: 'POR', full: 'Portero', key: 'porteros' },
        'defensas': { label: 'DEF', full: 'Defensa', key: 'defensas' },
        'medio': { label: 'MED', full: 'Mediocampista', key: 'medio' },
        'delanteros': { label: 'DEL', full: 'Delantero', key: 'delanteros' }
    };
    
    var priorityNames = {
        'high-priority': 'Alta',
        'medium-priority': 'Media',
        'low-priority': 'Baja'
    };
    
    Object.keys(rosterData.positions).forEach(function(posKey) {
        var posList = rosterData.positions[posKey] || [];
        posList.forEach(function(entry) {
            if (entry.id === playerId) {
                var pos = positionMap[posKey];
                if (pos) {
                    positions.push({
                        label: pos.label,
                        full: pos.full,
                        key: pos.key,
                        priority: priorityNames[entry.priority] || 'Normal'
                    });
                }
            }
        });
    });
    
    return positions;
}

function highlightVeterans() {
    document.querySelectorAll('.player-name.veteran').forEach(function(player) {
        var playerItem = player.closest('.player-item');
        if (playerItem) playerItem.style.backgroundColor = '#f0f8ff';
    });
}

function showNotification(message, type) {
    type = type || 'info';
    
    var notification = document.createElement('div');
    notification.className = 'notification notification-' + type;
    notification.textContent = message;
    
    var colors = { success: '#4caf50', error: '#e53935', warning: '#ff9800', info: '#2196f3' };
    
    notification.style.cssText = 
        'position: fixed; bottom: 20px; right: 20px; padding: 16px 24px;' +
        'background: ' + (colors[type] || colors.info) + '; color: white;' +
        'border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 3000;' +
        'animation: slideIn 0.3s ease; font-weight: 500; max-width: 300px;';
    
    document.body.appendChild(notification);
    
    setTimeout(function() {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(function() { notification.remove(); }, 300);
    }, 3000);
}

var style = document.createElement('style');
style.textContent = 
    '@keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }' +
    '@keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; } }';
document.head.appendChild(style);

// ============================================================================
// MODAL SYSTEM
// ============================================================================

function showConfirm(title, message, onConfirm, onCancel) {
    // Remove existing modal if any
    var existingContext = document.querySelector('.custom-modal-overlay');
    if (existingContext) existingContext.remove();

    var modal = document.createElement('div');
    modal.className = 'custom-modal-overlay';
    modal.innerHTML = 
        '<div class="custom-modal">' +
        '  <div class="custom-modal-header">' +
        '    <h3>' + title + '</h3>' +
        '  </div>' +
        '  <div class="custom-modal-body">' +
        '    <p>' + message + '</p>' +
        '  </div>' +
        '  <div class="custom-modal-footer">' +
        '    <button class="btn-modal btn-cancel" id="modal-cancel-btn">' +
        '      <i class="fas fa-times"></i> Cancelar' +
        '    </button>' +
        '    <button class="btn-modal btn-confirm" id="modal-confirm-btn">' +
        '      <i class="fas fa-check"></i> Confirmar' +
        '    </button>' +
        '  </div>' +
        '</div>';
    
    document.body.appendChild(modal);
    
    // Force reflow for animation
    void modal.offsetWidth;
    modal.classList.add('show');
    
    // Event handling - direct IDs are safer than bubbling
    document.getElementById('modal-cancel-btn').onclick = function() {
        closeModal();
        if (onCancel) onCancel();
    };
    
    document.getElementById('modal-confirm-btn').onclick = function() {
        closeModal();
        if (onConfirm) onConfirm();
    };
    
    // Close on background click
    modal.onclick = function(e) {
        if (e.target === modal) {
            closeModal();
            if (onCancel) onCancel();
        }
    };
    
    function closeModal() {
        modal.classList.remove('show');
        setTimeout(function() { 
            if (modal.parentNode) modal.parentNode.removeChild(modal); 
        }, 300);
    }
}

// ============================================================================
// EXPORT TO PNG
// ============================================================================

function exportLineupToPNG() {
    var field = document.getElementById('field');
    if (!field) {
        showNotification('No se encontró el campo', 'error');
        return;
    }
    
    var emptyCount = currentLineup.filter(function(p) { return !p.id; }).length;
    if (emptyCount === currentLineup.length) {
        showNotification('La alineación está vacía', 'warning');
        return;
    }
    
    // Check if html2canvas is loaded
    if (typeof html2canvas === 'undefined') {
        showNotification('Cargando librería...', 'info');
        
        var script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = function() {
            performExport();
        };
        script.onerror = function() {
            showNotification('Error cargando librería de exportación', 'error');
        };
        document.head.appendChild(script);
    } else {
        performExport();
    }
    
    function performExport() {
        showNotification('Generando imagen...', 'info');
        
        html2canvas(field, {
            backgroundColor: '#4a7c59',
            scale: 2,
            logging: false
        }).then(function(canvas) {
            var link = document.createElement('a');
            var formation = document.getElementById('formation-select').value;
            link.download = 'alineacion-' + formation + '-' + Date.now() + '.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            showNotification('Imagen descargada', 'success');
        }).catch(function(error) {
            console.error('Error:', error);
            showNotification('Error al exportar', 'error');
        });
    }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Iniciando aplicación');
    
    initRoster();
    
    var formationSelect = document.getElementById('formation-select');
    if (formationSelect) {
        formationSelect.addEventListener('change', function(e) {
            changeFormation(e.target.value);
        });
    }

    // Field Container Drop Zone (For Free positioning)
    var fieldEl = document.getElementById('field');
    if (fieldEl) {
        fieldEl.ondragover = function(e) {
            e.preventDefault();
        };
        
        fieldEl.ondrop = function(e) {
            e.preventDefault();
            handleFieldFreeDrop(e, fieldEl);
        };
    }
    
    function bindBtn(id, handler) {
        var btn = document.getElementById(id);
        if (btn) {
            btn.onclick = function(e) { /* Direct onclick to ensure no overriding issues */
                e.preventDefault();
                handler();
            };
        } else {
            console.warn('Button not found:', id);
        }
    }

    bindBtn('btn-auto-lineup', autoLineup);
    bindBtn('btn-clear-lineup', clearLineup);
    bindBtn('btn-reset-lineup', resetLineup);
    bindBtn('btn-export-png', exportLineupToPNG);
    
    // Select All and Clear All removed from HTML but keeping safe logic
    var btnSelectAll = document.getElementById('btn-select-all');
    if (btnSelectAll) btnSelectAll.onclick = function(e) { e.preventDefault(); selectAllPlayers(); };
    
    var btnClearAll = document.getElementById('btn-clear-all');
    if (btnClearAll) btnClearAll.onclick = function(e) { e.preventDefault(); clearConvocatoria(); };
});

// ============================================================================
// PUBLIC API
// ============================================================================

window.changeFormation = changeFormation;
window.autoLineup = autoLineup;
window.resetLineup = resetLineup;
window.clearLineup = clearLineup;
window.selectAllPlayers = selectAllPlayers;
window.clearConvocatoria = clearConvocatoria;
window.exportLineupToPNG = exportLineupToPNG;