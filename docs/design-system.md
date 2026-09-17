# Sistema visual

## Dirección de diseño

La interfaz utiliza un estilo deportivo minimalista inspirado en el banner oficial del Torneo CEA. El azul noche identifica la aplicación, el dorado se reserva para acentos y el verde se usa principalmente en la cancha y estados positivos.

### Paleta

- Azul noche: `#07182f` y `#0b2747`.
- Azul principal: `#173b63`.
- Dorado: `#d6a632`.
- Fondo: `#f6f7f9`.
- Cancha: `#22a06b`.

Las variables principales están declaradas al comienzo de `public/assets/css/styles.css`. Se deben reutilizar antes de introducir colores nuevos.

## Recursos

- `public/favicon.svg`: escudo oficial de la interfaz.
- `public/assets/images/torneo-cea-banner-1200.webp`: banner para escritorio y tabletas.
- `public/assets/images/torneo-cea-banner-720.webp`: banner optimizado para móviles.
- `public/assets/audio/agarrate-vuelta-de-pablo-aimar.mp3`: introducción de audio de 15 segundos.

El banner usa `<picture>` para no descargar la versión grande en pantallas pequeñas. En escritorio se muestra con proporción `3:1`; en móvil conserva la proporción completa para no cortar el texto.

## Componentes visuales

- La navegación es fija, clara y muestra la sección actual con fondo azul suave y un punto dorado.
- El encabezado usa una sombra azul muy suave y un borde inferior dorado; los enlaces marcan hover con una línea dorada interior.
- El banner tiene borde azul tenue, anillo blanco fino y sombra moderada para separarlo del fondo sin añadir animaciones.
- Las tarjetas usan un borde tenue y una elevación de 2 px al pasar el cursor; debe mantenerse sutil.
- La valoración se sitúa en la esquina superior derecha. `roster-header` reserva `3.25rem` a la derecha para que los nombres largos nunca queden debajo de la estrella; los nombres se parten en dos líneas si lo requieren, en lugar de ocultarse.
- La cancha es el único elemento con color verde dominante.
- El footer ocupa todo el ancho y usa tres bloques: identidad, mensaje y navegación.
- Los estados sin resultados explican cuándo aparecerá la información en lugar de mostrar tablas vacías.

## Elementos funcionales protegidos

No se deben renombrar ni eliminar estos identificadores sin actualizar y probar `public/assets/js/main.js`:

- `formation-select`, `field` y `convocatoria-list`.
- `btn-auto-lineup`, `btn-clear-lineup`, `btn-reset-lineup` y `btn-export-png`.
- `player-selection-modal`, `lineup-warnings` y `convocados-count`.

Las clases `field-slot`, `empty-slot`, `occupied-slot`, las clases de posición y los atributos `data-position-index` forman parte del comportamiento de drag-and-drop. Los cambios visuales no deben modificar sus coordenadas o estructura.

## Validación recomendada

Después de cambios visuales:

1. Ejecutar `npm run build`.
2. Confirmar 12 tarjetas de jugadores y 6 slots en la cancha.
3. Cambiar de formación y comprobar que los slots permanecen dentro del campo.
4. Arrastrar un jugador desde la convocatoria a un slot vacío.
5. Probar modo oscuro, anchos de 390 px, 768 px y escritorio, y ambas rutas (`/` y `/resultados.html`).
6. Revisar que no existan errores en la consola del navegador.
