# Assets del panel derecho del login — encargo para IA

Este documento es autosuficiente: pásaselo completo a la IA que va a generar las
imágenes. Explica qué generar, con qué estilo, dónde guardar cada archivo y cómo
ajustar su posición. **El código ya está listo**: en cuanto un archivo existe en su
ruta, aparece en pantalla; si falta, el panel se ve como antes (icono o nada).

---

## 1. Contexto

- App: **Zaldo**, finanzas personales. La mascota es un **topo** café, gordito,
  con nariz rosa en forma de pera, mejillas rosadas y patas rosas.
- Pantalla: login. A la izquierda va la tarjeta de acceso; a la derecha, un panel
  con un título, un párrafo y una tarjeta de vidrio que rota cada 4.5 s por seis
  funciones de la app.
- Fondo: persianas animadas oscuras con degradado lila
  (`#1b1352 → #3a27a8 → #6c45e3 → #b56ef0 → #e3a8ff → #c38aff`), el lila más
  intenso arriba a la derecha. La tarjeta de funciones es vidrio oscuro
  (`rgba(18,10,44,0.5)` con blur) y el texto es blanco.

Archivos a leer antes de generar:

| Archivo | Para qué |
| --- | --- |
| `diseno/topo/hoja-personaje.png` | Referencia **obligatoria** del topo: proporciones, colores y acabado. Adjúntala en cada prompt que incluya al topo. |
| `diseno/topo/manifest.json` | Prompts con los que se hicieron los estados actuales; reutiliza su redacción del personaje. |
| `src/assets/paginas/login/panelInformativo.jsx` | Dónde se usan los assets (`ASSETS_PANEL`, `rutaFuncion`, `FUNCIONES`). |

## 2. Reglas comunes

- PNG con **transparencia real** (canal alfa). Sin fondo, sin tablero de
  ajedrez pintado, sin sombra proyectada en el piso, sin texto ni logos.
- Estilo del topo: ilustración pintada, pelaje esponjoso con pinceladas
  visibles, luz cálida suave desde arriba a la izquierda. Debe ser **el mismo
  personaje** de la hoja, no uno parecido.
- Los objetos que acompañan al topo usan la paleta lila de arriba más acentos
  dorados suaves (`#f5c76a`) para monedas. Nada de verde dinero ni azul.
- Una sola pose por imagen, centrada, con ~10 % de margen.
- Las imágenes se ven sobre fondo **oscuro**: evita bordes claros o halos blancos
  alrededor del recorte.

## 3. Lista de assets

### 3.1 Ilustraciones de funciones (6) — prioridad alta

Sustituyen el icono blanco de la tarjeta de funciones. Se muestran a **84 × 84 px**
(se ven a 2× en pantallas retina), así que la silueta tiene que leerse en chico:
pocos objetos, grandes y claros.

- Generar: PNG cuadrado 1024 × 1024.
- Guardar fuente: `diseno/login/png/funciones/<id>.png`
- Publicar: `public/login/funciones/<id>.webp`, **256 × 256**, con alfa.

| `id` | Función (texto de la tarjeta) | Escena |
| --- | --- | --- |
| `cuentas` | Todas tus cuentas | El topo abrazando una cartera lila abierta de la que asoman tres tarjetas (una lila, una violeta, una dorada). |
| `movimientos` | Movimientos claros | El topo pasando una moneda dorada de una pata a la otra, con dos flechas curvas lila alrededor indicando ida y vuelta. |
| `captura-ia` | Captura con IA | El topo hablándole a un globo de diálogo lila del que salen chispas mágicas que se convierten en una moneda. |
| `ahorros` | Ahorros con meta | El topo metiendo una moneda dorada en un cochinito lila, con una banderita de meta clavada al lado. |
| `prestamos` | Préstamos bajo control | El topo sosteniendo un recibo largo con palomitas lila y una calculadora pequeña bajo el brazo. |
| `despensa` | Despensa y súper | El topo empujando un carrito de súper pequeño lleno de pan, frutas y un frasco, con detalles lila. |

Prompt base (cambia solo la línea **Scene**):

```
Use the attached character sheet as the strict single reference for exact character
design, proportions, colors, anatomy and illustration finish. One chubby dark-brown
mole, round pear-shaped body about 2.5 heads tall, painterly fluffy fur with visible
brush strokes, lighter brown belly, big pink pear-shaped nose, rosy cheeks, tiny shiny
black bead eyes, big pink paws with five rounded fingers, small pink feet.
Scene: <ESCENA EN INGLÉS DE LA TABLA>.
Props use a lilac/violet palette (#6c45e3, #b56ef0, #e3a8ff) with soft gold (#f5c76a)
for coins. Icon-like composition: few large readable shapes that still read at 84 px.
Full body, centered, whole character and props visible with 10% margin.
Soft warm upper-left lighting, gentle shading. Genuine transparent background PNG with
alpha, no ground, no cast shadow, no checkerboard painted into image, no text, no logo.
Square 1:1 high resolution. ONE pose only, no sheet or collage. Match the reference
closely.
```

### 3.2 Topo asomado — prioridad media

El topo asomándose **por detrás del borde superior** de la tarjeta de funciones:
se ven la cabeza, las dos patas apoyadas en el borde y nada del cuerpo de la
cintura para abajo. La tarjeta lo tapa de la barbilla para abajo.

