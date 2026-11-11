import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { leerLikes, guardarLikes } from "../posts";
import { IconoCorazon } from "./Icons";

// Una "copia" del feed: miniatura con marco blanco, autor, texto y me gusta.
export default function PostCard({ post, onAbrir, onVerUsuario, acciones }) {
    const { user } = useAuth();
    const [likes, setLikes] = useState(post.likes || 0);
    const [meGusta, setMeGusta] = useState(() => leerLikes(user).has(String(post._id)));
    const [ocupado, setOcupado] = useState(false);

    const alternarLike = async () => {
        if (ocupado) return;
        setOcupado(true);
        const { data } = await api("/likes/publicacion", {
            method: "PUT",
            body: { id: post._id, decrement: meGusta }
        });
        if (data.status === "success") {
            setLikes(data.publicacion.likes);
            const set = leerLikes(user);
            if (meGusta) set.delete(String(post._id));
            else set.add(String(post._id));
            guardarLikes(user, set);
            setMeGusta(!meGusta);
        }
        setOcupado(false);
    };

    return (
        <article className="copia">
            {post.thumbnailUrl && (
                <button type="button" className="copia-foto" onClick={() => onAbrir(post)} aria-label="Ver foto completa y transformaciones">
                    <img src={post.thumbnailUrl} alt={post.contenido || `Foto de ${post.usuarioNick}`} loading="lazy" />
                </button>
            )}
            <div className="copia-pie">
                {onVerUsuario && (
                    <button type="button" className="copia-autor" onClick={() => onVerUsuario(post.usuarioNick)}>
                        @{post.usuarioNick}
                    </button>
                )}
                {post.contenido && <p className="copia-texto">{post.contenido}</p>}
                <div className="copia-acciones">
                    <button
                        type="button"
                        className={`btn-like ${meGusta ? "activo" : ""}`}
                        onClick={alternarLike}
                        aria-pressed={meGusta}
                        aria-label={meGusta ? "Quitar me gusta" : "Dar me gusta"}
                    >
                        <IconoCorazon lleno={meGusta} />
                        <span>{likes}</span>
                    </button>
                    {acciones}
                </div>
            </div>
        </article>
    );
}
