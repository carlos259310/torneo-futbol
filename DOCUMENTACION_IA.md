# Documentación Técnica - Sistema de Gestión de Equipo de Fútbol 6

## 📋 Resumen Ejecutivo

Aplicación web para gestionar plantilla, convocatorias y alineaciones de un equipo de fútbol 6.

- **Tecnologías**: HTML5, CSS3, JavaScript vanilla (ES5)
- **Almacenamiento**: JSON local + localStorage
- **Sin dependencias** (excepto html2canvas para exportación)

---

## 🗂️ Estructura de Archivos

```
TORNEO DE FUTBOL/
├── index.html              # Página principal (producción)
├── index.backup.html       # Backup con lógica inline
├── script.js               # Lógica de la aplicación
├── styles.css              # Estilos y diseño responsive
├── README.md              # Instrucciones de usuario
├── DOCUMENTACION_IA.md    # Este documento
└── data/
    └── roster.json        # Base de datos JSON
```

---

## 📊 Modelo de Datos (roster.json)

### Estructura Completa

```json
{
  "players": {
    "ID": {
      "name": "Nombre Completo",
      "number": "Número",
      "veteran": boolean,
      "rating": float,
      "strengths": ["Habilidad 1", "Habilidad 2"],
      "improvements": ["Aspecto 1", "Aspecto 2"]
    }
  },
  "positions": {
    "porteros": [{ "id": "ID", "priority": "high|medium|low-priority" }],
    "defensas": [...],
    "medio": [...],
    "delanteros": [...]
  },
  "captains": [
    { "order": 1, "id": "ID" }
  ],
  "dt": {
    "id": "ID"
  },
  "field": [
    { "class": "goalkeeper", "id": "ID", "side": "left" }
  ]
}
```

### Campos Importantes

- **players**: Mapa de jugadores por ID único
- **veteran**: `true` para jugadores obligatorios en alineación
- **rating**: Calificación del jugador (usada para priorizar en auto-alineación)
- **strengths**: Lista de fortalezas/habilidades (se muestran en popover)
- **improvements**: Aspectos a mejorar (se muestran en popover)
- **priority**: Orden de preferencia para auto-alineación
- **positions**: Jugadores agrupados por rol con prioridad
- **field**: Configuración inicial del campo (no se usa en runtime, solo referencia)

---

## 🔧 Arquitectura del Código (script.js)

### Variables Globales

```javascript
var rosterData = null; // Datos cargados desde JSON
var currentLineup = []; // Alineación actual en campo
var convocatoria = new Set(); // IDs de jugadores convocados
var draggedPlayerId = null; // ID del jugador siendo arrastrado
var draggedFromConvocatoria = false; // Flag de origen del drag
var savedConvocatorias = []; // Convocatorias guardadas
```

### Flujo de Inicialización

1. **DOMContentLoaded** → `initRoster()`
2. **fetch('data/roster.json')** → Carga datos
3. Renderización inicial:
   - `renderPositionLists()` → Listas por posición
   - `renderFullRoster()` → Grid completo de plantilla
   - `renderDT()` → Director técnico
   - `renderCaptains()` → Capitanes
   - `renderConvocatoria()` → Lista de convocatoria
   - `initializeEmptyLineup()` → Campo vacío (formación 1-2-2-1)
   - `loadSavedConvocatorias()` → Cargar historial del localStorage

### Funciones Principales

#### Gestión de Convocatoria

- **`toggleConvocatoria(playerId)`**: Convoca/desconvoca jugador
- **`selectAllPlayers()`**: Convoca a todos
- **`clearConvocatoria()`**: Limpia convocatoria y campo
- **`saveConvocatoria()`**: Guarda convocatoria actual en localStorage
- **`loadConvocatoria(id)`**: Carga convocatoria guardada
- **`deleteConvocatoria(id)`**: Elimina convocatoria guardada
- **`renderSavedConvocatorias()`**: Renderiza lista de guardadas

#### Gestión de Alineación

