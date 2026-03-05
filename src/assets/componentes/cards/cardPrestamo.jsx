import styled, { keyframes } from "styled-components";
import { useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box } from "@mui/material";
import {
    FaChevronDown,
    FaChevronUp,
    FaHandHoldingUsd,
    FaCheckCircle,
    FaClock,
} from "react-icons/fa";
import { ModalAgregarPagoPrestamo } from "../modales/modalAgregarPagoPrestamo";

/* ======================= ANIMACIONES ======================= */

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

/* ======================= UTILIDADES ======================= */

const calcularMontoPagado = (pagos = []) =>
    pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0);

const calcularRendimientoAnual = (prestamo) => {
    const { montoPrestado, pagos = [], fechaCreacion } = prestamo;
    const montoPagado = calcularMontoPagado(pagos);
    if (!montoPrestado || montoPrestado === 0) return 0;

    const fechaInicio = fechaCreacion?.seconds
        ? new Date(fechaCreacion.seconds * 1000)
        : new Date();
    const diasTranscurridos =
        Math.max(1, (Date.now() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));

    const rendimiento =
        ((montoPagado / montoPrestado - 1) * (365 / diasTranscurridos)) * 100;
    return isFinite(rendimiento) ? rendimiento.toFixed(1) : "0.0";
};

const formatFecha = (timestamp) => {
    if (!timestamp) return "—";
    const d = timestamp.seconds
        ? new Date(timestamp.seconds * 1000)
        : new Date(timestamp);
    return d.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const fnFormatMoney = (n) =>
    Number(n || 0).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
    });

/* ======================= ESTILOS CARD ======================= */

const CardWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  animation: ${fadeIn} 0.35s ease both;
`;

const Card = styled.div`
  background: linear-gradient(
    135deg,
    var(--colorMorado) 0%,
    var(--colorMoradoSecundario) 100%
  );
  border-radius: 18px;
  padding: 20px 22px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-shadow: 0 6px 24px rgba(83, 59, 143, 0.35);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  user-select: none;

  &::before {
    content: "";
    position: absolute;
    top: -40px;
    right: -40px;
    width: 140px;
    height: 140px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 50%;
  }

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 32px rgba(83, 59, 143, 0.45);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const NombrePrestamo = styled.h3`
  color: var(--colorBlanco);
  margin: 0;
  font-size: var(--fontMd);
  font-weight: 700;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
`;

const BadgeEstado = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.18);
  color: var(--colorBlanco);
  border-radius: 20px;
  padding: 4px 12px;
  font-size: var(--fontXs);
  font-weight: 600;
  text-transform: capitalize;
`;

const GridStats = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;

  @media (min-width: 420px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const StatBox = styled.div`
  background: rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const StatLabel = styled.span`
  font-size: var(--fontXs);
  color: rgba(238, 238, 255, 0.75);
  font-weight: 500;
`;

const StatValue = styled.span`
  font-size: var(--fontSm);
  color: var(--colorBlanco);
  font-weight: 700;
`;

const HintClick = styled.p`
  margin: 8px 0 0;
  font-size: var(--fontXs);
  color: rgba(238, 238, 255, 0.6);
  text-align: right;
`;

const BtnHistorial = styled.button`
  width: 100%;
  padding: 10px;
  background: rgba(83, 59, 143, 0.08);
  border: 1px solid var(--colorMorado);
  border-top: none;
  border-radius: 0 0 14px 14px;
  cursor: pointer;
  color: var(--colorMorado);
  font-size: var(--fontXs);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(83, 59, 143, 0.15);
  }
`;

const ContenedorTabla = styled.div`
  border: 1px solid var(--colorMorado);
  border-top: none;
  border-radius: 0 0 14px 14px;
  overflow: hidden;
  animation: ${fadeIn} 0.25s ease;
`;

/* ======================= CARD PRÉSTAMO ======================= */

