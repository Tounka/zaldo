# Assets de madriguera

Ocho ilustraciones creadas con la herramienta integrada GPT Image según
`PROMPTS-ASSETS.md`. Las escenas del topo utilizan `diseno/topo/hoja-personaje.png`
del proyecto `zaldo-publico` como referencia del personaje.

- Fuentes: `png/*.png`, siete lienzos de 1024 × 1024 y un separador de 2048 × 512.
- Assets para la app: `public/madriguera/*.webp`, con transparencia real.
- Prompts exactos y originales del generador: `generacion.json`.
- Prompt del retoque del patrón: `reparacion-patron.json`.
- Revisión visual: `revision/lamina-blanco.jpg`, `revision/lamina-violeta.jpg`.
- Repetición: `revision/patron-2x2.jpg`.
- Tamaños y comprobación del canal alfa: `revision/validacion.json`.

El patrón se desplazó al 50 % y se retocó con ImageGen. Su perímetro conserva
la región continua de la imagen original para mantener las uniones del mosaico.
Los recortes de los WebP ignoran píxeles con alfa menor que 8 para evitar márgenes
casi invisibles. El separador se encaja en un lienzo 4:1 sin deformar la ilustración.

Para volver a exportar, ejecutar `exportar.py` con Python y Pillow instalados.
El script conserva en JSON las rutas de los originales de generación de esta sesión.
El patrón está pensado para utilizarse al 4–6 % de opacidad, según el encargo.