- **`getFormationConfig(formation)`**: Retorna configuración de posiciones para cada formación
  - Formaciones: `1-2-2-1`, `1-2-1-1`, `2-1-2`, `1-3-2`, `1-2-3`, `1-4-1`
  - Retorna array de objetos: `{ class, style, id }`
- **`updateFieldDisplay()`**: Renderiza campo con jugadores actuales
  - Crea slots vacíos o con jugadores
  - Aplica drag & drop listeners
  - Agrega botones de remover
- **`assignPlayerToPosition(posIndex, playerId)`**: Asigna jugador a posición
- **`removePlayerFromPosition(posIndex)`**: Quita jugador de posición
- **`changeFormation(formation)`**: Cambia formación (preserva jugadores)
- **`clearLineup()`**: Vacía alineación completa
- **`autoLineup()`**: Genera alineación automática basada en prioridades

#### Validación

- **`validateLineup()`**: Valida alineación y muestra warnings
  - Verifica posiciones vacías
  - Verifica veteranos obligatorios
  - Muestra alertas visuales (info/warning/error/success)

#### Sistema de Modales

- **`showConfirm(title, message, onConfirm, onCancel)`**: Modal personalizado
  - Reemplaza `confirm()` nativo
  - Animaciones suaves
  - Botones personalizados

#### Exportación

- **`exportLineupToPNG()`**: Exporta campo a imagen PNG
  - Carga html2canvas dinámicamente si no existe
  - Genera imagen con formación y jugadores
  - Descarga automática con timestamp

#### Sistema de Popovers

- **`showPlayerPopover(playerId, anchorElement)`**: Crea y muestra panel de detalles (rating/habilidades) sobre un jugador en el campo.
- **`hidePlayerPopover()`**: Oculta y elimina el popover activo con transición suave.

#### Notificaciones

- **`showNotification(message, type)`**: Toast notifications
  - Tipos: `success`, `error`, `warning`, `info`
  - Auto-desaparece en 3s
  - Animaciones slide-in/out

---

## 🎨 Arquitectura CSS (styles.css)

### Organización por Secciones

1. **Reset y Base** (líneas 1-14)
2. **Navigation** (líneas 17-56)
3. **Header** (líneas 64-101)
4. **Roster Section** (líneas 107-179)
5. **Position Cards** (líneas 186-255)
6. **DT & Captains** (líneas 260-333)
7. **Convocatoria & Alineación** (líneas 340-814)
8. **Saved Convocatorias** (líneas 820-912)
9. **Custom Modals** (líneas 918-1020)
10. **Team Rules** (líneas 1026-1074)
11. **Footer** (líneas 1080-1091)
12. **Responsive** (líneas 1097-fin)

### Sistema de Colores

```css
/* Primarios */
--azul-principal: #1e3c72 --azul-secundario: #2a5298 --naranja: #ff9800
  /* Por Posición */ --portero: #1e88e5 (azul) --defensa: #43a047 (verde)
  --medio: #fb8c00 (naranja) --delantero: #e53935 (rojo) /* Estados */
  --success: #4caf50 --error: #e53935 --warning: #ff9800 --info: #2196f3;
```

### Responsive Breakpoints

- **1024px**: Cambio a layout de 1 columna (convocatoria abajo)
- **768px**: Ajustes de fuentes, botones más grandes para touch
- **480px**: Layout móvil completo, columnas verticales

### Clases Clave

- `.field-slot`: Posición en el campo
- `.convocado-item`: Item en lista de convocatoria
- `.custom-modal-overlay`: Contenedor de modales
- `.btn-small`: Botones de acción
- `.saved-conv-item`: Item de convocatoria guardada

---

## 🔄 Flujos de Interacción

### 1. Crear Convocatoria

```
Usuario marca checkboxes → toggleConvocatoria(id)
→ convocatoria.add(id) → renderConvocatoria()
→ updateConvocatoriaStats()
```

### 2. Guardar Convocatoria

