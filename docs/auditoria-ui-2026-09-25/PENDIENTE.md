# Pendientes de la auditoría UI/UX

**Actualizado:** 2026-09-26 · Complementa a [AUDITORIA_UI_UX.md](AUDITORIA_UI_UX.md). Los IDs (L-x, UI-x, T-x) apuntan a ese documento.

Aquí quedan los hallazgos que **no** se corrigieron en esta ronda, por una de dos razones:

- 🧭 **Requiere decisión:** hay más de una solución razonable, o el cambio afecta datos o reglas de negocio.
- 🏗️ **Trabajo grande:** hace falta rediseñar un componente o tocar varios módulos, y no se hizo como parche.

Al final hay un resumen de lo que **sí** se corrigió, para dar seguimiento.

---

## 1. Decisiones

Todas tomadas el 2026-09-26 y aplicadas (ver "Resuelto en la segunda ronda"), salvo lo que queda abajo.

| ID | Decisión | Qué falta |
|---|---|---|
| L-2 | **a) Borrar** las migraciones y los datos personales del bundle | Nada |
| UI-ING-2 | **a) Quitar** el histórico precargado | Nada |
| UI-DES-2 | **a) Abasto = solo "En stock"** | El umbral `stockMinimo \|\| 1` con `<=` sigue igual (no se eligió la opción b): un producto con 1 unidad cuenta como "Por agotar", así que el abasto va a bajar mucho. Si se ve mal, aplicar b (`??` y `<`) |
| UI-PRE-4 | **b) Selector %/$** | Revisar a mano el préstamo "inversion" ($1,500 → $1,510) |
| L-11 | **b) Índice `asignaciones/{cobradorUid}`** | **Desplegar `firestore.rules`** (`firebase deploy --only firestore:rules`). Luego entrar una vez a Préstamos con la cuenta admin para indexar las asignaciones que ya existían |
| — | Exportar inventario de despensa (CSV): **sí** | Nada |
| — | Documento de ingresos 2027 | L-6 ya está corregido en ingresos; se puede borrar desde la consola de Firebase (`usuarios/{uid}/ingresos/2027` e `ingresos/{uid}/años/2027`) si está vacío |
| L-6 (ahorros) | **Nueva:** en Ahorros, consultar un año también lo crea. `guardarDocumentoCompleto` usa `updateDoc`, que falla si el documento no existe, y el módulo tiene protecciones recientes contra sobrescritura | a) Crear con la primera escritura (cambiar a `setDoc` con verificación previa) · b) Dejarlo. **Recomiendo a**, pero con prueba manual en una cuenta de prueba |
| App.jsx `key` | **Nueva:** el `key={location.pathname}` solo remonta al cambiar de ruta, cosa que React ya hace al cambiar de página. El carrito del súper se pierde por estar en estado local de la página, no por la `key` | a) Mover el carrito a `useAppStore` · b) Dejarlo. **Recomiendo a** (ver L-14) |

---

## 2. Lógica y datos

- [ ] **L-4 · Restaurar respaldo seguro** (`respaldo.js:217-345`): vista previa con fecha, correo y conteo de documentos; aviso si el uid no coincide; lista blanca de rutas; `merge:true` **reemplaza** arrays (comidas, movimientos del mes) y se pierde lo registrado después del respaldo; lotes no atómicos. Ya se limpian las cachés al restaurar.
- [x] **L-6 · Consultar un año crea su documento**: corregido en ingresos. Queda ahorros (decisión arriba).
- [x] **L-7 · Ingreso guardado en el año equivocado**
- [x] **L-8 · Edición inline en ingresos**
- [ ] **L-12 · Sincronía Ingresos ↔ Movimientos**: marcar "Pagado" desde la tabla, editar el monto o volver a "Pendiente" no toca el movimiento ni el saldo de la cuenta. Hace falta un servicio único con `movimientoId` enlazado.
- [ ] **L-13 · Despensa, cálculos**:
  - [x] Filtros de producto activo inconsistentes: todos usan `activo !== false`.
  - [ ] Tres fórmulas distintas de valor de inventario → usar solo `derivarInventario`.
  - [ ] `stockTotal` suma unidades distintas (lata + sobre).
  - [x] Gastar permite dejar stock negativo y lista productos con stock 0.
  - [ ] Caché de despensa sin TTL ni revalidación.
