# Método B — capas registradas

30 PNG RGBA de 1024 × 1024: `base.png` más 29 capas aisladas. Se generó cada pieza mediante una edición separada de la base con GPT Image y se corrigieron tamaño/posición al registrar las capas. Los originales de generación no garantizaban coincidencia de píxeles; los archivos finales comparten coordenadas fijas.

`base.png` es la reconstrucción neutra de las capas finales. No debe colocarse detrás de las piezas: para componer expresiones se utiliza `cuerpo.png`, que no tiene ojos, nariz ni boca, y se añaden las capas del estado elegido.

`manifest.json` incluye `defaultStack` (orden de dibujo), `bounds` (rectángulo ocupado), `target` (registro) y `pivot` (punto de giro en píxeles del lienzo). Izquierda/derecha se nombran desde el personaje; el lado izquierdo del topo queda a la derecha del espectador.

Para apilar en código, todas las imágenes ocupan el mismo rectángulo cuadrado sin recortarse. Para rotar un brazo con CSS: `transform-origin` es su `pivot` dividido entre 1024 y multiplicado por 100. Reemplaza una variante por otra; no muestres dos bocas u ojos del mismo lado a la vez. Los brazos de saludo son sustitutos de los brazos de reposo.

No es un archivo Rive/Spine ni un rig con huesos ya animado. Incluye recursos registrados y puntos de giro para montar la animación. La unión del pelaje al rotar requiere ajuste visual propio de una animación por recortes.

Referencia obligatoria: `../hoja-personaje.png`. Prompts e instrucciones de extracción: `../rig-plan.json`. La comparación visual está en `../rig-vista-previa.jpg`.
