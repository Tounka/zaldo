# zaldo-captura-ia (Cloudflare Worker)

Dos rutas con OpenAI, ninguna escribe en Firestore:

- **`POST /captura`** convierte un mensaje libre ("gasté 230 en uber con la
  BBVA") o la foto de un ticket en capturas JSON, o una pregunta ("¿en qué
  gasté más este mes?") en una consulta. La app valida la respuesta con
  `src/assets/funciones/ia/interpretarCaptura.js`; las capturas se confirman
  en el chat y las consultas se responden en el navegador con
  `responderConsulta.js` (la IA nunca ve movimientos ni saldos). Esfuerzo
  `OPENAI_ESFUERZO` (medium).
- **`POST /analisis`** recibe las métricas agregadas de un tema (gastos,
  ingresos o ahorros) que la app calculó, y devuelve una presentación con el
  formato de `src/assets/funciones/ia/analisis/esquema.js`. Esfuerzo
  `OPENAI_ESFUERZO_ANALISIS` (high). Ver [Análisis](#análisis).

No forma parte del build de la app: Vite solo empaqueta lo que se importa desde
`src/main.jsx`, y esta carpeta no se importa desde ahí. Al revés sí: el Worker
importa `contratoCaptura.js`, `contextoCaptura.js` y `analisis/` de la app
para que prompts, esquemas y temas tengan una sola fuente.

## Capas de seguridad

| Capa | Dónde |
|---|---|
| Origen permitido (CORS) | `ORIGENES_PERMITIDOS` en `wrangler.toml` |
| ID token de Firebase verificado (firma, `iss`, `aud`, expiración) | `src/autenticacion.js` |
| Solo uids en la lista (falla cerrado si está vacía) | secreto `UIDS_PERMITIDOS` |
| 10 capturas/min por uid | binding `LIMITE_CAPTURA` |
| 2 análisis/min por uid | binding `LIMITE_ANALISIS` |
| Captura: cuerpo ≤ 48 KB (más la imagen), mensaje ≤ 1200 caracteres, ≤ 50 cuentas, ≤ 150 productos de despensa (solo nombres) | `src/solicitud.js` |
| Imagen opcional: data URL JPEG/PNG/WebP en base64 ≤ 1.5 MB (la app la reduce a 1600 px) | `src/solicitud.js` |
| Análisis: cuerpo ≤ 32 KB, tema de la lista, contexto ≤ 1,500 caracteres | `src/solicitudAnalisis.js` |
| La presentación se valida antes de entregarla (el modo strict no aplica) | `validarPresentacion` en `src/index.js` |
| El prompt y el esquema los arma el Worker, no el cliente | `src/index.js` |
| `store: false` en OpenAI; los logs no incluyen mensajes | `src/openai.js`, `src/index.js` |

Fuera del código: en OpenAI crea un **proyecto exclusivo** para esta key y ponle
un **límite de gasto mensual**. Es la última barrera si algo de lo anterior falla.

## Puesta en marcha

```bash
cd workers/captura-ia
npm install
npx wrangler login

# Secretos (te los pide por consola; no quedan en ningún archivo)
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put UIDS_PERMITIDOS     # uid1,uid2

npm run deploy
```

Antes del primer deploy agrega el dominio donde publicas la app a
`ORIGENES_PERMITIDOS` y confirma que `OPENAI_MODELO` sea un modelo vigente con
soporte para Structured Outputs.

Tu uid está en Firebase Console → Authentication → Users (columna "User UID").

## Conectar la app

Al terminar, `npm run deploy` imprime la URL del Worker
(`https://zaldo-captura-ia.<tu-subdominio>.workers.dev`). La app la lee de
`VITE_CAPTURA_IA_URL`, con `/captura` al final:

- **Netlify:** Site configuration → Environment variables → agrega
  `VITE_CAPTURA_IA_URL` y vuelve a desplegar (Vite la incrusta al construir).
- **Local:** agrégala a tu `.env`.

El asistente flotante (`componentes/asistenteIA/`) manda el mensaje con
`solicitarCaptura.js`, valida la respuesta con `interpretarCaptura.js` y pide
confirmación en el chat antes de registrar; "Editar en formulario" abre el
formulario de movimiento (o de transferencia) prellenado.

## Desarrollo local

```bash
cp .dev.vars.example .dev.vars   # y pon tu key y tu uid
npm run dev                      # http://localhost:8787/captura
```

## Contrato

```http
POST /captura
Authorization: Bearer <await auth.currentUser.getIdToken()>
Content-Type: application/json

{ "mensaje": "...", "hoy": "AAAA-MM-DD", "cuentas": [{ "id", "nombre", "tipoDeCuenta" }],
  "productos": [{ "nombre", "presentaciones": ["..."] }],   // opcional: catálogo de despensa
  "imagen": "data:image/jpeg;base64,..." }                   // opcional: foto de ticket
```

| Respuesta | Significa |
|---|---|
| 200 `{ capturas, despensa, consulta, respuesta, irA }` | Pasar tal cual a `interpretarCaptura(respuesta, { cuentas })` |
| 400 | Cuerpo inválido (el `error` dice por qué) |
| 401 / 403 | Token inválido, uid no autorizado u origen no permitido |
| 429 | Límite por minuto alcanzado |
| 502 | OpenAI falló o rechazó el mensaje |
| 503 | Falta configurar un secreto, una var o el rate limit |

`despensa` aparece cuando el mensaje describe una compra de súper con productos
("compré 2 leches y detergente en Walmart, 380 con la BBVA"). La app la guarda
con `registrarEntradaLoteIADespensa` y propone el gasto aparte.

`consulta` aparece cuando el usuario pregunta en vez de registrar: trae el
tema (`contratoConsulta.js`), el periodo y filtros. `respuesta` es texto breve
para saludos o ayuda, e `irA` una ruta de la app si pidió abrir una sección.

Si cambias el contrato (`VERSION_CONTRATO_CAPTURA`), vuelve a desplegar el
Worker: el esquema y el prompt viven en él.

`hoy` es la fecha local del dispositivo (`fechaLocalISO()`): el Worker corre en
UTC y solo la acepta si está a ±1 día de su reloj.

## Análisis

```http
POST /analisis
Authorization: Bearer <await auth.currentUser.getIdToken()>
Content-Type: application/json

{ "tema": "gastos", "metricas": { ... }, "contexto": "opcional" }
```

| Respuesta | Significa |
|---|---|
| 200 `{ presentacion: { titulo, diapositivas } }` | Pasar a `renderizarPresentacion(presentacion, plantilla)` |
| 400 | Tema, métricas o contexto inválidos |
| 429 | Ya hubo 2 análisis este minuto |
| 502 | OpenAI falló, se cortó o devolvió una presentación inválida |

Consideraciones:

- **Las métricas las calcula la app** (`analisis/metricas.js`, las mismas
  reglas que la CLI): el Worker no tiene acceso a Firestore y el modelo no
  calcula montos, solo redacta con los que recibe.
- **Solo viajan agregados** (unos 3 KB por tema). Con "Ocultar nombres de
  cuentas familiares" la app cambia los nombres `D-…` por "Cuenta familiar N"
  antes de enviar.
- **Tarda**: con esfuerzo `high` una presentación suele tomar de 1 a 3 minutos.
  El Worker corta a los 240 s y la app a los 250 s. Si se vuelve lento o caro,
  baja `OPENAI_ESFUERZO_ANALISIS` a `medium` en `wrangler.toml`.
- **Costo**: cada análisis consume muchos más tokens que una captura (hasta
  40,000 de salida, razonamiento incluido). Por eso tiene su propio límite.
- El contexto que escribe el usuario se trata como información, no como
  instrucciones (regla en `analisis/prompts.js`).
