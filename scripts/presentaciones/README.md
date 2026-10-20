# Presentaciones generadas

Genera presentaciones 16:9 (HTML autocontenido, pantalla completa, tema claro/oscuro) de **ingresos**, **ahorros** y **gastos** a partir de un respaldo de Firestore.

```
respaldo ─► metricas.js ─► métricas ─► proveedor ─► especificación ─► render.js ─► HTML
            (cálculo exacto)          (local / IA)  (esquema.js)
```

La lógica vive en `src/assets/funciones/ia/analisis/` y la comparten esta CLI
y el Worker (`POST /analisis`, ver `workers/captura-ia/README.md`). Un cambio en
métricas, prompts, esquema o plantilla se refleja en ambos.

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

Compartido (`src/assets/funciones/ia/analisis/`):

| Archivo | Qué hace |
|---|---|
| `metricas.js` | Métricas por tema. Replica las reglas de la app (cobro confirmado, incrementos, deuda = saldo + MSI). También `anonimizarMetricas` |
| `esquema.js` | Contrato de la especificación: JSON Schema para la IA + validador propio |
| `prompts.js` | Instrucciones del sistema y por tema |
| `render.js` | Especificación → HTML; recibe el texto de la plantilla como parámetro |
| `plantilla/` | `deck.css` (diseño), `deck.js` (navegación y primitivas SVG), `graficas.js` (barras, barras apiladas, línea) |

Solo de la CLI (`scripts/presentaciones/`):

| Archivo | Qué hace |
|---|---|
| `generar.mjs` | Lee el respaldo, calcula, llama al proveedor, valida y renderiza |
| `lib/compartido.mjs` | Puente con los módulos de `src/`: lee respaldo y plantilla del disco |
| `proveedores/local.mjs` | Especificación con plantillas fijas: funciona sin IA |
| `proveedores/openai.mjs` | Responses API con salida estructurada (`json_schema`) |
| `prompts/<tema>.local.md` | Tus reglas personales (clasificación, cashback). Ignorado por git; en la app se escriben en el campo "Contexto" |

## Extender

- **Otro tema:** agrega `metricasX` en `metricas.js`, regístralo en `CALCULADORES`, `TEMAS_ANALISIS` y `hayDatosParaAnalisis`, su prompt en `PROMPTS_TEMA` de `prompts.js` y una plantilla en `proveedores/local.mjs`.
- **Otro proveedor:** exporta una función `({ tema, metricas, datos, contexto }) => especificación` y regístrala en `PROVEEDORES` de `generar.mjs`.
- **Otro tipo de diapositiva:** agrégalo a `TIPOS_DIAPOSITIVA` y al schema en `esquema.js`, y su función en `RENDER` de `render.js`.
- **Desde la app:** ya está integrado. La llamada a OpenAI la hace el Worker; la key nunca llega al navegador.
