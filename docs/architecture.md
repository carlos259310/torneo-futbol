# Arquitectura técnica

## Propósito

Aplicación Astro para consultar la plantilla, definir una alineación de fútbol 6 y ver resultados del Torneo C.E.A. La interfaz usa JavaScript de navegador sin framework para conservar el comportamiento de la cancha de arrastrar y soltar.

## Estructura vigente

```text
src/
├── data/                 # Fuente editable: plantilla, resultados y posiciones
└── pages/index.astro     # Página principal
public/
├── assets/
│   ├── audio/            # Audio de entrada
│   ├── css/styles.css    # Sistema visual y responsive
│   ├── images/           # Banner WebP adaptativo
│   └── js/               # main.js y results.js
├── data/                 # Copia generada, no editar manualmente
├── favicon.svg
└── resultados.html
scripts/sync-data.js      # Sincroniza src/data hacia public/data
```

## Datos

`src/data/roster.json` es la fuente de la plantilla. Contiene:

- `players`: ficha de cada jugador. `veteran: true` activa la medalla visual y la regla de veterano en cancha.
- `positions`: posiciones y prioridad de cada jugador. Se permite más de una posición por jugador.
- `captains`: orden de capitanes.
- `field`: alineación inicial de seis personas para `1-2-2-1`.

No existe un campo de director técnico ni un bloque DT en la interfaz. Los resultados y la tabla de un torneo nuevo comienzan vacíos en `src/data/results.json` y `src/data/positions.json`.

Antes de desarrollo o compilación, `npm run sync-data` genera los JSON de `public/data`. Nunca editar directamente esa carpeta.

## Flujo de la página principal

1. `main.js` obtiene `data/roster.json`.
2. Renderiza plantilla, listas por posición, capitanes y convocatoria en orden alfabético.
3. `initializeDefaultLineup()` toma `field` y llena la cancha con la formación inicial.
4. `updateFieldDisplay()` crea los slots y enlaza clics, arrastrar/soltar, avisos y exportación PNG.

La carga se inicia una sola vez en `DOMContentLoaded`. La convocatoria se renderiza después de poblar la cancha para evitar trabajo duplicado en el arranque.

Los IDs y clases funcionales que no se deben renombrar sin probar son `field`, `formation-select`, `convocatoria-list`, `field-slot`, `empty-slot`, `occupied-slot` y los atributos `data-position-index`.

## Diseño y responsive

- `styles.css` define el azul noche, dorado y verde de cancha. Las reglas nuevas se agregan al bloque de sistema visual al final del archivo para prevalecer sobre estilos heredados.
- Las tarjetas reservan espacio para la valoración con `roster-header { padding-right: 3.25rem; }`; así nombres largos no se superponen con la estrella y se parten en dos líneas en vez de truncarse.
- El encabezado conserva texto en escritorio y usa iconos en anchos de hasta 860 px para evitar desplazamiento horizontal.
- El banner usa `picture`: 1200 px en escritorio/tableta y 720 px en móvil.
- `prefers-reduced-motion` disminuye efectos para equipos o usuarios que lo soliciten.

Consulta [design-system.md](design-system.md) para la guía de apariencia y [data-management.md](data-management.md) para editar jugadores.

## Audio

La página principal carga `public/assets/audio/agarrate-vuelta-de-pablo-aimar.mp3`. Solo intenta reproducir 15 segundos. Un valor en `sessionStorage` evita repetirlo por recargas hechas dentro de un minuto; después de un minuto puede sonar de nuevo. El icono de volumen permite silenciar o activar el audio y conserva esa preferencia durante la pestaña.

## Validación obligatoria

Ejecuta dentro del Dev Container:

```bash
npm run build
```

Después verifica en 390 px, 768 px y escritorio:

1. No existe desplazamiento horizontal.
2. Hay 12 tarjetas y seis jugadores iniciales en la cancha.
3. Un nombre largo como «Hermano de Fernando Jr.» no se cruza con su valoración.
4. Se puede retirar un jugador y arrastrar otro a un slot vacío.
5. El botón de volumen cambia entre activo y silenciado.
