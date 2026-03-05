# 💸 Zaldo — App de Finanzas Personales

**Zaldo** es una Progressive Web App (PWA) para la gestión de finanzas personales. Permite registrar cuentas bancarias, movimientos de dinero, préstamos y visualizar el estado financiero general desde cualquier dispositivo.

---

## 🚀 Tech Stack

| Tecnología | Uso |
|---|---|
| **React 18** | Framework de UI |
| **Vite** | Bundler y dev server |
| **Firebase Firestore** | Base de datos en tiempo real |
| **Firebase Auth** | Autenticación de usuarios |
| **Styled-Components** | Estilos en componentes |
| **MUI (Material UI)** | Componentes de tabla (DataGrid) |
| **Formik** | Manejo de formularios |
| **Framer Motion** | Animaciones de página |
| **React Icons** | Iconografía |
| **SweetAlert2** | Alertas y confirmaciones |
| **vite-plugin-pwa** | Soporte PWA (Service Worker + Manifest) |

---

## 📁 Estructura del Proyecto

```
src/
├── App.jsx                  # Enrutador principal con AnimatePresence
├── routes.jsx               # Definición de rutas con y sin menú
├── main.jsx                 # Entry point con providers
├── assets/
│   ├── componentes/
│   │   ├── cards/           # Cards de cuentas y préstamos
│   │   ├── genericos/       # Layouts, inputs, formularios, títulos
│   │   ├── menuTop/         # Barra de navegación superior
│   │   └── modales/         # Todos los modales de la app
│   ├── contextos/
│   │   ├── general.jsx      # Estado global: usuario, cuentas, instituciones
│   │   └── modales.jsx      # Estado de apertura de modales
│   ├── funciones/
│   │   ├── firebase/        # Funciones de lectura/escritura en Firestore
│   │   └── utils/           # Utilidades: fechas, números, esqueletos
│   └── paginas/
│       ├── home/            # Dashboard principal
│       ├── cuentas/         # Resumen de cuentas
│       ├── movimientos/     # Historial de movimientos por mes
│       ├── prestamos/       # Registro y seguimiento de préstamos
│       └── login/           # Pantalla de inicio de sesión / registro
```

---

## 🗃️ Modelo de Datos en Firestore

```
usuarios/{uid}
  ├── (doc raíz)             → nombres, apellidos, imgPerfil
  ├── cuentas/{cuentaId}     → nombre, tipoDeCuenta, saldoALaFecha, activo, ...
  ├── instituciones/{id}     → nombre
  └── movimientos/{YYYYMM}   → { movimientos: [...] }  ← array por mes

prestamos/{uid}
  └── prestamos/{prestamoId} → nombre, montoPrestado, interesEstimado, pagos: [...]
```

> **Nota:** Los préstamos usan una colección raíz diferente (`prestamos/`) mientras que el resto de datos van bajo `usuarios/`. Esto es intencional pero puede revisarse para unificar las reglas de seguridad.

---

## ✨ Funcionalidades

### 🏠 Home / Dashboard
- Resumen financiero total (suma de todas las cuentas)
- Listado de cuentas con acceso rápido a opciones

### 💳 Cuentas
Soporta 4 tipos de cuentas:

| Tipo | Campos especiales |
|---|---|
| **Débito** | `tipoDeDebito` (líquido / ahorro), `metaDeAhorro` |
| **Crédito** | `fechaDeCorte`, `limiteDeCredito`, `saldoALaFechaMSI` |
| **Efectivo** | `tipoDeEfectivo`, `metaDeAhorro` |
| **Inversión** | `saldoInicialInversion`, `saldoFinalInversion`, `fechaInicioInversion`, `fechaFinalInversion` |

### 💸 Movimientos
- Registro de ingresos y gastos por cuenta
- Soporte para pagos a crédito (revolvente y MSI)
- Navegación por mes/año
- Edición de movimientos registrados
- Transferencias entre cuentas con lógica de prioridad de pago (normal → MSI → excedente)

### 🤝 Préstamos
- Registro de préstamos otorgados a terceros
- Cálculo de rendimiento anual
- Historial de pagos con comprobante (imagen) — subida a Firebase Storage pendiente
- Tabla expandible con MUI DataGrid

### 🏦 Instituciones
- Alta de bancos / instituciones financieras
- Asociación con cuentas

---

## ⚙️ Instalación y Desarrollo

### Requisitos
- Node.js ≥ 18
- Proyecto de Firebase con Firestore y Authentication habilitados

### Variables de entorno
Crea un archivo `.env` en la raíz con las siguientes variables (ver `.env.development` como referencia):

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Comandos

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview

# Deploy a GitHub Pages (rama build)
npm run deploy

# Lint
npm run lint
```

---

## 🌐 Deploy

El proyecto se despliega en **GitHub Pages** usando la rama `build`.

```bash
npm run deploy
```

Este comando ejecuta `vite build` y luego `gh-pages -d dist -b build`.

---

## 📐 Convenciones del Proyecto

- **Páginas**: cada sección tiene un `index.jsx` que exporta el componente de ruta, y un `*Ux.jsx` que contiene el layout visual.
- **Modales**: todos los modales están registrados de forma global en `LayoutConMenu` y se controlan mediante booleanos en `ContextoModales`.
- **Funciones Firebase**: organizadas por entidad (`cuentas.js`, `movimientos.js`, `prestamos.js`, `instituciones.js`, `usuario.js`).
- **Estilos**: `styled-components` para componentes propios, CSS variables globales en `index.css` para el design system (`--colorMorado`, `--fontMd`, etc.).

---

## 🗺️ Roadmap

- [ ] Subir comprobantes de pago a **Firebase Storage**
- [ ] Implementar **Presupuestos** con límite por categoría
- [ ] Visualizar **progreso de metas de ahorro**
- [ ] Añadir **gráficas históricas** de tendencias a largo plazo
- [ ] **Notificaciones PWA** para fechas de corte de tarjetas
- [ ] Migrar contextos restantes a **Zustand**
- [ ] Soporte para **modo oscuro**

---

## 📄 Licencia

Proyecto privado — todos los derechos reservados.
