# Animaciones del topo — encargo para IA

Este documento es autosuficiente: pásaselo completo a la IA que va a generar las
imágenes. Explica cómo producir **muchos fotogramas consistentes** del topo,
qué animaciones hacen falta, cómo se nombran y cómo se publican.

Léelo junto con `diseno/madriguera/PROMPTS-ASSETS.md`: la tierra, los agujeros y
los túneles de estas animaciones son **los mismos** de la madriguera (tierra
lila, monedas doradas). Si un fotograma tiene tierra café, está mal.

---

## 1. Contexto

- App: **Zaldo**, finanzas personales. La mascota es un **topo** café, gordito,
  con cuerpo en forma de pera de unas 2.5 cabezas de alto, nariz rosa en forma de
  pera, mejillas rosadas, ojitos negros brillantes, patas rosas de cinco dedos y
  pies rosas pequeños.
- Hoy existen 10 estados fijos (`public/topo/<estado>-256|512.webp`) y un rig por
  capas (`diseno/topo/rig-capas/`) que anima ojos, boca y brazos con CSS.
- Lo que falta: **animación cuadro por cuadro** para acciones que el rig no puede
  hacer (excavar, entrar y salir de la tierra, caminar, saltar), **transiciones**
  entre estados y **más capas** para el rig.

Archivos a leer antes de generar:

| Archivo | Para qué |
| --- | --- |
| `diseno/topo/hoja-personaje.png` | Referencia **obligatoria** en TODOS los prompts. |
| `diseno/topo/rig-neutral-compuesto.png` | Pose neutra registrada: escala y posición exactas del lienzo. |
| `diseno/topo/manifest.json` | Redacción del personaje para los 10 estados actuales. |
| `diseno/topo/rig-capas/README.md` y `rig-plan.json` | Convención de capas, `target` y `pivot`. |
| `diseno/madriguera/PROMPTS-ASSETS.md` | Paleta y estilo de la tierra, agujeros y monedas. |

## 2. Cómo lograr fotogramas consistentes (la parte más importante)

Un generador de imágenes **no** mantiene al personaje idéntico entre imágenes
por sí solo. Para que una secuencia no "tiemble", sigue este método al pie de la
letra:

1. **Poses clave primero.** Para cada animación genera solo los fotogramas clave
   (los marcados con ★ en el catálogo). Adjunta siempre `hoja-personaje.png` y
   `rig-neutral-compuesto.png`.
2. **Edita, no regeneres.** Cada fotograma clave nuevo se hace **editando el
   anterior** (modo edición o imagen a imagen), adjuntándolo junto con la hoja del
   personaje. Pide explícitamente que solo cambie la pose descrita.
3. **Intermedios al final.** Los fotogramas sin ★ se piden adjuntando los dos
   clave que los rodean: *"exactly halfway between image A and image B"*.
4. **Mismo lienzo, misma cámara.** Lienzo de 1024 × 1024, cámara fija y frontal,
   sin zoom ni encuadres distintos. El topo conserva su tamaño de
   `rig-neutral-compuesto.png`.
5. **Línea de piso fija.** Las plantas de los pies (o el borde del agujero) quedan
   siempre en **y = 918 px** y el centro del cuerpo en **x = 512 px**. Es la misma
   base del rig (`target` del cuerpo: 182, 65, 842, 918). Si el fotograma no cae
   ahí, se corrige al registrar: se mueve, no se reescala.
6. **Una pose por imagen.** Nunca hojas, collages ni tiras de varios cuadros en una
   sola imagen: salen con escalas distintas.
7. **Revisión en secuencia.** Antes de dar una animación por buena, pasa los
   cuadros seguidos (GIF de prueba a 12 fps). Si un cuadro cambia de color, de
   grosor de pelaje o de tamaño de nariz, se rehace ese cuadro.

## 3. Reglas comunes

- PNG con **transparencia real** (canal alfa). Sin fondo, sin tablero de ajedrez
  pintado, sin sombra proyectada en el piso, sin texto ni logos.
- Ilustración pintada, pelaje esponjoso con pinceladas visibles, luz cálida suave
  desde **arriba a la izquierda** en todos los cuadros (la luz no se mueve).
