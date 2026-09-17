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

El banner usa `<picture>` para no descargar la versión grande en pantallas pequeñas. En escritorio se muestra con proporción `3:1`; en móvil conserva la proporción completa para no cortar el texto.

## Componentes visuales

- La navegación es fija, clara y muestra la sección actual con fondo azul suave y un punto dorado.
- Las tarjetas son planas: borde tenue, sin elevaciones ni movimientos al pasar el cursor.
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
2. Confirmar 13 tarjetas de jugadores y 6 slots en la cancha.
3. Cambiar de formación y comprobar que los slots permanecen dentro del campo.
4. Arrastrar un jugador desde la convocatoria a un slot vacío.
5. Probar modo oscuro, ancho móvil de 390 px y ambas rutas (`/` y `/resultados.html`).
6. Revisar que no existan errores en la consola del navegador.
