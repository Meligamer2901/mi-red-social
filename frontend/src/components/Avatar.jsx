// Avatar circular. Si no hay imagen (o falla), muestra la inicial del nick.
import { useState } from "react";

const COLORES = ["#ff4f8b", "#ffd23f", "#2ee6a6", "#4cc9f0", "#ff8a3d", "#b794ff"];
const colorDe = (texto) => COLORES[[...texto].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORES.length];

export default function Avatar({ user, size = 40, className = "" }) {
    const [roto, setRoto] = useState(false);
    const nombre = user?.nick || user?.name || user?.usuarioNick || "?";
    const style = { width: size, height: size, fontSize: size * 0.45 };

    if (user?.imageUrl && !roto) {
        return (
            <img
                className={`avatar ${className}`}
                style={style}
                src={user.imageUrl}
                alt={`Foto de ${nombre}`}
                onError={() => setRoto(true)}
            />
        );
    }
    return (
        <span className={`avatar avatar-inicial ${className}`} style={{ ...style, background: colorDe(nombre) }} aria-hidden="true">
            {nombre.charAt(0).toUpperCase()}
        </span>
    );
}
