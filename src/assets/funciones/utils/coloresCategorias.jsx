import React from "react";
import styled from "styled-components";
import {
  FaUtensils,
  FaShoppingCart,
  FaHome,
  FaBolt,
  FaCar,
  FaGamepad,
  FaHeartbeat,
  FaUser,
  FaGraduationCap,
  FaPiggyBank,
  FaCreditCard,
  FaExchangeAlt,
  FaReceipt,
  FaSlidersH,
  FaTag,
} from "react-icons/fa";

export const CONFIG_CATEGORIAS = {
  comida: {
    label: "Comida",
    color: "#d97706",
    bg: "#fef3c7",
    border: "#fde68a",
    icon: FaUtensils,
  },
  despensa: {
    label: "Despensa",
    color: "#059669",
    bg: "#d1fae5",
    border: "#a7f3d0",
    icon: FaShoppingCart,
  },
  hogar: {
    label: "Hogar",
    color: "#0284c7",
    bg: "#e0f2fe",
    border: "#bae6fd",
    icon: FaHome,
  },
  servicios: {
    label: "Servicios",
    color: "#0891b2",
    bg: "#cffafe",
    border: "#a5f3fc",
    icon: FaBolt,
  },
  transporte: {
    label: "Transporte",
    color: "#7c3aed",
    bg: "#ede9fe",
    border: "#ddd6fe",
    icon: FaCar,
  },
  entretenimiento: {
    label: "Entretenimiento",
    color: "#db2777",
    bg: "#fce7f3",
    border: "#fbcfe8",
    icon: FaGamepad,
  },
  salud: {
    label: "Salud",
    color: "#dc2626",
    bg: "#fee2e2",
    border: "#fecaca",
    icon: FaHeartbeat,
  },
  educacion: {
    label: "Educación",
    color: "#2563eb",
    bg: "#dbeafe",
    border: "#bfdbfe",
    icon: FaGraduationCap,
  },
  personal: {
    label: "Personal",
    color: "#9333ea",
    bg: "#f3e8ff",
    border: "#e9d5ff",
    icon: FaUser,
  },
  gastosFijos: {
    label: "Gastos Fijos",
    color: "#4f46e5",
    bg: "#e0e7ff",
    border: "#c7d2fe",
    icon: FaReceipt,
  },
  ahorro: {
    label: "Ahorro",
    color: "#0d9488",
    bg: "#ccfbf1",
    border: "#99f6e4",
    icon: FaPiggyBank,
  },
  deudas: {
    label: "Deudas",
    color: "#be123c",
    bg: "#ffe4e6",
    border: "#fecdd3",
    icon: FaCreditCard,
  },
  pagoTarjeta: {
    label: "Pago de tarjeta",
    color: "#c2410c",
    bg: "#ffedd5",
    border: "#fed7aa",
    icon: FaCreditCard,
  },
  transferencia: {
    label: "Transferencia",
    color: "#1d4ed8",
    bg: "#eff6ff",
    border: "#dbeafe",
    icon: FaExchangeAlt,
  },
  ajusteDeSaldo: {
    label: "Ajuste de saldo",
    color: "#475569",
    bg: "#f1f5f9",
    border: "#e2e8f0",
    icon: FaSlidersH,
  },
  ajusteDeSaldoMSI: {
    label: "Ajuste saldo MSI",
    color: "#475569",
    bg: "#f1f5f9",
    border: "#e2e8f0",
    icon: FaSlidersH,
  },
};

const DEFAULT_CATEGORIA = {
  label: "Sin categoría",
  color: "#7c3aed",
  bg: "#f5f3ff",
  border: "#ede9fe",
  icon: FaTag,
};

export const obtenerEstiloCategoria = (categoriaKey) => {
  if (!categoriaKey) return DEFAULT_CATEGORIA;
  return CONFIG_CATEGORIAS[categoriaKey] || DEFAULT_CATEGORIA;
};

