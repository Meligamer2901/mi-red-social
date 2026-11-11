// Iconos SVG en linea (sin dependencias).
const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };

export const IconoGlobal = () => (
    <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" /></svg>
);
export const IconoSiguiendo = () => (
    <svg {...base}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M17 4.5a3.5 3.5 0 0 1 0 7M18.5 14.3c2 .7 3 2.5 3 5.2" /></svg>
);
export const IconoPerfil = () => (
    <svg {...base}><circle cx="12" cy="8.5" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></svg>
);
export const IconoCorazon = ({ lleno }) => (
    <svg {...base} fill={lleno ? "currentColor" : "none"}><path d="M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5c0 6.1-8 11-8 11z" /></svg>
);
export const IconoCerrar = () => (
    <svg {...base}><path d="M5 5l14 14M19 5L5 19" /></svg>
);
export const IconoMas = () => (
    <svg {...base}><path d="M12 5v14M5 12h14" /></svg>
);
