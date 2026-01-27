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

var rosterData = null;
var currentLineup = []; // Empieza vacío
var convocatoria = new Set(); // Jugadores convocados
var draggedPlayerId = null;
var draggedFromConvocatoria = false;
var savedConvocatorias = []; // Convocatorias guardadas

// ============================================================================
// INITIALIZATION
// ============================================================================

function initRoster() {
    console.log('Iniciando carga del roster...');
    
    fetch('data/roster.json')
        .then(function(res) {
            if (!res.ok) throw new Error('Error cargando roster.json');
            return res.json();
        })
        .then(function(data) {
            rosterData = data;
            console.log('Datos cargados');

            // NO inicializar convocatoria automáticamente
            // El usuario debe seleccionar manualmente

            // Render sections
            renderPositionLists();
            renderFullRoster();
            renderDT();
            renderCaptains();
            renderConvocatoria();
            initializeEmptyLineup(); // Campo vacío con formación 1-2-2-1
            updateConvocatoriaStats();
            highlightVeterans();
            loadSavedConvocatorias(); // Cargar convocatorias guardadas
            
            console.log('Renderizado completado');
        })
        .catch(function(err) {
            console.error('Error:', err);
            showNotification('Error al cargar datos', 'error');
        });
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

        var name = document.createElement('span');
        name.className = 'player-name' + (playerRef.veteran ? ' veteran' : '');
        name.textContent = playerRef.name;

        var number = document.createElement('span');
        number.className = 'player-number';
        number.textContent = playerRef.number ? ('N° ' + playerRef.number) : 'S/N';

        info.appendChild(name);
        info.appendChild(number);
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

        var badge = document.createElement('div');
        badge.className = 'player-number-badge';
        badge.textContent = p.number || '—';

        var info = document.createElement('div');
        info.className = 'roster-info';

        var name = document.createElement('span');
        name.className = 'roster-name' + (p.veteran ? ' veteran' : '');
        name.textContent = p.name;

        info.appendChild(name);
        card.appendChild(badge);
        card.appendChild(info);
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

    var nameEl = document.createElement('span');
    nameEl.className = 'dt-name';
    nameEl.textContent = player.name;
    dtContainer.appendChild(nameEl);

    if (player.number) {
        var numEl = document.createElement('span');
        numEl.className = 'dt-number';
        numEl.textContent = 'N° ' + player.number;
        dtContainer.appendChild(numEl);
    }
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
// CONVOCATORIA
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
        var player = rosterData.players[id];
        
        var item = document.createElement('div');
        item.className = 'convocado-item' + (player.veteran ? ' veteran-item' : '');
        item.dataset.playerId = id;
        item.setAttribute('draggable', 'true');
        
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'convocado-checkbox';
        checkbox.id = 'conv-' + id;
        checkbox.checked = convocatoria.has(id);
        
        checkbox.addEventListener('change', function() {
            toggleConvocatoria(id);
        });
        
        var badge = document.createElement('div');
        badge.className = 'player-badge-mini';
        badge.textContent = player.number || '—';
        
        var nameSpan = document.createElement('span');
        nameSpan.className = 'convocado-name' + (player.veteran ? ' veteran' : '');
        nameSpan.textContent = player.name;
        
        // Drag handlers
        item.ondragstart = function(e) {
            if (!convocatoria.has(id)) {
                e.preventDefault();
                showNotification('Marca el checkbox primero para convocar', 'warning');
                return;
            }
            draggedPlayerId = id;
            draggedFromConvocatoria = true;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        };
        
        item.ondragend = function() {
            item.classList.remove('dragging');
            draggedFromConvocatoria = false;
        };
        
        item.appendChild(checkbox);
        item.appendChild(badge);
        item.appendChild(nameSpan);
        
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
    var player = rosterData.players[playerId];
    
    if (convocatoria.has(playerId)) {
        // Deseleccionar
        convocatoria.delete(playerId);
        
        // Quitar de alineación si está
        var found = false;
        currentLineup.forEach(function(pos) {
            if (pos.id === playerId) {
                pos.id = null;
                found = true;
            }
        });
        
        if (found) {
            updateFieldDisplay();
            showNotification(player.name + ' quitado de alineación', 'info');
        }
    } else {
        // Seleccionar
        convocatoria.add(playerId);
    }
    
    updateConvocatoriaStats();
    validateLineup();
}