export const CardPrestamo = ({ prestamo, onPagoAgregado }) => {
    const [isOpenModal, setIsOpenModal] = useState(false);
    const [showHistorial, setShowHistorial] = useState(false);

    const montoPagado = calcularMontoPagado(prestamo.pagos);
    const rendimiento = calcularRendimientoAnual(prestamo);
    const numPagos = prestamo.pagos?.length || 0;

    /* ── columnas DataGrid ── */
    const columnas = [
        {
            field: "fechaStr",
            headerName: "Fecha",
            flex: 1,
            minWidth: 110,
        },
        {
            field: "monto",
            headerName: "Monto",
            flex: 1,
            minWidth: 100,
            renderCell: (p) => fnFormatMoney(p.value),
        },
        {
            field: "imagenUrl",
            headerName: "Comprobante",
            flex: 1,
            minWidth: 110,
            renderCell: (p) =>
                p.value ? (
                    <a href={p.value} target="_blank" rel="noreferrer">
                        Ver imagen
                    </a>
                ) : (
                    <span style={{ color: "#aaa" }}>Sin imagen</span>
                ),
        },
    ];

    const filas = (prestamo.pagos || []).map((pago, i) => ({
        id: i,
        fechaStr: formatFecha(pago.fecha),
        monto: pago.monto,
        imagenUrl: pago.imagenUrl,
    }));

    const handlePagoAgregado = async (nuevoPago) => {
        await onPagoAgregado?.(prestamo.id, nuevoPago);
    };

    return (
        <CardWrapper>
            {/* ── Tarjeta principal ── */}
            <Card onClick={() => setIsOpenModal(true)}>
                <CardHeader>
                    <NombrePrestamo>{prestamo.nombre}</NombrePrestamo>
                    <BadgeEstado>
                        {prestamo.estado === "pendiente" ? <FaClock /> : <FaCheckCircle />}
                        {prestamo.estado}
                    </BadgeEstado>
                </CardHeader>

                <GridStats>
                    <StatBox>
                        <StatLabel>Prestado</StatLabel>
                        <StatValue>{fnFormatMoney(prestamo.montoPrestado)}</StatValue>
                    </StatBox>
                    <StatBox>
                        <StatLabel>Pagado</StatLabel>
                        <StatValue>{fnFormatMoney(montoPagado)}</StatValue>
                    </StatBox>
                    <StatBox>
                        <StatLabel># Pagos</StatLabel>
                        <StatValue>{numPagos}</StatValue>
                    </StatBox>
                    <StatBox>
                        <StatLabel>Rdto. anual</StatLabel>
                        <StatValue>
                            {rendimiento}%
                        </StatValue>
                    </StatBox>
                </GridStats>

                <HintClick>Toca para registrar un pago →</HintClick>
            </Card>

            {/* ── Botón historial ── */}
            <BtnHistorial
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setShowHistorial((v) => !v);
                }}
            >
                {showHistorial ? <FaChevronUp /> : <FaChevronDown />}
                {showHistorial ? "Ocultar historial" : "Ver historial de pagos"}
            </BtnHistorial>

            {/* ── Tabla historial ── */}
            {showHistorial && (
                <ContenedorTabla>
                    <Box sx={{ width: "100%", background: "white" }}>
                        <DataGrid
                            rows={filas}
                            columns={columnas}
                            hideFooter={filas.length <= 5}
                            pageSizeOptions={[5, 10]}
                            initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                            autoHeight
                            disableRowSelectionOnClick
                            sx={{
                                border: "none",
                                "& .MuiDataGrid-columnHeader": {
                                    backgroundColor: "rgba(83,59,143,0.1)",
                                    color: "var(--colorMorado)",
                                    fontWeight: 700,
                                },
                            }}
                        />
                    </Box>
                </ContenedorTabla>
            )}

            {/* ── Modal agregar pago ── */}
            <ModalAgregarPagoPrestamo
                isOpen={isOpenModal}
                onClose={() => setIsOpenModal(false)}
                prestamo={prestamo}
                onPagoAgregado={handlePagoAgregado}
            />
        </CardWrapper>
    );
};