- [ ] **L-14 · Compras del súper**: se registran una por una en un bucle (usar un lote atómico, como el import con IA). El carrito se pierde al cambiar de vista. Se permite precio 0.
- [ ] **L-15 · Préstamos, validaciones**: falta cambiar las fechas específicas en texto libre (modal Editar préstamo) por un date picker. Lo demás quedó resuelto.
- [ ] **L-16 · Errores convertidos en "vacío"**: `obtenerTodosPrestamos`, comidas e historial de métricas devuelven `[]` si fallan. Falta un estado de error con botón "Reintentar".
- [x] **L-18 · Empresas sin registros en el año**
- [x] **L-MOD-4 · Gastos recurrentes**
- [ ] **Cierre accidental**: clic en el fondo o Escape descartan formularios largos sin confirmar. Confirmar si Formik está `dirty`.
- [ ] **`mismoMovimiento`** identifica movimientos solo por timestamp. El input de año del análisis consulta en cada tecla.
- [ ] **Agregar cuenta**: no pide saldo inicial ni límite de crédito, y no valida que el día de corte sea distinto del de pago.
- [ ] **Modificar monto**: mostrar antes de guardar "Se registrará un ajuste de −$X".
- [ ] **"Salir"** cierra sesión sin confirmar y recarga toda la página.

## 3. Interfaz y móvil

- [ ] **Tablas en móvil → tarjetas**: registro de movimientos (el monto queda fuera, UI-MOV-1) y préstamos (UI-PRE-2; `CardNotaDeuda` ya tiene modo tarjeta, solo falta usarlo por debajo de ~900 px).
- [ ] **Matriz de ingresos en móvil/tablet** (UI-ING-3): sticky en las columnas "Mes" y "Total".
- [ ] **Pestañas y chips cortados** sin pista de scroll: pestañas de empresas, filtros de movimientos, áreas de despensa. Propuesta: componente `ScrollChips` con fade en los bordes.
- [ ] **Áreas táctiles < 40 px** en toda la app. Ya se corrigieron el botón cerrar de los modales y el nuevo botón "Datos". Faltan: ⋮ de empresas (19 px), campana de despensa, flechas de mes y año, casillas, botones de fila en préstamos, chips.
- [ ] **Reordenar empresas** solo funciona con drag de ratón: agregar "Mover ←/→" en el menú ⋮.
- [ ] **Home**:
  - [ ] Nombres de Pasivos cortados en 390/768.
  - [ ] Treemap vacío en "Sin saldo".
  - [ ] Nodos del treemap de 11 px.
- [ ] **/cuentas**:
  - [ ] Sin encabezado, subtotales ni botón "Agregar cuenta".
  - [ ] Anillo "0 %" en cuentas sin meta.
  - [ ] Bajo contraste en fondos claros.
- [ ] **Gestos ocultos**: Ctrl/Shift+clic y long-press para el enlace entre cuentas no tienen alternativa visible → menú "⋯" por tarjeta.
- [ ] **Movimientos → Análisis**:
  - [ ] El switch Mensual/Anual se repite 4 veces.
  - [ ] Las celdas vacías del heatmap tienen borde.
  - [ ] Montos a 8 px.
  - [ ] El cambio de categoría toma 2 pasos.
- [ ] **Despensa**:
  - [ ] La cabecera cambia de altura entre vistas.
  - [ ] Nombres truncados en Conciliar.
  - [ ] "Mes actual" contra el mes seleccionado en Comidas.
  - [ ] Fechas ISO en el historial de comidas.
  - [ ] "Frecuentes" contra "Constantes".
  - [ ] Orden de categorías distinto de `ESTRUCTURA_AREAS`.
- [ ] **Ahorros**:
  - [ ] Vista vacía con unos 350 px en blanco.
  - [ ] El año de ahorro (ago–jul) no se explica.
  - [ ] El selector de vistas no queda sticky junto con la gráfica.
- [ ] **Perfil**:
  - [ ] La tarjeta del avatar se estira en escritorio.
  - [ ] Se muestra el UID completo.
- [ ] **KPIs con etiquetas truncadas** en 390 (ingresos, movimientos, despensa).
- [ ] **Modal de empresa**:
  - [ ] Notas en un input de una línea.
  - [ ] "Eliminar" pegado a "Guardar".

## 4. Accesibilidad

