# Topo — fuentes de la mascota

Archivos de trabajo del topo. La app **no** los sirve: lo que se publica son los
WebP optimizados de `public/topo/` (`<estado>-256.webp` y `<estado>-512.webp`).

- `hoja-personaje.png` — hoja de vistas y proporciones; referencia obligatoria para
  cualquier imagen nueva del personaje.
- `gpt-png/` — los diez estados originales de GPT Image, PNG con transparencia real.
- `flow-jpg/` — la serie alterna generada en Google Flow (JPG con fondo, sin usar).
- `manifest.json` — el prompt exacto de cada estado, para regenerarlo o crear otros
  con el mismo estilo.

Estados: `reposo`, `saludando`, `pensando`, `feliz`, `celebrando`, `senalando`,
`excavando`, `preocupado`, `moneda`, `durmiendo`.

Para agregar un estado: genéralo con el prompt base del manifest, exporta los WebP de
256 y 512 px con canal alfa a `public/topo/` y súmalo a `ESTADOS_TOPO` en
`src/assets/componentes/topo/Topo.jsx`.