- Tierra, agujeros y montículos: lila/violeta (`#3a27a8`, `#6c45e3`, `#b56ef0`,
  `#e3a8ff`). Monedas: dorado `#f5c76a`. Nada de verde dinero ni azul.
- Las partículas (tierra volando, chispas, zzz) van **dentro** del cuadro y
  también sobre fondo transparente.
- Se ven sobre fondos claros y sobre morado oscuro (`#1b1352`): sin halos blancos.

## 4. Prompt base

Cambia solo las líneas **Animation** y **Frame**. Adjunta la hoja del personaje,
`rig-neutral-compuesto.png` y, a partir del segundo cuadro, el cuadro anterior.

```
Use the attached character sheet as the strict single reference for exact character
design, proportions, colors, anatomy and illustration finish. When a previous frame is
attached, keep EVERYTHING identical to it (character size, position, fur, colors,
lighting, camera) and change ONLY what this frame describes.
One chubby dark-brown mole, round pear-shaped body about 2.5 heads tall, painterly
fluffy fur with visible brush strokes, lighter brown belly, big pink pear-shaped nose,
rosy cheeks, tiny shiny black bead eyes, big pink paws with five rounded fingers,
small pink feet.
Animation: <NOMBRE Y DESCRIPCIÓN GENERAL EN INGLÉS>.
Frame <N> of <TOTAL>: <POSE EXACTA DE ESTE CUADRO EN INGLÉS>.
This is one frame of a frame-by-frame animation: fixed front camera, same scale as
the neutral reference, feet (or the rim of the hole) on the same ground line at 90%
of the image height, body centered horizontally.
Soil, holes and mounds in lilac/violet tones (#3a27a8, #6c45e3, #b56ef0, #e3a8ff);
coins in soft gold (#f5c76a). Soft warm upper-left lighting, gentle shading.
Genuine transparent background PNG with alpha, no ground plane except the described
soil, no cast shadow, no checkerboard painted into image, no text, no logo.
Square 1:1, 1024x1024. ONE frame only, no sheet, no collage, no motion lines unless
described. Match the reference closely.
```

## 5. Catálogo de animaciones

Notación: **★** = fotograma clave (se genera primero). **Bucle** = la animación se
repite; el último cuadro debe enlazar con el primero. Velocidad por defecto:
**12 fps**.

### 5.1 `excavar-entrar` — prioridad máxima (14 cuadros, sin bucle)

El topo se pone el casco minero, cava y desaparece bajo la tierra. Se usa como
salida de pantalla y como transición entre secciones.

| # | Cuadro |
| --- | --- |
| 01 ★ | Reposo de pie, mirando hacia el suelo con curiosidad. |
| 02 | Se lleva una pata a la cabeza. |
| 03 ★ | Se ajusta el casco minero con lámpara (el de `rig-capas/casco-minero.png`), sonrisa decidida. |
| 04 | Se agacha un poco, rodillas flexionadas. |
| 05 ★ | Agachado, ambas patas delanteras tocando la tierra lila; aparece un círculo de tierra suelta a sus pies. |
| 06 | Pata derecha atrás lanzando tierra; primeras migajas en el aire a la izquierda. |
| 07 ★ | Pata izquierda atrás; más tierra volando a la derecha; un agujero poco profundo bajo sus pies. |
| 08 | Pata derecha atrás; el agujero crece; los pies ya no se ven. |
| 09 ★ | Hundido hasta la cintura, sigue cavando; montículo de tierra a los lados. |
| 10 | Hundido hasta el pecho, salta tierra hacia arriba. |
| 11 ★ | Solo se ven la cabeza con el casco y las patas en el borde; guiña un ojo. |
| 12 | Solo el casco y la luz de la lámpara sobre el borde. |
| 13 ★ | Agujero con montículo lila y unas migajas cayendo; sin topo. |
| 14 | Montículo asentado, migajas en el piso; sin topo (cuadro final quieto). |

Animation (en inglés para el prompt): `the mole puts on its miner helmet with a lamp,
digs into lilac soil with its front paws throwing soil crumbs behind, and disappears
down the hole`.

### 5.2 `excavar-salir` — prioridad máxima (12 cuadros, sin bucle)