```
Click "Guardar" → saveConvocatoria()
→ prompt para nombre → crear objeto {id, name, date, players}
→ savedConvocatorias.push() → localStorage.setItem()
→ renderSavedConvocatorias()
```

### 3. Alineación Manual (Drag & Drop)

```
Drag desde convocatoria → dragstart (draggedPlayerId = id)
→ Drop en campo → assignPlayerToPosition(index, id)
→ Validar: no duplicado, está convocado
→ currentLineup[index].id = playerId
→ updateFieldDisplay() → validateLineup()
```

### 4. Alineación Automática v2.0

```
Click "Auto" → autoLineup()
→ Generar puntuación para cada jugador:
  Score = (Prioridad de Rol * 10) + Rating + (Veterano ? 500 : 0)
→ Iterar currentLineup → determinar slotRoleKey
→ Buscar jugador no asignado con mayor Score para ese rol
→ Si el rol no tiene candidatos → asignar mejor jugador restante
→ updateFieldDisplay() → validateLineup()
```

### 5. Cambiar Formación

```
Select formación → changeFormation(value)
→ getFormationConfig(value) → nueva estructura
→ Preservar jugadores asignados (hasta capacidad)
→ currentLineup = newFormation.map()
→ updateFieldDisplay()
```

### 6. Exportar a PNG

```
Click "PNG" → exportLineupToPNG()
→ Verificar campo no vacío
→ Cargar html2canvas (si no existe)
→ html2canvas(field) → canvas.toDataURL()
→ Crear link descarga → click automático
```

---

## 💾 LocalStorage

### Estructura

```javascript
localStorage.setItem(
  "convocatorias",
  JSON.stringify([
    {
      id: 1234567890,
      name: "Partido vs Equipo X",
      date: "2026-01-27T10:30:00.000Z",
      players: ["1", "3", "7", "8"],
    },
  ]),
);
```

### Persistencia

- Se guarda al ejecutar `saveConvocatoria()`
- Se carga al inicializar con `loadSavedConvocatorias()`
- Se actualiza al eliminar con `deleteConvocatoria()`

---

## 🎯 Reglas de Negocio

### Veteranos

- Propiedad `veteran: true` en jugador
- **Obligatorio** incluir TODOS los veteranos en alineación
- Visual: color azul `#1565c0`, asterisco `*`
- Validación: muestra error si faltan veteranos

### Prioridades para Auto-Alineación

1. `high-priority`: Primera opción
2. `medium-priority`: Segunda opción
3. `low-priority`: Última opción

Orden: porteros → defensas → medio → delanteros

### Convocatoria vs Alineación

- **Convocatoria**: Jugadores disponibles para el partido
- **Alineación**: 6 jugadores en el campo (según formación)
- Solo jugadores convocados pueden estar en alineación
- Si se desconvoca jugador, se quita automáticamente de alineación

---

## 🔌 API Pública (window)

```javascript
window.changeFormation(formation);
window.autoLineup();
window.clearLineup();
window.selectAllPlayers();
window.clearConvocatoria();
window.saveConvocatoria();
window.loadConvocatoria(id);
window.exportLineupToPNG();
```

---

## 🐛 Debugging

### Acceso a Estado

```javascript
// En consola del navegador:
console.log(rosterData); // Datos cargados
console.log(currentLineup); // Alineación actual
console.log(Array.from(convocatoria)); // Jugadores convocados
console.log(savedConvocatorias); // Convocatorias guardadas
```

### Logs Importantes

- `"Iniciando carga del roster..."` → Inicio de fetch
- `"Datos cargados"` → JSON parseado exitosamente
- `"Renderizado completado"` → Inicialización completa

---

## ⚡ Optimizaciones Implementadas

### Performance

- Uso de `Set()` para convocatoria (búsqueda O(1))
- Event delegation donde es posible
- CSS transforms para animaciones (GPU)
- LocalStorage síncrono (no blocking)

### UX

