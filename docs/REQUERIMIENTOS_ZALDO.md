# Revisión de requerimientos de Zaldo

Fecha de revisión: 28 de agosto de 2026

Este documento concentra los requerimientos comentados para Zaldo y el estado
actual de cada uno. La revisión se hizo únicamente sobre este repositorio.
No se incluyen capturas ni consultas a sitios externos de WordPress/Elementor;
ese punto corresponde a otro proyecto y requiere URLs explícitas en una tarea
separada.

## Resumen de estado

| ID | Requerimiento | Estado |
| --- | --- | --- |
| 1 | Corregir el botón de cierre y el desbordamiento del modal de modificar monto | Resuelto |
| 2 | Días de corte/límite de pago, estado mensual y borde lateral en Home | Resuelto |
| 3 | Categorías correctas e imágenes a todo el alto | Resuelto |
| 3.1 | Unificar el selector de categorías y los modales | Resuelto |
| 4 | Corregir filtros de categoría/cuenta encimados en Movimientos | Resuelto |
| 5 | Crear ingresos y dirigirlos a una cuenta | Resuelto |
| 6 | Cuenta por defecto editable para cada empresa | Resuelto |
| 7 | Desglosar incrementos de Ahorros por categoría, monto y nota | Resuelto |
| 8 | Ayuda contextual en la tarjeta central de Home | Resuelto |
| 9 | Capturas desktop/mobile para sitios WordPress | Fuera del alcance de Zaldo |

## Detalle

La cabecera comun tambien fuerza el contenido interno al 100% del contenedor,
y las vistas heredadas ya no declaran un ancho propio de 470/500/520/560 px.
Asi no dejan una franja blanca a la derecha ni desplazan visualmente la X fuera
del encabezado, incluso cuando Formik inserta un `<form>` intermedio. La
cabecera de `Nueva Nota de Deuda / Cobranza` no usa icono y conserva padding
izquierdo uniforme.

### 1. Modales: cierre, tamaño y desbordamiento

`src/assets/componentes/Modales/ModalGenerico.jsx` es ahora la base común:

- El contenedor limita su alto al viewport y permite scroll interno.
- El botón `X` permanece dentro del modal, con `aria-label`, `title` y soporte
  de teclado.
- `Escape` cierra el modal y se bloquea el scroll de la página de fondo.
- El encabezado usa un `bleed` controlado para llegar al borde del shell; el
  shell recorta el desbordamiento horizontal y mantiene la X posicionada
  sobre ese mismo contenedor.

Los modales de cuentas, movimientos, instituciones, ingresos, préstamos,
ahorros y Despensa usan este componente. En particular se migraron los
overlays propios que quedaban en:

- `componentes/ahorros/modalImportar.jsx`
- `paginas/prestamos/modalCrearNotaDeuda.jsx`
- `paginas/prestamos/modalRegistrarAbono.jsx`
- Los seis modales internos de `paginas/despensa/paginaDespensaUx.jsx`

Los avisos de confirmación de SweetAlert siguen usando su propio componente,
porque no son formularios modales de la aplicación.

### 2. Tarjetas de crédito en Home

Al crear o editar una tarjeta de crédito se pueden indicar el día del mes de:

- Corte (`fechaDeCorte`).
- Límite de pago (`fechaLimiteDePago`).

El modal de edición incluye el checkbox de pago del periodo actual. El valor se
guarda como `YYYY-MM`, por lo que se reinicia automáticamente al cambiar de
mes.

El borde derecho de la tarjeta monetaria está en las filas de cuentas de
`/home`, no en las tarjetas visuales de `/cuentas`. La propuesta aplicada es:

- Verde: sin saldo pendiente o pago marcado.
- Azul: al corriente y aún faltan más de cinco días.
- Ámbar: vence hoy o dentro de cinco días.
- Rojo: fecha límite vencida sin pago marcado.
- Gris: falta configurar el día límite.

### 3 y 3.1. Categorías y selector visual

Se centralizó el selector en
`src/assets/componentes/categorias/SelectorCategoriaVisual.jsx` y se reutiliza
en Nuevo Movimiento, edición de movimientos y el modal de Movimientos.

- Las imágenes usan `width: 100%`, `height: 100%` y `object-fit: cover`.
- Las categorías guardadas históricamente como texto visible se normalizan a
  su clave interna.
- “Ingreso” tiene categoría e imagen válidas, por lo que ya no cae en “Sin
  categoría”.

### 4. Filtros de Movimientos

La vista de Movimientos ya no monta la barra de herramientas duplicada de la
tabla junto con los filtros propios. Se conserva una sola fila de filtros para
evitar que categoría y cuenta aparezcan encimadas.

### 5 y 6. Ingresos y cuenta destino

En Nuevo Ingreso se puede seleccionar la cuenta que recibe el dinero o elegir
“No registrar en una cuenta”. Cuando el registro se guarda como pagado:

1. Se crea un movimiento de tipo ingreso en la cuenta elegida.
2. Se actualiza el saldo de la cuenta.
3. Al editar un ingreso que ya estaba pagado no se vuelve a crear el movimiento.

En la configuración de cada empresa se puede definir una cuenta por defecto.
La selección solo prellena el formulario: se puede cambiar o quitar al crear el
ingreso.

### 7. Desglose de incrementos en Ahorros

Cada incremento diario puede dividirse en varias partes. Cada parte tiene:

- Categoría (por defecto “Intereses generales”).
- Monto.
- Nota.

El editor no permite guardar hasta que la suma de las partes coincide con la
diferencia diaria. Las categorías actuales incluyen intereses generales,
préstamos, aumento a capital, rendimientos y otros.

### 8. Ayuda en Home

La tarjeta central de resumen tiene un botón `?` que abre un modal explicando
Balance, Líquido real y el desglose de los valores.

## Validación realizada

- `npm.cmd run build`: correcto.
- ESLint sobre el núcleo del modal y los formularios ajustados: correcto.
- `git diff --check`: correcto.

El lint global todavía reporta cinco errores `no-unused-vars` preexistentes en
`src/App.jsx`, `modalAgregarPagoPrestamo.jsx` y archivos de préstamos. No fueron
alterados porque no pertenecen a estos requerimientos.

## Estado de las pruebas E2E

- La aplicacion local se levanto aislada en `http://localhost:4173/` y la
  pantalla de inicio de sesion cargo correctamente.
- El flujo de Google abre el selector de cuentas y llega al punto de
  autenticacion. Quedo pendiente seleccionar una de las cuentas disponibles;
  no se eligio ninguna de forma automatica y no se escribieron datos en
  Firebase.
- Por ese bloqueo de autenticacion no se marcaron como "probados" los flujos
  que requieren datos reales (crear ingreso, guardar tarjeta, desglose de
  ahorros y apertura de cada modal). El build y la revision estatica si estan
  validados.

## Siguiente paso recomendado

Hacer una pasada manual en desktop y móvil sobre `/home`, `/movimientos`,
`/cuentas`, `/ingresos`, `/ahorros`, `/instituciones`, `/prestamos` y `/despensa`
para validar datos reales de Firebase, especialmente el primer pago de una
tarjeta y la conversión de registros históricos de categorías.
