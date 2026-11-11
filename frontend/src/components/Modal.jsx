import { useEffect, useRef } from "react";
import { IconoCerrar } from "./Icons";

// Contenedor de dialogo accesible: cierra con Escape o clic fuera, y devuelve el foco.
export default function Modal({ titulo, onClose, children, ancho = 480 }) {
    const cerrarRef = useRef(null);

    useEffect(() => {
        const previo = document.activeElement;
        cerrarRef.current?.focus();
        const alTeclear = (e) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", alTeclear);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", alTeclear);
            document.body.style.overflow = "";
            previo?.focus?.();
        };
    }, [onClose]);

    return (
        <div className="velo" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <div className="dialogo" role="dialog" aria-modal="true" aria-label={titulo} style={{ maxWidth: ancho }}>
                <div className="dialogo-cabecera">
                    <h2>{titulo}</h2>
                    <button ref={cerrarRef} type="button" className="btn-icono" onClick={onClose} aria-label="Cerrar">
                        <IconoCerrar />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
