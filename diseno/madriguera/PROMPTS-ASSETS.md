# Assets de la textura "madriguera" — encargo para IA

Este documento es autosuficiente: pásaselo completo a la IA que va a generar las
imágenes. Explica qué generar, con qué estilo y dónde guardar cada archivo.

---

## 1. Contexto

- App: **Zaldo**, finanzas personales. La mascota es un **topo** café, gordito,
  con nariz rosa en forma de pera, mejillas rosadas y patas rosas.
- Objetivo: que el dashboard (fondo lila claro, tarjetas blancas, filas moradas)
  deje de verse plano. Detrás de las secciones va una red de **túneles de
  madriguera** muy tenue, con cámaras donde el topo guarda monedas, y el topo
  se asoma desde agujeros en las esquinas.
- Paleta: `#1b1352`, `#3a27a8`, `#6c45e3`, `#b56ef0`, `#e3a8ff`, con acentos
  dorados `#f5c76a` en las monedas. Nada de verde dinero ni azul. La tierra **no**
  es café: es lila/violeta, para que combine con la interfaz.

Archivos a leer antes de generar:

| Archivo | Para qué |
| --- | --- |
| `diseno/topo/hoja-personaje.png` | Referencia **obligatoria** del topo. Adjúntala en cada prompt que incluya al topo. |
| `diseno/topo/manifest.json` | Redacción con la que se describió al personaje. |
| `diseno/login/PROMPTS-ASSETS.md` | El mismo estilo de encargo y de prompt base. |

## 2. Reglas comunes

- PNG con **transparencia real** (canal alfa). Sin fondo de color, sin tablero de
  ajedrez pintado, sin sombra proyectada en el piso, sin texto ni logos.
- Ilustración pintada, con pinceladas visibles y luz cálida suave desde arriba a
  la izquierda: el mismo acabado que el topo.
- Se ven sobre fondos **claros** (lila muy pálido y blanco) y algunas piezas sobre
  morado oscuro: sin halos blancos ni bordes sucios alrededor del recorte.
- La tierra y los túneles van en tonos lila; solo las monedas son doradas.

## 3. Lista de assets

### 3.1 Patrón de túneles — prioridad alta

Un mosaico que se repite como fondo de las secciones (la app lo pinta al 4–6 % de
opacidad).

- Generar: PNG cuadrado 1024 × 1024, **repetible sin costuras** (los túneles que
  salen por un borde entran por el borde opuesto a la misma altura).
- Guardar fuente: `diseno/madriguera/png/patron-tuneles.png`
- Publicar: `public/madriguera/patron-tuneles.webp`, **512 × 512**, con alfa.
- Si la IA no logra un patrón repetible, genera una imagen ancha (2048 × 1024) y
  después se convierte en patrón a mano (desplazamiento al 50 % y retoque).

```
Seamless tileable pattern of underground mole burrow tunnels seen in cross-section,
drawn as soft rounded channels that branch and curve organically, with a few small
round chambers along the way; two or three tiny gold coins (#f5c76a) resting in the
chambers, a few small pebbles and thin roots. Tunnels and soil rendered only in
lilac/violet tones (#3a27a8, #6c45e3, #b56ef0, #e3a8ff), painterly texture with
visible brush strokes, soft warm upper-left lighting. Low visual density: plenty of
empty space between tunnels. Tunnels exiting one edge re-enter at the same position
on the opposite edge. Genuine transparent background PNG with alpha: only the
tunnels, soil edges, roots, pebbles and coins are opaque. No mole, no text, no logo,
no checkerboard painted into the image. Square 1:1.
```

### 3.2 Topo asomado desde el agujero — prioridad alta

Va en la esquina superior derecha de cada sección (Activos, Pasivos), a ~56 px de
alto, como si el topo saliera del borde de la tarjeta.

- Generar: PNG 1024 × 1024.
- Guardar fuente: `diseno/madriguera/png/topo-agujero.png`
- Publicar: `public/madriguera/topo-agujero.webp`, **256 px de ancho**, con alfa,
  recortado al contenido.
- Requisito clave: el borde inferior es **una línea recta horizontal** a la altura
  del agujero, para que se alinee con el borde de la tarjeta.

Usa el prompt base (sección 4) con esta escena:

`the mole popping out of a round burrow hole in lilac soil, visible from the chest up,
both pink paws resting on the rim of the hole, small lilac soil crumbs around the rim,
curious happy expression looking slightly left; the image is cut straight horizontally
at the rim of the hole`

### 3.3 Cámaras sueltas — prioridad media

Piezas decorativas para estados vacíos y rincones. Cada una es una cámara
redonda de madriguera vista en corte, sin topo.

