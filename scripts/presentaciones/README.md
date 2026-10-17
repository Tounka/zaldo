# Presentaciones generadas

Genera presentaciones 16:9 (HTML autocontenido, pantalla completa, tema claro/oscuro) de **ingresos**, **ahorros** y **gastos** a partir de un respaldo de Firestore.

```
respaldo ─► lib/datos.mjs ─► métricas ─► proveedor ─► especificación ─► lib/render.mjs ─► HTML
            (cálculo exacto)            (local / IA)  (lib/esquema.mjs)
```

- **El proveedor nunca escribe HTML ni calcula montos.** Recibe métricas ya calculadas y devuelve una especificación de diapositivas (portada, kpis, gráfica, tabla, lista, tarjetas). El diseño queda fijo en `plantilla/`.
- **Toda especificación se valida** (`validarPresentacion`) antes de renderizar: tipos, una cifra por etiqueta en cada serie, filas completas en tablas.

## Uso

```bash
# Sin IA (plantillas fijas), con el respaldo más reciente de respaldos/
npm run presentacion -- --tema ahorros

# Con OpenAI
$env:OPENAI_API_KEY = "sk-..."; $env:OPENAI_MODEL = "<modelo>"
npm run presentacion -- --tema gastos --proveedor openai --contexto "Este mes pagué la medicina de la abuela"

# Ver exactamente qué se enviaría a OpenAI, sin llamar a la API
npm run presentacion -- --tema ingresos --proveedor openai --simular
```

La salida va a `presentaciones/` (ignorada por git porque contiene datos personales).

## Privacidad

- A OpenAI solo se envían las **métricas agregadas** de `lib/datos.mjs`, nunca el respaldo ni los movimientos uno por uno.
- Por defecto se anonimizan los nombres de las cuentas familiares (`--sin-anonimizar` lo desactiva).
- Usa `--simular` para revisar la solicitud antes de enviarla.

## Estructura

| Archivo | Qué hace |
|---|---|
| `generar.mjs` | CLI: lee el respaldo, calcula, llama al proveedor, valida y renderiza |
| `lib/datos.mjs` | Métricas por tema. Replica las reglas de la app (cobro confirmado, incrementos, deuda = saldo + MSI) |
| `lib/esquema.mjs` | Contrato de la especificación: JSON Schema para la IA + validador propio |
| `lib/render.mjs` | Especificación → HTML con la plantilla |
| `plantilla/` | `deck.css` (diseño), `deck.js` (navegación y primitivas SVG), `graficas.js` (barras, barras apiladas, línea) |
| `proveedores/local.mjs` | Especificación con plantillas fijas: funciona hoy, sin IA |
| `proveedores/openai.mjs` | Responses API con salida estructurada (`json_schema`) |
| `prompts/` | Instrucciones del sistema y por tema. Tus reglas personales (clasificación, cashback) van en `prompts/<tema>.local.md`, ignorado por git |

## Extender

- **Otro tema:** agrega `metricasX` en `lib/datos.mjs`, regístralo en `CALCULADORES`, crea `prompts/x.md` y una plantilla en `proveedores/local.mjs`.
- **Otro proveedor:** exporta una función `({ tema, metricas, datos, contexto }) => especificación` y regístrala en `PROVEEDORES` de `generar.mjs`.
- **Otro tipo de diapositiva:** agrégalo a `TIPOS_DIAPOSITIVA` y al schema en `lib/esquema.mjs`, y su función en `RENDER` de `lib/render.mjs`.
- **Desde la app:** cuando se integre en el front, la llamada a OpenAI debe ir en un backend (Cloud Function), nunca con la API key en el navegador.