// Paleta de colores temáticos para bancos e instituciones
export const PALETA_INSTITUCIONES = [
  { bg: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)", color: "#fff", accent: "#ef4444" }, // Rojo (Santander, Banorte)
  { bg: "linear-gradient(135deg, #1e40af 0%, #172554 100%)", color: "#fff", accent: "#2563eb" }, // Azul marino (BBVA)
  { bg: "linear-gradient(135deg, #9333ea 0%, #581c87 100%)", color: "#fff", accent: "#9333ea" }, // Morado (Nu)
  { bg: "linear-gradient(135deg, #059669 0%, #064e3b 100%)", color: "#fff", accent: "#059669" }, // Verde (Efectivo/Plata)
  { bg: "linear-gradient(135deg, #0284c7 0%, #075985 100%)", color: "#fff", accent: "#0284c7" }, // Celeste (Mercado Pago, Ualá)
  { bg: "linear-gradient(135deg, #ea580c 0%, #9a3412 100%)", color: "#fff", accent: "#ea580c" }, // Naranja (Didi, Falabella)
  { bg: "linear-gradient(135deg, #4f46e5 0%, #312e81 100%)", color: "#fff", accent: "#4f46e5" }, // Índigo
  { bg: "linear-gradient(135deg, #db2777 0%, #831843 100%)", color: "#fff", accent: "#db2777" }, // Rosa
  { bg: "linear-gradient(135deg, #0d9488 0%, #134e4a 100%)", color: "#fff", accent: "#0d9488" }, // Teal
];

export const obtenerEstiloInstitucion = (nombre = "") => {
  const n = String(nombre).toLowerCase().trim();
  if (n.includes("santander") || n.includes("banorte") || n.includes("hsbc")) return PALETA_INSTITUCIONES[0];
  if (n.includes("bbva") || n.includes("bancomer") || n.includes("citibanamex") || n.includes("banamex")) return PALETA_INSTITUCIONES[1];
  if (n.includes("nu") || n.includes("nubank")) return PALETA_INSTITUCIONES[2];
  if (n.includes("efectivo") || n.includes("plata") || n.includes("caja")) return PALETA_INSTITUCIONES[3];
  if (n.includes("mercado") || n.includes("uala") || n.includes("ualá")) return PALETA_INSTITUCIONES[4];
  if (n.includes("didi") || n.includes("falabella") || n.includes("stori")) return PALETA_INSTITUCIONES[5];

  // Hash determinista para instituciones personalizadas
  let hash = 0;
  for (let i = 0; i < n.length; i++) {
    hash = (hash * 31 + n.charCodeAt(i)) >>> 0;
  }
  return PALETA_INSTITUCIONES[hash % PALETA_INSTITUCIONES.length];
};

const BadgeContainer = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: ${({ $size }) => ($size === "sm" ? "1px 5px" : $size === "lg" ? "6px 12px" : "3px 8px")};
  border-radius: ${({ $shape }) => ($shape === "rectangular" ? "6px" : "999px")};
  background-color: ${({ $bg }) => $bg};
  border: 1px solid ${({ $border }) => $border};
  color: ${({ $color }) => $color};
  font-size: ${({ $size }) => ($size === "sm" ? "9px" : $size === "lg" ? "13px" : "11px")};
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  transition: all 0.15s ease;

  svg {
    font-size: ${({ $size }) => ($size === "sm" ? "9px" : $size === "lg" ? "12px" : "11px")};
    flex-shrink: 0;
  }
`;

export const BadgeCategoria = ({
  categoria,
  size = "md",
  customLabel,
  className,
  shape = "pill",
}) => {
  const estilo = obtenerEstiloCategoria(categoria);
  const Icono = estilo.icon;
  const texto = customLabel || estilo.label;

  return (
    <BadgeContainer
      $color={estilo.color}
      $bg={estilo.bg}
      $border={estilo.border}
      $size={size}
      $shape={shape}
      className={className}
    >
      <Icono aria-hidden="true" />
      <span>{texto}</span>
    </BadgeContainer>
  );
};