Lo contrario: aparece desde la tierra. Entrada a una pantalla o cuando el
asistente se abre.

| # | Cuadro |
| --- | --- |
| 01 ★ | Montículo lila quieto, sin topo. |
| 02 | El montículo tiembla; migajas saltando. |
| 03 ★ | Se abre un agujero; asoma la punta de la nariz rosa. |
| 04 | Asoma la nariz completa olfateando. |
| 05 ★ | Asoma la cabeza con el casco, ojos parpadeando por la luz. |
| 06 | Salen las dos patas y se apoyan en el borde. |
| 07 ★ | Se impulsa: cuerpo afuera hasta la cintura, tierra cayéndole de la cabeza. |
| 08 | Sale de un brinco, pies en el aire. |
| 09 ★ | Aterriza junto al agujero, rodillas flexionadas. |
| 10 | Se sacude: pelaje esponjado, migajas volando. |
| 11 ★ | Se quita el casco con una pata, sonriendo. |
| 12 | Reposo de pie junto al agujero, saluda con la pata libre. |

### 5.3 `cavar-bucle` — prioridad alta (8 cuadros, bucle)

Indicador de carga: el topo cava sin moverse de lugar mientras la app espera
(por ejemplo, la captura con IA).

| # | Cuadro |
| --- | --- |
| 01 ★ | Hundido hasta la cintura con casco, pata derecha arriba con tierra. |
| 02 | Pata derecha bajando. |
| 03 ★ | Pata derecha abajo, pata izquierda subiendo; tierra volando a la derecha. |
| 04 | Pata izquierda arriba. |
| 05 ★ | Pata izquierda abajo; tierra volando a la izquierda. |
| 06 | Ambas patas a media altura. |
| 07 ★ | Se limpia la frente con la pata, cara concentrada. |
| 08 | Vuelve a la pose del cuadro 01 (enlaza el bucle). |

### 5.4 Bucles de reposo — prioridad alta

| `id` | Cuadros | Bucle | Descripción |
| --- | --- | --- | --- |
| `respirar` | 6 | Sí | Reposo; el pecho sube y baja muy poco y las patas suben levemente con el vientre. |
| `parpadeo` | 4 | No | Ojos abiertos ★ → medio cerrados → cerrados ★ → abiertos. |
| `olfatear` | 6 | No | La nariz se mueve hacia arriba y a los lados ★, bigotes temblando, ojos curiosos. |
| `mirar-lados` | 8 | No | Gira la cabeza a la izquierda ★, regresa al centro ★, a la derecha ★ y regresa. |
| `bostezo` | 8 | No | Estira los brazos ★, boca muy abierta ★, ojos llorosos, vuelve al reposo. |

### 5.5 Reacciones — prioridad alta

| `id` | Cuadros | Bucle | Descripción |
| --- | --- | --- | --- |
| `saludar` | 8 | Sí (de 03 a 08) | Levanta la pata derecha ★ y la mueve de lado a lado ★, con una gran sonrisa. |
| `celebrar` | 10 | No | Se agacha ★, salta con los brazos arriba ★, monedas doradas y chispas lila alrededor ★, aterriza ★. |
| `aplaudir` | 6 | Sí | Patas separadas ★, patas juntas ★ con chispitas en el choque. |
| `asentir` | 6 | No | La cabeza baja ★ y sube dos veces, sonrisa. Confirma una captura. |
| `negar` | 6 | No | La cabeza va a izquierda ★ y derecha ★, cejas preocupadas. Error de validación. |
| `preocupado` | 8 | No | Se lleva las patas a las mejillas ★, tiembla un poco, aparece una gota de sudor ★. |
| `sorpresa` | 6 | No | Brinquito ★, ojos muy abiertos y boca en "o" ★, vuelve al reposo. |
| `risa` | 8 | Sí | Se sujeta la barriga ★, ojos cerrados de risa ★, se balancea. |

### 5.6 Acciones con monedas y finanzas — prioridad media

