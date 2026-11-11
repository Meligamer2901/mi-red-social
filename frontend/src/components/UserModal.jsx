import { useEffect, useState, useCallback } from "react";
import { api } from "../api";
import { useAuth, idDe } from "../auth";
import { propietarioDe } from "../posts";
import Modal from "./Modal";
import Avatar from "./Avatar";

// Perfil rapido de otro usuario (desde el feed): datos, boton seguir y sus fotos.
export default function UserModal({ nick, onClose, onCambioSeguimiento }) {
    const { user: yo } = useAuth();
    const [perfil, setPerfil] = useState(null);
    const [noEncontrado, setNoEncontrado] = useState(false);
    const [siguiendo, setSiguiendo] = useState(false);
    const [posts, setPosts] = useState(null);
    const [ocupado, setOcupado] = useState(false);

    useEffect(() => {
        let vivo = true;
        (async () => {
            const { ok, data } = await api(`/follow/usuario-nick/${encodeURIComponent(nick)}`);
            if (!vivo) return;
            const todos = await api("/listar/publicacion");
            const lista = todos.data.status === "success" ? todos.data.consulta || [] : [];
            if (!vivo) return;

            if (!ok || data.status !== "success" || !data.user) {
                setNoEncontrado(true);
                setPosts(lista.filter((p) => p.usuarioNick === nick));
                return;
            }
            const u = data.user;
            const uid = String(u._id || u.id);
            setPerfil(u);
            setPosts(lista.filter((p) => propietarioDe(p) === uid));
            if (uid !== idDe(yo)) {
                const c = await api(`/follow/comprobar/${uid}`);
                if (vivo) setSiguiendo(c.data.status === "success" && !!c.data.siguiendo);
            }
        })();
        return () => {
            vivo = false;
        };
    }, [nick, yo]);

    const uid = perfil ? String(perfil._id || perfil.id) : "";
    const esYo = perfil && uid === idDe(yo);

    const alternar = useCallback(async () => {
        setOcupado(true);
        const { data } = await api(siguiendo ? `/follow/dejar/${uid}` : `/follow/seguir/${uid}`, {
            method: siguiendo ? "DELETE" : "POST"
        });
        if (data.status === "success") {
            setSiguiendo(!siguiendo);
            onCambioSeguimiento?.();
        }
        setOcupado(false);
    }, [siguiendo, uid, onCambioSeguimiento]);

    const nombre = perfil ? `${perfil.name || ""} ${perfil.surname || ""}`.trim() || perfil.nick : nick;

    return (
        <Modal titulo={`Perfil de @${nick}`} onClose={onClose} ancho={560}>
            <div className="usuario-cabecera">
                <Avatar user={perfil || { nick }} size={88} />
                <div>
                    <p className="usuario-nombre">{nombre}</p>
                    <p className="usuario-nick">@{perfil?.nick || nick}</p>
                    {perfil && !esYo && (
                        <button
                            type="button"
                            className={`btn ${siguiendo ? "btn-secundario" : "btn-primario"}`}
                            onClick={alternar}
                            disabled={ocupado}
                        >
                            {siguiendo ? "Dejar de seguir" : "Seguir"}
                        </button>
                    )}
                    {noEncontrado && <p className="mesa-nota">No encontramos el perfil completo de este usuario.</p>}
                </div>
            </div>

            <h3 className="subtitulo">Fotos</h3>
            {posts === null && <p className="estado" role="status">Cargando…</p>}
            {posts && posts.length === 0 && <p className="estado">Este usuario aún no ha publicado fotos.</p>}
            {posts && posts.length > 0 && (
                <div className="mini-galeria">
                    {posts.map((p) =>
                        p.thumbnailUrl ? (
                            <figure key={p._id}>
                                <img src={p.thumbnailUrl} alt={p.contenido || ""} loading="lazy" />
                                {p.contenido && <figcaption>{p.contenido}</figcaption>}
                            </figure>
                        ) : null
                    )}
                </div>
            )}
        </Modal>
    );
}