- Generar: PNG 1024 × 1024.
- Guardar fuente: `diseno/login/png/topo-asomado.png`
- Publicar: `public/login/topo-asomado.webp`, **256 px de ancho**, con alfa,
  **recortado al contenido** (sin aire transparente arriba ni a los lados).
- Requisito clave: el borde inferior de la imagen debe ser **una línea recta
  horizontal** a la altura de las patas (como si estuviera cortada por la mesa).
  Las patas, con los dedos hacia abajo, tocan ese borde.

Escena para el prompt base: `the mole peeking over a horizontal edge, only head,
shoulders and both paws visible, paws resting on the edge with fingers curled over it,
curious happy expression looking slightly left; image cut straight horizontally at the
paws`.

### 3.3 Decoración de esquina — prioridad baja

Un racimo flotante de objetos de vidrio/cristal lila para la esquina superior
derecha del panel: dos o tres monedas translúcidas, una tarjeta de crédito de vidrio
esmerilado y unas chispas pequeñas. **Sin topo.** Da profundidad y continúa el lila
del fondo.

- Generar: PNG 1024 × 1024.
- Guardar fuente: `diseno/login/png/decoracion-esquina.png`
- Publicar: `public/login/decoracion-esquina.webp`, **460 px de ancho**, con alfa,
  recortado al contenido.

Prompt:

```
Floating cluster of frosted glass objects: two or three translucent lilac glass coins
and one frosted glass credit card, tilted at different angles, with a few tiny sparkles.
Glassmorphism, soft inner glow, subtle refraction, colors #6c45e3, #b56ef0, #e3a8ff
with a faint gold rim (#f5c76a) on the coins. Lit from the upper left. Designed to sit
on a very dark violet background (#1b1352). Genuine transparent background PNG with
alpha, no ground, no cast shadow, no text, no logo, no checkerboard. Square 1:1.
```

## 4. Exportar a WebP

Desde la raíz del repo (requiere Pillow: `pip install pillow`):

```python
from pathlib import Path
from PIL import Image

def exportar(origen, destino, ancho, recortar=False):
    img = Image.open(origen).convert("RGBA")
    if recortar:
        img = img.crop(img.getchannel("A").getbbox())
    alto = round(img.height * ancho / img.width)
    img = img.resize((ancho, alto), Image.LANCZOS)
    Path(destino).parent.mkdir(parents=True, exist_ok=True)
    img.save(destino, "WEBP", quality=88, method=6)

for id_ in ["cuentas", "movimientos", "captura-ia", "ahorros", "prestamos", "despensa"]:
    exportar(f"diseno/login/png/funciones/{id_}.png", f"public/login/funciones/{id_}.webp", 256)

exportar("diseno/login/png/topo-asomado.png", "public/login/topo-asomado.webp", 256, recortar=True)
exportar("diseno/login/png/decoracion-esquina.png", "public/login/decoracion-esquina.webp", 460, recortar=True)
```

Comprueba que cada WebP pese menos de ~60 KB (las funciones) o ~120 KB (la
decoración). Si pasa, baja `quality` a 80.

## 5. Posicionar

Todo se ajusta en `src/assets/paginas/login/panelInformativo.jsx`, constante
`ASSETS_PANEL`. Los números son píxeles relativos al bloque de texto del panel
(máx. 440 px de ancho; el título empieza en `top: 0`).

```js
const ASSETS_PANEL = {
  decoracionEsquina: {
    src: "/login/decoracion-esquina.webp",
    estilo: { top: -150, right: -90, width: 230, opacity: 0.95, rotate: "8deg" },
  },
  topoAsomado: {
    src: "/login/topo-asomado.webp",
    estilo: { top: -62, right: 18, width: 96, zIndex: 0 },
  },
};
```

- **topoAsomado**: está dentro del marco de la tarjeta de funciones y detrás de ella
  (la tarjeta tiene `z-index: 1`). `top` debe ser `-(alto mostrado − ~14 px)` para
  que las patas queden apoyadas sobre el borde: con `width: 96` y una imagen
  recortada de proporción `ancho/alto`, el alto mostrado es `96 / proporción`.
  Ejemplo: imagen 256 × 220 → alto mostrado ≈ 83 px → `top: -69`.
  Que no tape el texto del título de la función: mantenlo a la derecha
  (`right` entre 12 y 40).
- **decoracionEsquina**: va detrás del título (`z-index: -1`). Debe quedar en la
  esquina superior derecha sin cubrir más de las dos últimas palabras del título.
  Si se ve muy protagonista, baja `opacity` a 0.7–0.8 o `width` a 180–200.
- **Funciones**: no se posicionan; se muestran a 84 × 84 a la izquierda del texto.
  Si alguna se ve chica dentro de su cuadro, el problema es el margen del PNG:
  recórtala con `recortar=True` y vuelve a exportar a 256 × 256 centrada.

## 6. Verificar

1. `npm run dev` y abrir el login en escritorio (≥ 1200 px de ancho).
2. Esperar a que la tarjeta pase por las seis funciones: cada una debe mostrar su
   ilustración, no el icono blanco (si sale el icono, la ruta o el nombre no coinciden).
3. El topo asomado debe verse apoyado en el borde, sin flotar ni hundirse.
4. La decoración no debe tapar el título ni verse cortada por el borde de la ventana
   a 1280 × 720.
5. En móvil (< 600 px) el panel derecho está oculto: no hace falta revisarlo.