| `id` | Cuadros | Bucle | Descripción |
| --- | --- | --- | --- |
| `contar-monedas` | 10 | Sí | Sentado frente a una pila de monedas ★, toma una ★, la mira ★ y la pone en otra pila ★. |
| `guardar-moneda` | 10 | No | Sostiene una moneda ★, la mete en un cochinito lila ★, cae ★, sonrisa satisfecha ★. Meta de ahorro. |
| `lanzar-moneda` | 8 | No | Lanza una moneda hacia arriba ★, la sigue con la mirada ★, la atrapa ★. |
| `anotar` | 8 | Sí | Sostiene una libretita lila y escribe con un lápiz dorado ★, mueve la cabeza siguiendo lo escrito ★. |
| `calculadora` | 8 | Sí | Teclea en una calculadora pequeña ★, mira el resultado ★. |
| `carrito` | 8 | Sí | Empuja un carrito de súper pequeño con pan y frutas ★, paso alternado ★. Despensa. |
| `buscar-lupa` | 8 | Sí | Camina inclinado mirando el piso con una lupa ★. Búsqueda. |

### 5.7 Desplazamiento — prioridad media

Vista de **perfil** (mirando a la derecha del espectador). Para ir hacia la
izquierda, el código voltea la imagen en espejo; no generes la otra dirección.

| `id` | Cuadros | Bucle | Descripción |
| --- | --- | --- | --- |
| `caminar` | 8 | Sí | Ciclo de paso: contacto ★, bajada, paso, alto ★, contacto opuesto ★... con bamboleo del cuerpo. |
| `correr` | 6 | Sí | Patas más estiradas, cuerpo inclinado hacia adelante, nubecitas de tierra en los pies. |
| `saltar` | 8 | No | Se agacha ★, despega ★, punto más alto ★, cae ★, aterriza flexionando las rodillas. |
| `tropezar` | 8 | No | Tropieza ★, cae de panza con gracia ★, se levanta sacudiéndose ★. Error divertido. |

### 5.8 Sueño — prioridad baja

| `id` | Cuadros | Bucle | Descripción |
| --- | --- | --- | --- |
| `dormirse` | 10 | No | Bostezo ★, se acurruca ★, cierra los ojos ★, aparece una "z" ★. |
| `dormido` | 6 | Sí | Acurrucado abrazando una moneda, respira y flotan zzz lila. |
| `despertar` | 8 | No | Abre un ojo ★, se estira ★, se frota los ojos ★, sonríe. |

Excepción a la regla "sin texto": la letra **z** de los zzz sí se permite aquí.

## 6. Transiciones entre estados

Cuadros cortos (4 a 6) que enlazan dos estados fijos existentes, para que el
cambio no sea un salto seco. Siempre empiezan en el estado de origen y terminan
en el de destino, **idénticos** a los PNG de `diseno/topo/gpt-png/`.

Adjunta los dos PNG de origen y destino y pide: *"frame N of 5 of a smooth
transition from image A to image B"*.

| `id` | De → a | Cuadros |
| --- | --- | --- |
| `reposo-a-saludando` | reposo → saludando | 5 |
| `reposo-a-pensando` | reposo → pensando | 5 |
| `pensando-a-feliz` | pensando → feliz | 5 |
| `pensando-a-preocupado` | pensando → preocupado | 5 |
| `feliz-a-celebrando` | feliz → celebrando | 4 |
| `reposo-a-senalando` | reposo → señalando | 4 |
| `reposo-a-moneda` | reposo → moneda | 5 |
| `reposo-a-durmiendo` | reposo → durmiendo | 6 |
| `preocupado-a-reposo` | preocupado → reposo | 5 |
| `excavando-a-reposo` | excavando → reposo | 6 |

No hacen falta las transiciones de regreso: el código las reproduce al revés.

## 7. Capas nuevas para el rig — prioridad media

Son la forma más barata de tener "muchísimas" animaciones: con pocas capas el
código combina cientos de expresiones. Se generan **editando**
`rig-neutral-compuesto.png` exactamente como dicta `rig-plan.json`: mismo lienzo
1024 × 1024, misma posición y una sola pieza aislada por archivo. Guardar en
`diseno/topo/rig-capas/` y registrar en su `manifest.json` (con `target` y `pivot`).

