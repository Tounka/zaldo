# Primera entrega de animaciones del topo

Alcance acordado: madriguera integrada y cinco animaciones prioritarias.
El resto del catálogo de `../PROMPTS-ANIMACIONES.md` queda para una entrega posterior.

| Animación | Cuadros | FPS | Bucle | Versión 512 |
| --- | ---: | ---: | --- | --- |
| excavar-entrar | 14 | 12 | No | Sí |
| excavar-salir | 12 | 12 | No | Sí |
| cavar-bucle | 8 | 12 | Sí | No |
| parpadeo | 4 | 12 | No | No |
| respirar | 6 | 12 | Sí | No |

44 PNG RGBA de 1024 × 1024 en las carpetas de cada animación. Cada carpeta
contiene `prompts.json`, con el prompt exacto, el original de generación y el registro
por traslación. Se usó la herramienta integrada GPT Image, con la hoja del personaje
y la pose neutra como referencias; los intermedios utilizan los dos cuadros clave.

El parpadeo conserva los píxeles de la pose neutra fuera de los ojos. La respiración
conserva cabeza y pies. Se reutilizan poses equivalentes para cerrar ambos bucles
sin deriva y el montículo final de la entrada es el primero de la salida.

## Reproducción e integración

- Tiras y catálogo: `public/topo/anim/`.
- `TopoAnimado` carga el catálogo y la tira una sola vez; respeta FPS, bucle,
  reproducción inversa y el último cuadro. Pausa fuera de pantalla y en pestañas
  ocultas; con movimiento reducido muestra una pose fija y finaliza las acciones.
- `TopoBurbuja` reproduce la salida antes de quedar en reposo.
- `TopoFestejo` reproduce salida, reacción y entrada al guardar algo.
- `AvatarAsistente`, movimientos y despensa utilizan el bucle mientras esperan.
- El dashboard utiliza los túneles al 5 %, el topo del borde y las cámaras; los
  estados vacíos de movimientos y despensa utilizan sus ilustraciones específicas.

Ejemplo:

```jsx
<TopoAnimado animacion="excavar-salir" tamano={120} alTerminar={continuar} />
```

## Revisión y exportación

Con `npm run dev`, abrir `/diseno/topo/animaciones/revision/index.html`.
La vista es independiente de Firebase y usa ejemplos para la composición del dashboard.
No lee ni escribe datos de cuentas. Incluye fondos blanco/violeta, reproducción inversa,
acciones de entrada/salida y estados vacíos. Los GIF a 12 FPS y las láminas de todos
los cuadros están en `revision/`.

Para volver a exportar: instalar Pillow y ejecutar desde la raíz del proyecto
`python diseno/topo/animaciones/exportar.py`. `produccion.json` conserva las rutas de
los originales de esta sesión; los PNG finales ya forman parte del proyecto.

Prueba de temporización: `node --test scripts/topo-tiempo.test.mjs`.