function updateConvocatoriaStats() {
    var count = document.getElementById('convocados-count');
    if (count) count.textContent = convocatoria.size;
}

function selectAllPlayers() {
    Object.keys(rosterData.players).forEach(function(id) {
        convocatoria.add(id);
    });
    renderConvocatoria();
    updateConvocatoriaStats();
    showNotification('Todos convocados', 'success');
}

function clearConvocatoria() {
    showConfirm(
        '¿Limpiar convocatoria?',
        'Se vaciará también la alineación.',
        function() {
            convocatoria.clear();
            currentLineup.forEach(function(pos) { pos.id = null; });
            
            renderConvocatoria();
            updateConvocatoriaStats();
            updateFieldDisplay();
            validateLineup();
            
            showNotification('Convocatoria y alineación limpiadas', 'success');
        }
    );
}

// ============================================================================
// FIELD & LINEUP
// ============================================================================

function getFormationConfig(formation) {
    var configs = {
        '1-2-2-1': [
            { class: 'goalkeeper', style: 'top: 50%; left: 8%; transform: translateY(-50%);' },
            { class: 'defender-1', style: 'top: 30%; left: 28%;' },
            { class: 'defender-2', style: 'top: 70%; left: 28%;' },
            { class: 'midfielder-1', style: 'top: 30%; left: 55%;' },
            { class: 'midfielder-2', style: 'top: 70%; left: 55%;' },
            { class: 'forward', style: 'top: 50%; left: 80%; transform: translateY(-50%);' }
        ],
        '1-2-1-1': [
            { class: 'goalkeeper', style: 'top: 50%; left: 8%; transform: translateY(-50%);' },
            { class: 'defender-1', style: 'top: 35%; left: 30%;' },
            { class: 'defender-2', style: 'top: 65%; left: 30%;' },
            { class: 'midfielder-1', style: 'top: 35%; left: 55%;' },
            { class: 'midfielder-2', style: 'top: 65%; left: 55%;' },
            { class: 'forward', style: 'top: 50%; left: 80%; transform: translateY(-50%);' }
        ],
        '2-1-2': [
            { class: 'goalkeeper', style: 'top: 35%; left: 10%;' },
            { class: 'goalkeeper', style: 'top: 65%; left: 10%;' },
            { class: 'midfielder-1', style: 'top: 50%; left: 45%; transform: translateY(-50%);' },
            { class: 'forward', style: 'top: 35%; left: 75%;' },
            { class: 'forward-2', style: 'top: 65%; left: 75%;' }
        ],
        '1-3-2': [
            { class: 'goalkeeper', style: 'top: 50%; left: 8%; transform: translateY(-50%);' },
            { class: 'defender-1', style: 'top: 20%; left: 35%;' },
            { class: 'defender-2', style: 'top: 50%; left: 35%; transform: translateY(-50%);' },
            { class: 'defender-3', style: 'top: 80%; left: 35%;' },
            { class: 'forward', style: 'top: 35%; left: 75%;' },
            { class: 'forward-2', style: 'top: 65%; left: 75%;' }
        ],
        '1-2-3': [
            { class: 'goalkeeper', style: 'top: 50%; left: 8%; transform: translateY(-50%);' },
            { class: 'defender-1', style: 'top: 35%; left: 25%;' },
            { class: 'defender-2', style: 'top: 65%; left: 25%;' },
            { class: 'forward', style: 'top: 20%; left: 70%;' },
            { class: 'midfielder-1', style: 'top: 50%; left: 70%; transform: translateY(-50%);' },
            { class: 'forward-2', style: 'top: 80%; left: 70%;' }
        ],
        '1-4-1': [
            { class: 'goalkeeper', style: 'top: 50%; left: 8%; transform: translateY(-50%);' },
            { class: 'defender-1', style: 'top: 20%; left: 35%;' },
            { class: 'defender-2', style: 'top: 40%; left: 35%;' },
            { class: 'defender-3', style: 'top: 60%; left: 35%;' },
            { class: 'defender-4', style: 'top: 80%; left: 35%;' },
            { class: 'forward', style: 'top: 50%; left: 75%; transform: translateY(-50%);' }
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

function updateFieldDisplay() {
    var fieldEl = document.getElementById('field');
    if (!fieldEl) return;
    
    fieldEl.innerHTML = '';
    
    // Goal area
    var hasGoalkeeper = currentLineup.some(function(p) { return p.class === 'goalkeeper'; });
    if (hasGoalkeeper) {
        var goal = document.createElement('div');
        goal.className = 'goal-area goal-left';
        fieldEl.appendChild(goal);
    }
    
    // Render positions
    currentLineup.forEach(function(pos, index) {
        if (!pos) return;
        
        var slot = document.createElement('div');
        slot.className = 'field-slot ' + (pos.class || '');
        slot.dataset.positionIndex = index;
        slot.setAttribute('style', pos.style);
        
        if (!pos.id) {
            // Empty slot
            slot.classList.add('empty-slot');
            slot.innerHTML = '<i class="fas fa-plus"></i>';
            slot.title = 'Arrastra un jugador aquí';
            
            // Drop target
            slot.ondragover = function(e) {
                e.preventDefault();
                if (draggedFromConvocatoria && draggedPlayerId) {
                    slot.classList.add('drag-over');
                }
            };
            
            slot.ondragleave = function() {
                slot.classList.remove('drag-over');
            };
            
            slot.ondrop = function(e) {
                e.preventDefault();
                slot.classList.remove('drag-over');
                
                if (draggedFromConvocatoria && draggedPlayerId) {
                    assignPlayerToPosition(index, draggedPlayerId);
                }
            };
        } else {
            // Occupied slot
            var player = rosterData.players[pos.id];
            if (!player) return;
            
            slot.classList.add('occupied-slot');
            if (player.veteran) slot.classList.add('veteran-player');
            
            var content = document.createElement('div');
            content.className = 'player-content';
            content.innerHTML = 
                '<span class="player-field-name">' + player.name + '</span>' +
                (player.number ? '<span class="player-field-number">#' + player.number + '</span>' : '');
            
            var removeBtn = document.createElement('button');
            removeBtn.className = 'remove-player-btn';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.title = 'Quitar';
            removeBtn.onclick = function(e) {
                e.stopPropagation();
                removePlayerFromPosition(index);
            };
            
            slot.appendChild(content);
            slot.appendChild(removeBtn);
            
            // Click to remove
            slot.addEventListener('click', function() {
                removePlayerFromPosition(index);
            });
        }
        
        fieldEl.appendChild(slot);
    });
}

function assignPlayerToPosition(positionIndex, playerId) {
    if (!convocatoria.has(playerId)) {
        showNotification('Jugador no convocado', 'error');
        return;
    }
    
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
    showNotification(player.name + ' quitado', 'info');
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
            showNotification('Alineación vaciada', 'info');
        }
    );
}

function autoLineup() {
    if (convocatoria.size === 0) {
        showNotification('Primero convoca jugadores', 'warning');
        return;
    }
    
    showConfirm(
        'Alineación automática',
        '¿Crear alineación con jugadores convocados?',
        function() {
    
    var convocadosArray = Array.from(convocatoria);
    
    currentLineup.forEach(function(position) {
        var positionKey = null;
        var posClass = position.class;
        
        if (posClass.includes('goalkeeper')) positionKey = 'porteros';
        else if (posClass.includes('defender')) positionKey = 'defensas';
        else if (posClass.includes('midfielder')) positionKey = 'medio';
        else if (posClass.includes('forward')) positionKey = 'delanteros';
        
        if (!positionKey) return;
        
        var availablePlayers = (rosterData.positions[positionKey] || []).filter(function(entry) {
            return convocadosArray.indexOf(entry.id) !== -1 && 
                   !currentLineup.some(function(p) { return p.id === entry.id; });
        });
        
        availablePlayers.sort(function(a, b) {
            var priorityOrder = { 'high-priority': 0, 'medium-priority': 1, 'low-priority': 2 };
            return (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
        });
        
        if (availablePlayers.length > 0) {
            position.id = availablePlayers[0].id;
        }
    });
    
    updateFieldDisplay();
    validateLineup();
    showNotification('Alineación automática creada', 'success');
        }
    );
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
    
    var veteranIds = Object.keys(rosterData.players).filter(function(id) {
        return rosterData.players[id].veteran;
    });
    
    var veteransInLineup = currentLineup.filter(function(p) {
        return p.id && veteranIds.indexOf(p.id) !== -1;
    }).length;
    
    if (veteransInLineup < veteranIds.length && filledCount > 0) {
        issues.push({ type: 'error', icon: 'star', text: 'Faltan ' + (veteranIds.length - veteransInLineup) + ' veterano(s)' });
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
        '    <button class="btn-modal btn-cancel" data-action="cancel">' +
        '      <i class="fas fa-times"></i> Cancelar' +
        '    </button>' +
        '    <button class="btn-modal btn-confirm" data-action="confirm">' +
        '      <i class="fas fa-check"></i> Confirmar' +
        '    </button>' +
        '  </div>' +
        '</div>';
    
    document.body.appendChild(modal);
    
    setTimeout(function() { modal.classList.add('show'); }, 10);
    
    modal.onclick = function(e) {
        if (e.target.classList.contains('custom-modal-overlay') || 
            e.target.dataset.action === 'cancel') {
            closeModal();
            if (onCancel) onCancel();
        } else if (e.target.closest('[data-action="confirm"]')) {
            closeModal();
            if (onConfirm) onConfirm();
        }
    };
    
    function closeModal() {
        modal.classList.remove('show');
        setTimeout(function() { modal.remove(); }, 300);
    }
}

function showInputModal(title, message, placeholder, onConfirm) {
    var modal = document.createElement('div');
    modal.className = 'custom-modal-overlay';
    modal.innerHTML = 
        '<div class="custom-modal">' +
        '  <div class="custom-modal-header">' +
        '    <h3>' + title + '</h3>' +
        '  </div>' +
        '  <div class="custom-modal-body">' +
        '    <p>' + message + '</p>' +
        '    <input type="text" class="modal-input" id="modal-input-field" placeholder="' + placeholder + '" />' +
        '  </div>' +
        '  <div class="custom-modal-footer">' +
        '    <button class="btn-modal btn-cancel" data-action="cancel">' +
        '      <i class="fas fa-times"></i> Cancelar' +
        '    </button>' +
        '    <button class="btn-modal btn-confirm" data-action="confirm">' +
        '      <i class="fas fa-check"></i> Guardar' +
        '    </button>' +
        '  </div>' +
        '</div>';
    
    document.body.appendChild(modal);
    setTimeout(function() { 
        modal.classList.add('show');
        var input = document.getElementById('modal-input-field');
        if (input) input.focus();
    }, 10);
    
    var input = document.getElementById('modal-input-field');
    input.onkeypress = function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.querySelector('[data-action="confirm"]').click();
        }
    };
    
    modal.onclick = function(e) {
        if (e.target.classList.contains('custom-modal-overlay') || 
            e.target.dataset.action === 'cancel') {
            closeModal();
        } else if (e.target.closest('[data-action="confirm"]')) {
            var value = document.getElementById('modal-input-field').value;
            closeModal();
            if (onConfirm) onConfirm(value);
        }
    };
    
    function closeModal() {
        modal.classList.remove('show');
        setTimeout(function() { modal.remove(); }, 300);
    }
}

// ============================================================================
// CONVOCATORIA STORAGE
// ============================================================================

function saveConvocatoria() {
    if (convocatoria.size === 0) {
        showNotification('No hay jugadores convocados', 'warning');
        return;
    }
    
    showInputModal(
        'Guardar Convocatoria',
        'Ingresa un nombre para identificar esta convocatoria:',
        'Ej: Partido vs Equipo X',
        function(name) {
            if (!name || name.trim() === '') {
                showNotification('Debes ingresar un nombre', 'warning');
                return;
            }
            
            var saved = {
                id: Date.now(),
                name: name.trim(),
                date: new Date().toISOString(),
                players: Array.from(convocatoria)
            };
            
            savedConvocatorias.push(saved);
            localStorage.setItem('convocatorias', JSON.stringify(savedConvocatorias));
            
            showNotification('Convocatoria guardada: ' + name.trim(), 'success');
            updateSavedCount();
        }
    );
}

function loadSavedConvocatorias() {
    try {
        var stored = localStorage.getItem('convocatorias');
        if (stored) {
            savedConvocatorias = JSON.parse(stored);
            updateSavedCount();
        }
    } catch (e) {
        console.error('Error cargando convocatorias:', e);
    }
}

function loadConvocatoria(id) {
    var saved = savedConvocatorias.find(function(c) { return c.id === id; });
    if (!saved) return;
    
    showConfirm(
        'Cargar convocatoria',
        '¿Cargar "' + saved.name + '"? Se perderá la convocatoria actual.',
        function() {
            convocatoria.clear();
            saved.players.forEach(function(playerId) {
                if (rosterData.players[playerId]) {
                    convocatoria.add(playerId);
                }
            });
            
            renderConvocatoria();
            updateConvocatoriaStats();
            showNotification('Convocatoria cargada', 'success');
        }
    );
}

function deleteConvocatoria(id) {
    var saved = savedConvocatorias.find(function(c) { return c.id === id; });
    if (!saved) return;
    
    showConfirm(
        'Eliminar convocatoria',
        '¿Eliminar "' + saved.name + '"?',
        function() {
            savedConvocatorias = savedConvocatorias.filter(function(c) { return c.id !== id; });
            localStorage.setItem('convocatorias', JSON.stringify(savedConvocatorias));
            showSavedConvocatoriasModal();
            updateSavedCount();
            showNotification('Convocatoria eliminada', 'info');
        }
    );
}

function showSavedConvocatoriasModal() {
    var modal = document.createElement('div');
    modal.className = 'custom-modal-overlay';
    modal.id = 'saved-modal';
    
    var content = '<div class="custom-modal modal-large">' +
        '<div class="custom-modal-header">' +
        '  <h3><i class="fas fa-folder-open"></i> Convocatorias Guardadas</h3>' +
        '  <button class="modal-close" onclick="document.getElementById(\'saved-modal\').remove()">' +
        '    <i class="fas fa-times"></i>' +
        '  </button>' +
        '</div>' +
        '<div class="custom-modal-body">';
    
    if (savedConvocatorias.length === 0) {
        content += '<div class="empty-state">' +
            '<i class="fas fa-folder-open"></i>' +
            '<p>No hay convocatorias guardadas</p>' +
            '<small>Marca jugadores y guarda tu primera convocatoria</small>' +
            '</div>';
    } else {
        content += '<div class="saved-list">';
        savedConvocatorias.slice().reverse().forEach(function(saved) {
            var date = new Date(saved.date);
            var dateStr = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
            var timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            
            content += '<div class="saved-item">' +
                '<div class="saved-item-icon"><i class="fas fa-clipboard-list"></i></div>' +
                '<div class="saved-item-info">' +
                '  <div class="saved-item-name">' + saved.name + '</div>' +
                '  <div class="saved-item-meta">' +
                '    <span><i class="fas fa-users"></i> ' + saved.players.length + ' jugadores</span>' +
                '    <span><i class="fas fa-calendar"></i> ' + dateStr + '</span>' +
                '    <span><i class="fas fa-clock"></i> ' + timeStr + '</span>' +
                '  </div>' +
                '</div>' +
                '<div class="saved-item-actions">' +
                '  <button class="btn-icon-large btn-load-conv" onclick="loadConvocatoria(' + saved.id + ')" title="Cargar">' +
                '    <i class="fas fa-download"></i>' +
                '  </button>' +
                '  <button class="btn-icon-large btn-delete-conv" onclick="deleteConvocatoria(' + saved.id + ')" title="Eliminar">' +
                '    <i class="fas fa-trash-alt"></i>' +
                '  </button>' +
                '</div>' +
                '</div>';
        });
        content += '</div>';
    }
    
    content += '</div></div>';
    modal.innerHTML = content;
    
    document.body.appendChild(modal);
    setTimeout(function() { modal.classList.add('show'); }, 10);
    
    modal.onclick = function(e) {
        if (e.target.classList.contains('custom-modal-overlay')) {
            modal.classList.remove('show');
            setTimeout(function() { modal.remove(); }, 300);
        }
    };
}

function updateSavedCount() {
    var badge = document.getElementById('saved-count');
    if (badge) {
        badge.textContent = savedConvocatorias.length;
        badge.style.display = savedConvocatorias.length > 0 ? 'inline-flex' : 'none';
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
    
    var btnAutoLineup = document.getElementById('btn-auto-lineup');
    if (btnAutoLineup) {
        btnAutoLineup.addEventListener('click', function(e) {
            e.preventDefault();
            autoLineup();
        });
    }
    
    var btnClearLineup = document.getElementById('btn-clear-lineup');
    if (btnClearLineup) {
        btnClearLineup.addEventListener('click', function(e) {
            e.preventDefault();
            clearLineup();
        });
    }
    
    var btnSelectAll = document.getElementById('btn-select-all');
    if (btnSelectAll) {
        btnSelectAll.addEventListener('click', function(e) {
            e.preventDefault();
            selectAllPlayers();
        });
    }
    
    var btnClearAll = document.getElementById('btn-clear-all');
    if (btnClearAll) {
        btnClearAll.addEventListener('click', function(e) {
            e.preventDefault();
            clearConvocatoria();
        });
    }
    
    var btnSaveConv = document.getElementById('btn-save-conv');
    if (btnSaveConv) {
        btnSaveConv.addEventListener('click', function(e) {
            e.preventDefault();
            saveConvocatoria();
        });
    }
    
    var btnViewSaved = document.getElementById('btn-view-saved');
    if (btnViewSaved) {
        btnViewSaved.addEventListener('click', function(e) {
            e.preventDefault();
            showSavedConvocatoriasModal();
        });
    }
    
    var btnExportPng = document.getElementById('btn-export-png');
    if (btnExportPng) {
        btnExportPng.addEventListener('click', function(e) {
            e.preventDefault();
            exportLineupToPNG();
        });
    }
});

// ============================================================================
// PUBLIC API
// ============================================================================

window.changeFormation = changeFormation;
window.autoLineup = autoLineup;
window.clearLineup = clearLineup;
window.selectAllPlayers = selectAllPlayers;
window.clearConvocatoria = clearConvocatoria;
window.saveConvocatoria = saveConvocatoria;
window.loadConvocatoria = loadConvocatoria;
window.exportLineupToPNG = exportLineupToPNG;