- [ ] `div` con `onClick` → `button` o `role="button"` + teclado: tarjetas de Súper/Gastar, historial de comidas, toggle de analítica de ingresos, título del menú superior, X de los buscadores.
- [ ] Pestañas sin `role="tab"`/`aria-selected`; filtros sin `aria-pressed`; `th` sin `scope`.
- [ ] El drawer mueve el foco pero no lo atrapa.

## 5. Deuda técnica

- [ ] **Archivos gigantes**: `paginaMovimientosUx.jsx` (~3250 líneas), `paginaIngresosUx.jsx` (~1600), `tablaEmpresaPagos.jsx` (~1150). Separar estilos, hooks (`useMovimientosMes`, `useIngresosAnio`) y vistas.
- [x] **Código muerto**: `cardOrdenCobro.jsx` y `modalNuevoPrestamoCobranza.jsx` eliminados.
- [ ] **`App.jsx` `key={location.pathname}`**: ver la decisión arriba.
- [x] **React Router v7 future flags**
- [x] **12 errores de lint previos**: `npx eslint src` queda en 0 errores (13 avisos de hooks).
- [ ] **Casing de carpetas en disco**: los imports ya coinciden con lo que registra git (`componentes/Modales/…`). Conviene validar una vez con un build en Linux o WSL antes de desplegar.

## 6. Métricas nuevas (sección 5 de la auditoría)

- [ ] Tasa de ahorro mensual
- [ ] Utilización de crédito por tarjeta
- [ ] Pago para no generar intereses + días al próximo pago
- [ ] Fondo de emergencia (meses cubiertos)
- [ ] Patrimonio neto mensual (requiere guardar una foto mensual de los saldos)
- [ ] Flujo de caja proyectado a 30 días

---

## Resuelto en la segunda ronda (2026-09-26)

| ID | Cambio |
|---|---|
| L-2 | Se borraron `cargarHistoricosEnFirestore`, `aplicarAjusteInnciAgosto2026`, `sincronizarPrestamosIniciales`/`PRESTAMOS_INICIALES`, `debeAgruparAtun`/`agruparAtunYActualizarPrecios`/`PRODUCTOS_DESPENSA_USUARIO` y el archivo `datosHistoricosIngresos.js`. Ya no hay nada que dependa del correo |
| UI-ING-2 | El importador de ingresos ya no tiene la pestaña "Histórico precargado" |
| UI-DES-2 | "Nivel de abasto" cuenta solo los productos "En stock" |
| UI-PRE-4 | Crear nota y Editar préstamo tienen selector $/% para el interés y muestran la equivalencia en pesos. Se sigue guardando `interesEstimado` en pesos, y además `interesTipo` e `interesCapturado`. `calcularAbonoTeoricoSugerido` trataba el interés como % anual; ahora lo suma en pesos |
| L-11 | Índice `asignaciones/{cobradorUid}/prestamos/{ownerUid_prestamoId}`: se escribe en el mismo lote al asignar (individual o en bloque) y el cobrador lo lee para traer los préstamos del dueño. Cada préstamo lleva `ownerUid` en memoria y los abonos se escriben en la colección del dueño. Regla nueva en `firestore.rules` |
| Despensa | "Exportar inventario (CSV)" en el modal Datos: una fila por presentación, con BOM para Excel (`funciones/utils/csv.js`) |
| L-6 | Consultar un año de ingresos devuelve la estructura base sin escribirla; el documento se crea con la primera escritura |
| L-7 | `guardarRegistroPago` guarda en el año de la fecha (y copia la empresa si hace falta); si un registro cambia de año se quita del año anterior. El modal avisa "Guardado en AAAA" |
| L-8 | La fecha inline se guarda al salir del campo o con Enter; el monto solo se guarda si cambió, rechaza negativos, y los errores se muestran en pantalla |
| L-13 | Filtro de activos unificado (`activo !== false`) en 8 archivos. Gastar lista solo presentaciones con existencia y no deja gastar más de lo que hay |
| L-15 | Confirmación cuando el abono supera el saldo; "Crear nota" se limpia al cerrar; sin chip ni cuota fija de $500; recordatorios y tabla usan `obtenerFechaProximoPago`, así que los préstamos cada N días también generan recordatorio |
| L-18 | En el año en curso se muestran todas las empresas activas aunque no tengan pagos |
| L-MOD-4 | `abrirAgregarMovimiento({ onGuardado })`: el periodo recurrente se marca como resuelto solo cuando el movimiento se guarda; si se cancela, se vuelve a preguntar |
| Deuda | 0 errores de lint, código muerto eliminado, future flags de React Router |

