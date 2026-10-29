import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { FaArrowLeft, FaChartArea } from "react-icons/fa";
import { useAppStore } from "../../stores/useAppStore";
import { obtenerTodosLosAniosAhorro } from "../../funciones/firebase/ahorros";
import { resumirAnios } from "../../funciones/ahorrosAnualCalculos";
import { H2 } from "../../componentes/genericos/titulos";
import {
    coloresPorAnio,
    GraficaAvanceAcumulado,
    GraficaCategoriasPorAnio,
    GraficaIncrementoAnual,
    GraficaRendimientoAnual,
    GraficaTrayectoria,
    MapaCalorMensual,
    ResumenKpis,
    TablaResumenAnual,
} from "../../componentes/ahorros/anual/graficasAnuales";
import { FiltroAnios, useAniosExcluidos } from "../../componentes/ahorros/anual/filtroAnios";
import { Topo } from "../../componentes/topo/Topo";
import { TopoCargando } from "../../componentes/topo/TopoCargando";

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Pagina = styled.div`
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
  min-height: 80dvh;
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: ${fadeUp} 0.4s ease;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  > svg {
    font-size: 22px;
    color: var(--colorMorado);
  }
`;

const BtnVolver = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(83, 59, 143, 0.22);
  border-radius: 9px;
  background: white;
  color: var(--colorMorado);
  cursor: pointer;

  &:hover {
    background: rgba(83, 59, 143, 0.06);
  }

  &:focus-visible {
    outline: 2px solid var(--colorMorado);
    outline-offset: 2px;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

/* Un solo filtro de años arriba de todas las gráficas. */
const BarraFiltro = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;

  > span {
    font-size: 12px;
    font-weight: 700;
    color: #6b6484;
  }
`;

const Mensaje = styled.div`
  display: grid;
  place-items: center;
  min-height: 200px;
  font-size: 14px;
  color: var(--colorMorado);
  text-align: center;
`;

export const PaginaAhorrosAnual = () => {
    const navigate = useNavigate();
    const usuario = useAppStore((s) => s.usuario);
    const ahorrosPorAnio = useAppStore((s) => s.ahorrosPorAnio);
    const [documentos, setDocumentos] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!usuario?.uid) return undefined;
        let vigente = true;
        obtenerTodosLosAniosAhorro(usuario.uid)
            .then((docs) => vigente && setDocumentos(docs))
            .catch((e) => {
                console.error("Error al cargar los años de ahorro:", e);
                if (vigente) setError(true);
            });
        return () => { vigente = false; };
    }, [usuario?.uid]);

    // Lo que está en memoria puede ser más reciente que Firestore (el guardado
    // de /ahorros va con debounce), así que tiene prioridad.
    const resumenes = useMemo(() => {
        if (!documentos) return [];
        const fusionados = documentos.map((d) =>
            ahorrosPorAnio[`${usuario?.uid}_${d.year}`] ?? d
        );
        return resumirAnios(fusionados);
    }, [documentos, ahorrosPorAnio, usuario?.uid]);

    const colores = useMemo(() => coloresPorAnio(resumenes.map((r) => r.anio)), [resumenes]);
    const [excluidos, alternarAnio] = useAniosExcluidos("global");
    const incluidos = useMemo(() => resumenes.filter((r) => !excluidos.has(r.anio)), [resumenes, excluidos]);

    let contenido;
    if (error) contenido = <Mensaje><Topo estado="preocupado" tamano={110} style={{ display: "block", margin: "0 auto 10px" }} />No se pudieron cargar tus años de ahorro.</Mensaje>;
    else if (!documentos) contenido = <Mensaje><TopoCargando tamano={110} style={{ display: "block", margin: "0 auto 10px" }} />Cargando datos anuales...</Mensaje>;
    else if (!resumenes.length) contenido = <Mensaje><Topo estado="durmiendo" tamano={110} style={{ display: "block", margin: "0 auto 10px" }} />Aún no hay historial suficiente para comparar años.</Mensaje>;
    else {
        contenido = (
            <Grid data-tour="anual-graficas">
                <BarraFiltro>
                    <span>Años incluidos</span>
                    <FiltroAnios
                        anios={resumenes.map((r) => r.anio)}
                        excluidos={excluidos}
                        onAlternar={alternarAnio}
                        colores={colores}
                    />
                </BarraFiltro>
                {incluidos.length === 0 ? (
                    <Mensaje style={{ gridColumn: "1 / -1" }}>Incluye al menos un año para ver las gráficas.</Mensaje>
                ) : (
                    <>
                        <ResumenKpis resumenes={incluidos} />
                        <GraficaAvanceAcumulado resumenes={incluidos} colores={colores} />
                        <GraficaIncrementoAnual resumenes={incluidos} />
                        <GraficaRendimientoAnual resumenes={incluidos} />
                        <GraficaCategoriasPorAnio resumenes={incluidos} />
                        <MapaCalorMensual resumenes={incluidos} />
                        <GraficaTrayectoria todos={resumenes} excluidos={excluidos} />
                        <TablaResumenAnual resumenes={incluidos} />
                    </>
                )}
            </Grid>
        );
    }

    return (
        <Pagina>
            <Header>
                <BtnVolver data-tour="anual-volver" type="button" onClick={() => navigate("/ahorros")} aria-label="Volver a Mis Ahorros" title="Volver a Mis Ahorros">
                    <FaArrowLeft />
                </BtnVolver>
                <FaChartArea aria-hidden="true" />
                <H2 size="22px" color="var(--colorMorado)">Ahorros · Vista anual</H2>
            </Header>
            {contenido}
        </Pagina>
    );
};
