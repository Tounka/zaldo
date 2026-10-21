# Topo — lote 2 de animaciones y assets

Segundo encargo para la IA que genera imágenes. El lote 1 ya está en la app:
`excavar-entrar`, `excavar-salir` (solo cuadros clave), `cavar-bucle`, `parpadeo`
y `respirar`, además de la madriguera.

**Antes de empezar, lee completo `diseno/topo/PROMPTS-ANIMACIONES.md`.** Este
documento **no** repite sus reglas: método de consistencia (sección 2), reglas
comunes (3), prompt base (4) y revisión (11). Aquí solo van los cuadros nuevos,
con la línea **Frame** en inglés lista para pegar en el prompt base.

Referencias obligatorias en cada prompt: `diseno/topo/hoja-personaje.png`,
`diseno/topo/rig-neutral-compuesto.png` y el cuadro anterior de la animación.
Para todo lo que lleve casco o tierra, adjunta también
`diseno/topo/animaciones/excavar-entrar/09.png`: es la referencia del casco
amarillo con lámpara y de la tierra lila.

---

## A. Completar `excavar-salir` — prioridad máxima

Hoy la salida termina con el topo con casco y salta de golpe al topo sin casco.
Faltan los intermedios y el final. Edita a partir de los cuadros existentes
(`excavar-salir/01, 03, 05, 07, 09.png`) y guarda con el número indicado.

Animation: `the mole emerges from the lilac soil burrow, takes off its miner helmet and waves hello`.

| # | Adjuntar | Frame (inglés) |
| --- | --- | --- |
| 02 | 01 y 03 | `exactly halfway between image A and image B: the still lilac mound now trembles slightly, a few crumbs jump up from the center, no mole visible yet` |
| 04 | 03 y 05 | `exactly halfway between image A and image B: the full pink nose sniffs out of the hole, the top of the yellow helmet barely visible behind it` |
| 06 | 05 y 07 | `exactly halfway between image A and image B: head with helmet out of the hole, both pink paws just grabbing the rim, eyes now open` |
| 08 | 07 y 09 | `exactly halfway between image A and image B: the mole hops out of the hole, feet in the air above the rim, soil crumbs falling from its body` |
| 10 ★ | 09 | `standing next to the hole, it shakes its whole body: fur puffed out, eyes squeezed shut happily, lilac crumbs flying off in every direction` |
| 11 ★ | 10 | `standing, it lifts the yellow miner helmet off its head with its right paw, big smile, fur on top of the head slightly messy` |
| 12 ★ | 11 y `diseno/topo/gpt-png/saludando.png` | `standing without helmet, holding the helmet down at its side with the left paw, waving hello with the right paw raised; same pose and face as the attached waving reference` |

Cuando estén los 12, en `diseno/topo/publicar-animaciones.py` cambia la lista
de `excavar-salir` a los 12 cuadros con `fps: 12` y corre el script.

## B. Animaciones nuevas — prioridad alta

Son las que la app va a usar primero: confirmar capturas, avisar errores,
festejar metas y "pensar" mientras responde la IA. Cuadros con ★ primero.

### B.1 `pensar-bucle` (8 cuadros, bucle) — el asistente IA está pensando

Animation: `the mole thinks hard, tapping its chin, with small lilac thought bubbles`.

| # | Frame (inglés) |
| --- | --- |
| 01 ★ | `standing, right paw touching its chin, eyes looking up to the upper right, mouth in a small thoughtful line` |
| 02 | `same pose, one tiny lilac thought bubble appears above its head` |
| 03 ★ | `taps its chin (paw slightly lower), two lilac thought bubbles rising, eyebrows lifted` |
| 04 | `three lilac thought bubbles rising, the first one fading` |
| 05 ★ | `eyes look to the upper left now, paw back on the chin, bubbles drifting left` |
| 06 | `bubbles fading out, head tilted slightly` |
| 07 ★ | `small "aha" spark: eyes wide, tiny gold sparkle above the head, paw still on chin` |
| 08 | `back to frame 01 pose, no bubbles (closes the loop)` |

### B.2 `asentir` (6 cuadros) — captura guardada

