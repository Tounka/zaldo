# zaldo-captura-ia (Cloudflare Worker)

Convierte un mensaje libre ("gasté 230 en uber con la BBVA") en capturas JSON
usando OpenAI. **No escribe en Firestore**: la app valida la respuesta con
`src/assets/funciones/ia/interpretarCaptura.js` y abre el modal de captura de
siempre para que el usuario confirme.

No forma parte del build de la app: Vite solo empaqueta lo que se importa desde
`src/main.jsx`, y esta carpeta no se importa desde ahí. Al revés sí: el Worker
importa `contratoCaptura.js` y `contextoCaptura.js` de la app para que el
prompt y el esquema tengan una sola fuente.

## Capas de seguridad

| Capa | Dónde |
|---|---|
| Origen permitido (CORS) | `ORIGENES_PERMITIDOS` en `wrangler.toml` |
| ID token de Firebase verificado (firma, `iss`, `aud`, expiración) | `src/autenticacion.js` |
| Solo uids en la lista (falla cerrado si está vacía) | secreto `UIDS_PERMITIDOS` |
| 10 peticiones/min por uid | binding `LIMITE_CAPTURA` |
| Cuerpo ≤ 16 KB, mensaje ≤ 500 caracteres, ≤ 50 cuentas | `src/solicitud.js` |
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

{ "mensaje": "...", "hoy": "AAAA-MM-DD", "cuentas": [{ "id", "nombre", "tipoDeCuenta" }] }
```

| Respuesta | Significa |
|---|---|
| 200 `{ capturas: [...] }` | Pasar tal cual a `interpretarCaptura(respuesta, { cuentas })` |
| 400 | Cuerpo inválido (el `error` dice por qué) |
| 401 / 403 | Token inválido, uid no autorizado u origen no permitido |
| 429 | Límite por minuto alcanzado |
| 502 | OpenAI falló o rechazó el mensaje |
| 503 | Falta configurar un secreto, una var o el rate limit |

`hoy` es la fecha local del dispositivo (`fechaLocalISO()`): el Worker corre en
UTC y solo la acepta si está a ±1 día de su reloj.