| Capa | Para qué |
| --- | --- |
| `ojo-izquierdo-cerrado`, `ojo-derecho-cerrado` | Parpadeo real (hoy solo existe "somnoliento"). |
| `ojo-izquierdo-mirada-izq/der`, `ojo-derecho-mirada-izq/der` | Mirar a los lados sin girar la cabeza. |
| `boca-a`, `boca-e`, `boca-o`, `boca-m` | Hablar: sincronizar la boca con la burbuja del asistente. |
| `ceja-izquierda-enojada`, `ceja-derecha-enojada`, `ceja-izquierda-triste`, `ceja-derecha-triste` | Más emociones con las mismas bocas. |
| `brazo-derecho-arriba`, `brazo-izquierdo-arriba` | Celebrar o señalar hacia arriba. |
| `brazo-derecho-cavar`, `brazo-izquierdo-cavar` | Cavar con el rig, sin cuadros. |
| `brazo-derecho-moneda` | Sostener una moneda (reemplaza al brazo de reposo). |
| `pie-derecho-paso`, `pie-izquierdo-paso` | Pasitos en el lugar. |
| `orejitas-sonrojo` | Rubor intenso para momentos tiernos. |
| `gota-sudor` | Preocupación (complementa `lagrima`). |

## 8. Cortinilla de madriguera — prioridad media

Transición de pantalla completa, sin topo: la tierra lila crece desde abajo hasta
cubrir todo el cuadro y luego se abre un túnel por el centro.

- 10 cuadros de 1920 × 1080: 01 vacío → 05 ★ la mitad cubierta de tierra con
  raíces y monedas → 07 ★ cubierta por completo → 10 ★ túnel circular abierto en
  el centro, transparente, que deja ver la pantalla nueva.
- Alfa real en todo lo que no sea tierra. El centro del túnel del cuadro 10 debe
  ser 100 % transparente.
- Guardar como `diseno/topo/animaciones/cortinilla-madriguera/NN.png`.

## 9. Nombres, entrega y publicación

**Fuentes (todas las animaciones):**

```
diseno/topo/animaciones/<id>/01.png, 02.png, ...   ← PNG 1024 × 1024 con alfa
diseno/topo/animaciones/<id>/prompts.json          ← prompt exacto de cada cuadro
```

**Publicación** (la hace quien integra en código, no la IA que genera):

- Tira horizontal WebP con alfa, **256 px por cuadro**:
  `public/topo/anim/<id>.webp` (por ejemplo, 14 cuadros → 3584 × 256).
- Versión de 512 px por cuadro solo para las animaciones que se vean grandes
  (`excavar-entrar`, `excavar-salir`, `celebrar`):
  `public/topo/anim/<id>@2x.webp`.
- Registro de cada animación en `public/topo/anim/manifest.json`:

```json
{
  "excavar-entrar": { "cuadros": 14, "fps": 12, "bucle": false, "tam": 256, "retina": true },
  "cavar-bucle":    { "cuadros": 8,  "fps": 12, "bucle": true,  "tam": 256, "retina": false }
}
```

Nota: el código todavía no reproduce tiras de cuadros. Hace falta un componente
`TopoAnimado` que lea este manifest, avance con `background-position` en pasos y
respete `bucle` y `fps`. Se construye cuando existan las primeras dos animaciones
(`excavar-entrar` y `excavar-salir`).

## 10. Orden recomendado de producción

1. `excavar-entrar` y `excavar-salir`: son la firma visual del topo.
2. `cavar-bucle`, `parpadeo` y `respirar`: hacen que el topo se sienta vivo en
   todo momento.
3. Capas nuevas del rig (sección 7): multiplican las expresiones sin cuadros.
4. Reacciones (5.5) y transiciones (6).
5. Acciones con monedas (5.6), desplazamiento (5.7) y sueño (5.8).
6. Cortinilla de madriguera (8).

## 11. Revisión antes de publicar

- Pasa cada animación como GIF a 12 fps sobre fondo blanco **y** sobre `#1b1352`.
- El topo no debe cambiar de tamaño, color ni grosor de pelaje entre cuadros.
- Los pies (o el borde del agujero) no deben "flotar" ni hundirse de un cuadro a otro.
- En los bucles, el último cuadro debe enlazar con el primero sin brinco.
- Ningún cuadro tiene tablero de ajedrez pintado ni halo claro alrededor.