| # | Frame (inglés) |
| --- | --- |
| 01 ★ | `standing relaxed, warm smile, looking at the viewer` |
| 02 | `head tilting down a little, eyes closing happily` |
| 03 ★ | `head down in a clear nod, eyes closed in a happy curve` |
| 04 | `head back up, eyes opening` |
| 05 ★ | `second smaller nod, eyes closed happily` |
| 06 | `back to frame 01, a small gold sparkle near the cheek` |

### B.3 `negar` (6 cuadros) — error de validación

| # | Frame (inglés) |
| --- | --- |
| 01 ★ | `standing, slightly worried eyebrows, small frown, paws together on the belly` |
| 02 | `head turning to the viewer's left` |
| 03 ★ | `head fully turned left, eyes closed, gentle "no" expression` |
| 04 | `head passing through center` |
| 05 ★ | `head fully turned right, eyes closed` |
| 06 | `back to frame 01, one small sweat drop on the forehead` |

### B.4 `celebrar` (10 cuadros) — meta de ahorro cumplida

| # | Frame (inglés) |
| --- | --- |
| 01 ★ | `standing, excited wide smile, paws in fists at chest height` |
| 02 | `crouching down, knees bent, ready to jump` |
| 03 ★ | `deep crouch, eyes shut with joy` |
| 04 | `taking off, feet just leaving the ground, arms rising` |
| 05 ★ | `at the top of the jump, both arms raised high, mouth open laughing, gold coins and lilac sparkles bursting around` |
| 06 | `still in the air, coins spinning outward` |
| 07 ★ | `falling, arms still up, coins falling around` |
| 08 | `landing, knees bent, coins on the ground` |
| 09 ★ | `standing proud, paws on hips, coins settled at its feet` |
| 10 | `same as 09 with a slow wink` |

### B.5 `guardar-moneda` (10 cuadros) — abono a un ahorro

| # | Frame (inglés) |
| --- | --- |
| 01 ★ | `standing next to a small lilac piggy bank (#b56ef0) at its right, holding one gold coin up with the right paw, admiring it` |
| 02 | `coin raised higher, eyes following it` |
| 03 ★ | `leaning toward the piggy bank, coin above the slot` |
| 04 | `coin halfway into the slot` |
| 05 ★ | `coin disappears into the slot, a tiny sparkle on the slot` |
| 06 | `the piggy bank wobbles slightly` |
| 07 ★ | `the mole pats the piggy bank on the head with its paw, smiling` |
| 08 | `turning to the viewer` |
| 09 ★ | `facing the viewer, proud smile, thumbs up with the right paw` |
| 10 | `same as 09, piggy bank still` |

### B.6 `saludar` (8 cuadros, bucle desde el 03) — bienvenida

| # | Frame (inglés) |
| --- | --- |
| 01 ★ | `standing relaxed, smiling` |
| 02 | `right paw starting to rise` |
| 03 ★ | `right paw raised high, palm open toward the viewer, big smile` |
| 04 | `paw tilted to the left` |
| 05 ★ | `paw tilted fully to the left, eyes squinting happily` |
| 06 | `paw back to center` |
| 07 ★ | `paw tilted fully to the right` |
| 08 | `paw back to center (loops to 03)` |

En `publicar-animaciones.py` agrega `"inicioBucle": 2` a la ficha de `saludar`.

## C. Animaciones nuevas — prioridad media

Siguen el catálogo de `PROMPTS-ANIMACIONES.md` (sección 5); genéralas con su
descripción y el mismo método:

- `preocupado` (8): saldo negativo o pago próximo.
- `sorpresa` (6): ingreso grande.
- `contar-monedas` (10, bucle): pantalla de ahorros.
- `carrito` (8, bucle): despensa.
- `anotar` (8, bucle): editar notas de una cuenta.
- `dormirse` (10) y `dormido` (6, bucle): estado vacío "no hay movimientos este mes".
- Transiciones de la sección 6, empezando por `reposo-a-pensando` y `pensando-a-feliz`.

## D. Assets fijos — prioridad alta

### D.1 Iconos de la app (PWA)

