# Gestión de datos del torneo

La fuente editable de la plantilla es `src/data/roster.json`. No se deben editar los archivos generados de `public/data`; `npm run sync-data` los actualiza automáticamente antes de desarrollo y compilación.

## Plantilla y posiciones

- `players`: nombre, condición de veterano, valoración, fortalezas y aspectos a mejorar.
- `positions`: posiciones disponibles por jugador. Un mismo jugador puede aparecer en varias; Marco (`id: "2"`) figura en defensa y mediocampo.
- `captains`: capitanes mostrados en la página.
- `field`: alineación inicial de seis jugadores para la formación `1-2-2-1`.

La alineación inicial vigente es Fernando Jr., Carlos Daniel, Marco, Hermano de Fernando Jr., Harold Charris y Jhon Vill. La aplicación conserva los controles para mover jugadores, cambiar formación, vaciar y restablecer la cancha.

## Veteranos

Usa `"veteran": true` dentro de `players`. La interfaz muestra una medalla y una etiqueta «Veterano» sin modificar el comportamiento de las tarjetas ni de arrastrar y soltar.

## Audio de entrada

El audio está en `public/assets/audio/agarrate-vuelta-de-pablo-aimar.mp3`. No se reproduce automáticamente: el icono de volumen del encabezado inicia una vista previa voluntaria de hasta 15 segundos; al pulsarlo otra vez, la detiene. Esta decisión evita bloqueos del navegador y sonido inesperado.

## Validación

Después de editar, ejecuta:

```bash
npm run build
```

Esto valida el JSON, sincroniza los datos públicos y genera la versión de producción.