- Generar: PNG 1024 × 1024 cada una.
- Guardar fuente: `diseno/madriguera/png/camara-<id>.png`
- Publicar: `public/madriguera/camara-<id>.webp`, **384 px de ancho**, con alfa,
  recortado al contenido.

| `id` | Contenido de la cámara |
| --- | --- |
| `monedas` | Un montoncito de monedas doradas y una bolsita lila amarrada. |
| `tarjetas` | Tres tarjetas bancarias recargadas en la pared de tierra (lila, violeta, dorada), sin números ni logos. |
| `despensa` | Un frasco, una hogaza de pan y dos frutas lila sobre una repisa de raíz. |
| `vacia` | Cámara vacía con una lucecita cálida colgando de una raíz (para "aún no hay datos"). |

```
Cross-section of a single round underground mole burrow chamber dug into lilac soil,
containing: <CONTENIDO EN INGLÉS DE LA TABLA>. Soil and walls only in lilac/violet
tones (#3a27a8, #6c45e3, #b56ef0, #e3a8ff), gold accents (#f5c76a), painterly texture
with visible brush strokes, soft warm upper-left lighting. The soil fades softly at
the outer edges into full transparency. Centered with 10% margin. Genuine transparent
background PNG with alpha, no mole, no text, no logo, no numbers, no checkerboard
painted into the image. Square 1:1.
```

### 3.4 Topo durmiendo en su cámara — prioridad media

Estado vacío principal ("no hay movimientos este mes").

- Generar: PNG 1024 × 1024.
- Guardar fuente: `diseno/madriguera/png/topo-dormido-camara.png`
- Publicar: `public/madriguera/topo-dormido-camara.webp`, **384 px de ancho**, con
  alfa, recortado al contenido.

Escena para el prompt base:

`the mole curled up asleep inside a round underground burrow chamber in lilac soil,
hugging a single gold coin like a pillow, eyes closed with a calm smile, the soil of
the chamber fading softly into full transparency at the outer edges`

### 3.5 Separador de tierra — prioridad baja

Un borde horizontal de tierra con raíces y alguna moneda semienterrada, para
ponerlo bajo el título de cada sección.

- Generar: PNG 2048 × 512.
- Guardar fuente: `diseno/madriguera/png/separador.png`
- Publicar: `public/madriguera/separador.webp`, **1200 px de ancho**, con alfa,
  recortado al contenido.

```
Thin horizontal strip of lilac soil seen in cross-section, wavy top edge, a few thin
roots hanging below, small pebbles and one half-buried gold coin (#f5c76a). Soil only
in lilac/violet tones (#3a27a8, #6c45e3, #b56ef0, #e3a8ff), painterly texture, soft
warm upper-left lighting. The strip fades to full transparency at the left and right
ends. Genuine transparent background PNG with alpha, no mole, no text, no logo, no
checkerboard painted into the image. Wide 4:1.
```

## 4. Prompt base del topo

Para 3.2 y 3.4 (cambia solo la línea **Scene**):

```
Use the attached character sheet as the strict single reference for exact character
design, proportions, colors, anatomy and illustration finish. One chubby dark-brown
mole, round pear-shaped body about 2.5 heads tall, painterly fluffy fur with visible
brush strokes, lighter brown belly, big pink pear-shaped nose, rosy cheeks, tiny shiny
black bead eyes, big pink paws with five rounded fingers, small pink feet.
Scene: <ESCENA>.
Soil and props use a lilac/violet palette (#3a27a8, #6c45e3, #b56ef0, #e3a8ff) with
soft gold (#f5c76a) for coins. Few large readable shapes that still read at 56 px.
Soft warm upper-left lighting, gentle shading. Genuine transparent background PNG with
alpha, no cast shadow, no checkerboard painted into image, no text, no logo.
Square 1:1 high resolution. ONE pose only, no sheet or collage. Match the reference
closely.
```

## 5. Animaciones del topo en la madriguera

Las animaciones cuadro por cuadro (excavar, entrar y salir de la tierra, cavar en
bucle, cortinilla de madriguera) tienen su propio encargo en
`diseno/topo/PROMPTS-ANIMACIONES.md`. Usan la misma tierra lila de este documento:
genera primero estos assets y adjúntalos como referencia de la tierra.

## 6. Revisión antes de publicar

- Abre cada PNG sobre fondo blanco **y** sobre `#1b1352`: no debe haber halo claro
  ni tablero de ajedrez.
- Comprueba que el canal alfa es real (el fondo desaparece en el editor, no es
  blanco ni gris).
- En el patrón 3.1, ponlo en mosaico 2 × 2 y revisa que no se vean costuras.