Hoy la app instalada usa un patrón genérico como icono. Hacen falta:

| Archivo final | Tamaño | Notas |
| --- | --- | --- |
| `public/iconos/icono-512.png` | 512 × 512 | Cabeza del topo sonriendo, de frente, sobre un círculo lila `#6c45e3` con brillo suave. PNG con alfa fuera del círculo. |
| `public/iconos/icono-192.png` | 192 × 192 | El mismo, reducido. |
| `public/iconos/icono-maskable-512.png` | 512 × 512 | **Fondo lila completo** (sin alfa) y la cabeza dentro del 60 % central: Android recorta en círculo o en gota. |
| `public/iconos/apple-touch-icon.png` | 180 × 180 | Igual que el maskable. |
| `public/favicon.svg` o `favicon-32.png` | 32 × 32 | Solo la nariz rosa en forma de pera y los dos ojitos sobre lila: a 32 px la cabeza completa no se lee. |

Prompt (cambia el encuadre según la fila):

```
Use the attached character sheet as the strict reference. App icon of the mole: only
the head and a bit of the shoulders, facing the viewer, big friendly smile, big pink
pear-shaped nose, rosy cheeks, tiny shiny black eyes, painterly fluffy dark-brown fur.
Centered on a solid circle of #6c45e3 with a soft lighter glow (#b56ef0) at the upper
left. Bold, simple, readable at 48 px. No text, no letters, no logo, no border.
Square 1:1, 1024x1024.
```

Fuente: `diseno/iconos/png/`. Las reducciones se hacen con LANCZOS desde el de 1024.

### D.2 Imagen para compartir el enlace (Open Graph)

- `public/compartir.png`, 1200 × 630, **sin** transparencia.
- Escena: fondo de persianas lila (degradado `#1b1352 → #6c45e3 → #e3a8ff`), el
  topo a la derecha saliendo de un agujero de la madriguera con una moneda dorada
  en la pata, y espacio vacío a la izquierda (ahí se pone el texto en código, no en
  la imagen).

### D.3 Estados vacíos por módulo

Cámaras de madriguera **con el topo**, mismo estilo que
`diseno/madriguera/PROMPTS-ASSETS.md` (sección 3.3), 1024 × 1024 con alfa,
publicadas a 384 px en `public/madriguera/vacio-<id>.webp`.

| `id` | Escena (inglés, para la línea Scene del prompt base del topo) |
| --- | --- |
| `ingresos` | `the mole sitting in a burrow chamber looking hopefully into an empty open lilac wallet` |
| `ahorros` | `the mole in a burrow chamber placing the very first gold coin into a lilac piggy bank` |
| `prestamos` | `the mole in a burrow chamber holding a short blank receipt with a lilac checkmark` |
| `despensa` | `the mole in a burrow chamber looking at an empty little shelf made of a root, with a tiny shopping list` |
| `sin-conexion` | `the mole in a burrow chamber holding a lantern, looking at a tunnel blocked by lilac soil` |
| `error` | `the mole sitting on a small lilac soil mound, scratching its head, a broken coin in two halves at its feet` |

## E. Entrega

- Fuentes de las animaciones: `diseno/topo/animaciones/<id>/NN.png` con su
  `prompts.json` (prompt exacto de cada cuadro). En `prompts.json` usa rutas
  **relativas** al repo; nunca rutas de tu disco (`C:\Users\...`).
- Para publicar una animación, agrégala a `ANIMACIONES` en
  `diseno/topo/publicar-animaciones.py` y corre
  `python diseno/topo/publicar-animaciones.py <id>`. El script genera la tira WebP y
  actualiza `public/topo/anim/manifest.json`.
- Revisa cada animación con `diseno/topo/animaciones/revision/index.html` sobre
  blanco y sobre violeta antes de publicarla.

## F. Orden recomendado

1. A. Completar `excavar-salir`.
2. B.1 `pensar-bucle` y D.1 iconos de la app.
3. B.2 `asentir`, B.3 `negar` y B.4 `celebrar`.
4. B.5 `guardar-moneda`, B.6 `saludar` y D.3 estados vacíos.
5. D.2 imagen para compartir y la sección C.