## Resuelto en la primera ronda (2026-09-25)

| ID | Cambio |
|---|---|
| L-1 | Movimientos conserva la categoría original: ajustes, transferencias y pagos de tarjeta ya no cuentan como gasto (septiembre: de $129,972 a $0 de "gastos"); los modales de categoría y de edición ya no la borran al guardar |
| L-3 | Borrar una comida pide confirmación real: Cancelar / Solo eliminar / Eliminar y reponer |
| L-5 | Fechas por defecto en hora local en 14 archivos (préstamos, ingresos, compras planeadas, despensa, cobranza); `formatFechaLegible` interpreta "AAAA-MM-DD" como fecha local |
| L-9 | La nota del abono se guarda |
| L-10 | Editar u ocultar un préstamo refresca la tabla y la caché (la prop tenía otro nombre); los préstamos ocultos salen de la lista |
| L-17 | La matriz de ingresos filtra por año los cobros de préstamo y los ingresos extra |
| UI-ING-1 | "Exportar matriz resumen (CSV)" vuelve a funcionar |
| UI-ING-2 | El importador abre en "Matriz resumen mensual" y el histórico precargado pide confirmación (decisión final pendiente, arriba) |
| UI-ING-5 | "Total de pagos" muestra "—" en lugar de 100 % cuando no hay pagos |
| UI-AHO-1 | Los selectores "Más análisis", la categoría de incremento, compras planeadas y recurrentes ya muestran sus opciones (`shouldForwardProp` en `main.jsx`) |
| UI-HOME-2/3 | Activos y Pasivos usan el mismo criterio que la lista y el modal; sin doble conteo de tarjetas con saldo a favor |
| UI-CTA-1/2 | `/cuentas` con montos formateados, negativos visibles, orden por deuda real, "Inversión" con tilde, sin errores de `<svg>` en consola |
| UI-PER-1 | `/perfil` al recargar muestra "Verificando…" y luego el estado real de Google y Correo; ya no escribe el perfil en cada visita |
| UI-PRE-1/3/5/6 | Recordatorios con insignia "Vencido · N días", ordenados por fecha y respetando `diasMes`; sin scroll horizontal a 768 px; el selector de colaboradores cierra con Escape; "Sin coincidencias" en búsquedas vacías |
| UI-PRE-4 | La etiqueta del interés dice pesos; el selector de periodicidad tiene etiqueta |
| UI-DES-1 | El menú de vistas de despensa ya no se sale de la pantalla en móvil |
| UI-DES-6 | Botón "Anotar lo que comí hoy" sin "+" duplicado |
| UI-MOV-2/3 | Movimientos arranca en estado de carga (sin "0 movimientos" falso); el heatmap muestra "septiembre de 2026"; la búsqueda con el filtro "Todos" ya filtra también los movimientos internos |
| UI-LOG-1/2 | El login en móvil hace scroll y no corta el botón inferior; inputs con `aria-label` y errores con `role="alert"` |
| UI-NAV-1/2 | "Inicio" en el drawer; saludo según la hora ("Buenos días/tardes/noches") |
| UI-MOD-1/2 | "Agregar cuenta" con etiquetas en todos los campos, iconos distintos y botón "Crear cuenta"; "Modificar monto" con iconos de dinero |
| Patrón | `ModalGenerico`: foco inicial dentro del modal (sin abrir el teclado en táctil), Tab atrapado, foco devuelto al cerrar, `aria-labelledby`, botón cerrar de 40 px en móvil; `SelectForm` muestra su `label` |
| Patrón | **Un solo botón "Datos"** por módulo (Ahorros, Ingresos, Despensa, Perfil) que abre `ModalDatos` con las secciones Cargar y Descargar; se quitaron los botones duplicados de la cabecera, de la tabla por empresa y de la matriz |
| T-1 | 52 imports con mayúsculas distintas a git corregidos (riesgo de build en Linux) |
| Otros | Despensa: marcar "necesario" actualiza la caché y avisa si falla; Gastar ya no convierte 0 en 1; restaurar un respaldo limpia todas las cachés; los colores aleatorios del importador son hex válidos; props `isOpen`/`enPositivo` ya no llegan al DOM; las opciones del modal de empresa no llevan nombres reales |