- Drag & drop visual con feedback
- Animaciones suaves (0.3s)
- Notificaciones auto-dismiss
- Modales con overlay semi-transparente
- Botones con estados hover/active
- Touch-friendly (min 44px en móvil)

### Responsive

- Mobile-first considerations
- Reordenamiento de paneles en tablet
- Botones full-width en móvil
- Fuentes escalables
- Campos más grandes en touch devices

---

## 🔒 Validaciones

### Frontend

- ✅ No duplicados en alineación
- ✅ Solo convocados pueden ir al campo
- ✅ Veteranos obligatorios
- ✅ Formación completa (6 jugadores)
- ✅ Datos de jugador existen

### No Implementado (Backend)

- ❌ Autenticación
- ❌ Sincronización entre dispositivos
- ❌ Historial de partidos
- ❌ Estadísticas

---

## 📱 Compatibilidad

### Navegadores Soportados

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

### Características ES5

- `var` en lugar de `let`/`const`
- `function()` en lugar de arrow functions
- Polyfills para `forEach` y `Array.from`
- Compatible con IE11 (con polyfills adicionales)

---

## 🚀 Deployment

### Requisitos

- Servidor web estático (Apache, Nginx, Live Server)
- HTTPS recomendado para localStorage
- No requiere Node.js ni build process

### Estructura de URLs

```
/                    → index.html
/data/roster.json    → Base de datos
/styles.css          → Estilos
/script.js           → Lógica
```

---

## 🔮 Extensibilidad

### Agregar Nueva Formación

1. Editar `getFormationConfig()` en script.js
2. Agregar caso en objeto `configs`:
   ```javascript
   '1-1-3-1': [
     { class: 'goalkeeper', style: 'top: 50%; left: 8%;' },
     { class: 'defender-1', style: 'top: 50%; left: 25%;' },
     // ... más posiciones
   ]
   ```
3. Agregar `<option>` en HTML

### Agregar Estadística

1. Agregar campo en `roster.json` players:
   ```json
   "1": {
     "name": "Fernando",
     "goals": 10,
     "assists": 5
   }
   ```
2. Renderizar en `renderFullRoster()` o crear nueva sección

### Integrar Backend

1. Reemplazar `fetch('data/roster.json')` con endpoint API
2. Agregar funciones POST/PUT para guardar cambios
3. Implementar sincronización de localStorage con servidor

---

## 📞 Soporte para IA

### Tareas Comunes

**Modificar jugador:**

```javascript
rosterData.players["1"].name = "Nuevo Nombre";
renderFullRoster();
```

**Agregar jugador:**

```javascript
var newId = String(Object.keys(rosterData.players).length + 1);
rosterData.players[newId] = {
  name: "Nombre",
  number: "99",
  veteran: false,
};
```

**Cambiar formación programáticamente:**

```javascript
window.changeFormation("1-3-2");
```

**Exportar sin interacción:**

```javascript
window.exportLineupToPNG();
```

### Puntos de Extensión

- `validateLineup()`: Agregar más validaciones
- `showNotification()`: Personalizar notificaciones
- `getFormationConfig()`: Nuevas formaciones
- `autoLineup()`: Mejorar lógica de asignación

---

## 📝 Notas Finales

### Decisiones de Diseño

1. **JavaScript vanilla**: Sin frameworks para simplicidad y rendimiento
2. **localStorage**: Suficiente para uso personal/local
3. **ES5**: Máxima compatibilidad
4. **JSON local**: Fácil edición manual
5. **html2canvas**: Única dependencia externa (carga lazy)

### Mejoras Futuras Sugeridas

- [ ] Backend con base de datos real
- [ ] Autenticación de usuarios
- [ ] Historial de partidos jugados
- [ ] Estadísticas por jugador
- [ ] Compartir convocatorias vía URL
- [ ] PWA con offline support
- [ ] Tests automatizados

---

**Última actualización**: Enero 30, 2026
**Versión**: 2.1
**Mantenedor**: Sistema de Gestión de Fútbol 6
