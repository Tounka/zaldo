import GradientBlinds from "./GradientBlinds";

/*
 * Fondo animado de la marca: el mismo del login. Se reutiliza en los banners
 * de los modales para que ambos se vean iguales. Si no hay WebGL2 el canvas
 * queda vacío y se ve el fondo del contenedor, así que cada uso debe tener su
 * propio degradado de respaldo.
 */
export const COLORES_FONDO_ZALDO = ["#1b1352", "#3a27a8", "#6c45e3", "#b56ef0", "#e3a8ff", "#c38aff"];

export const FondoZaldo = ({ colores = COLORES_FONDO_ZALDO, dpr = 1.5, className, style }) => (
    <GradientBlinds
        className={className}
        style={style}
        gradientColors={colores}
        angle={44}
        noise={0.5}
        blindCount={16}
        blindMinWidth={60}
        spotlightRadius={0.5}
        spotlightSoftness={1}
        spotlightOpacity={1}
        shadow={0.85}
        shine={0.45}
        relief={0.3}
        glow={0.45}
        distortAmount={12}
        followPointer={false}
        mouseDampening={0.6}
        driftSpeed={1.1}
        driftRange={1.6}
        sway={0.35}
        speed={0.8}
        idle="drift"
        mixBlendMode="normal"
        dpr={dpr}
    />
);
