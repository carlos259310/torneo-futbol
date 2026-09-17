# Torneo de Fútbol

Aplicación Astro para consultar la plantilla, organizar convocatorias y alineaciones, revisar resultados y ver la tabla de posiciones del equipo Tránsito de Girón.

## Requisitos

- Node.js 22
- npm 10 o superior

También puedes abrir el repositorio directamente en VS Code con Dev Containers; la configuración instala las dependencias y publica el puerto `4321`.

## Desarrollo local

```bash
npm ci
npm run dev
```

Abre `http://localhost:4321`.

## Comandos

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia Astro en modo desarrollo. |
| `npm run build` | Genera la compilación de producción. |
| `npm run preview` | Sirve localmente la compilación. |
| `npm run sync-data` | Copia los JSON de `src/data` a `public/data`. |

## Estructura

```text
.
├── .devcontainer/       # Entorno reproducible con Node.js 22
├── docs/                # Documentación técnica e histórica
├── public/
│   ├── assets/
│   │   ├── css/         # Estilos globales
│   │   └── js/          # Lógica del navegador
│   ├── data/            # Datos servidos por Astro
│   └── resultados.html  # Vista de resultados
├── scripts/             # Automatización del proyecto
└── src/
    ├── data/            # Datos fuente
    └── pages/           # Rutas Astro
```

## Datos

Los archivos JSON de `src/data` contienen la plantilla, posiciones, resultados e información del torneo y son la única fuente editable. Antes de ejecutar o compilar la aplicación, el proyecto los copia a `public/data`.

## Despliegue

El proyecto usa el adaptador oficial de Vercel. Ejecuta `npm run build` para validar una entrega antes de publicarla.

Consulta [la documentación técnica](docs/architecture.md), [la gestión de datos](docs/data-management.md), [el sistema visual](docs/design-system.md) y [el historial de cambios](CHANGELOG.md) para más contexto.
