import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth, idDe } from "../auth";
import { usePublicaciones, propietarioDe, esPropia, transformacionesDe } from "../posts";
import Avatar from "../components/Avatar";
import Galeria from "../components/Galeria";
import Lightbox from "../components/Lightbox";
import CrearPublicacion from "../components/CrearPublicacion";
import EditarPublicacion from "../components/EditarPublicacion";
import { IconoMas } from "../components/Icons";

// Perfil propio (/perfil) o de otra persona (/perfil/:id).
export default function Perfil() {
    const { id } = useParams();
    const { user: yo } = useAuth();
    const navigate = useNavigate();
    const miId = idDe(yo);
    const esMio = !id || String(id) === miId;
    const objetivoId = esMio ? miId : String(id);

    const [otro, setOtro] = useState(null);
    const [cargandoOtro, setCargandoOtro] = useState(!esMio);
    const [abierta, setAbierta] = useState(null);
    const [avatarAbierto, setAvatarAbierto] = useState(false);
    const [creando, setCreando] = useState(false);
    const [editando, setEditando] = useState(null);

    useEffect(() => {
        if (esMio) return setOtro(null);
        setCargandoOtro(true);
        api(`/profile/user/${id}`).then(({ data }) => {
            setOtro(data.status === "success" ? data.user : null);
            setCargandoOtro(false);
        });
    }, [id, esMio]);

    const filtro = useMemo(() => (p) => propietarioDe(p) === objetivoId, [objetivoId]);
    const { posts, error, recargar } = usePublicaciones("/listar/publicacion", filtro);

    const perfil = esMio ? yo : otro;
    const nombre = perfil ? `${perfil.name || ""} ${perfil.surname || ""}`.trim() || perfil.nick : "";

    const eliminar = async (post) => {
        if (!window.confirm("¿Eliminar esta publicación? No se puede deshacer.")) return;
        const { data } = await api(`/borrar/publicacion/${post._id}`, { method: "DELETE" });
        if (String(data.status).toLowerCase() === "success") recargar();
    };

    if (cargandoOtro) return <p className="estado" role="status">Cargando perfil…</p>;
    if (!perfil) {
        return (
            <p className="estado">
                No encontramos este perfil. <button type="button" className="enlace" onClick={() => navigate("/")}>Volver al feed</button>
            </p>
        );
    }

    return (
        <>
            <section className="perfil-cabecera">
                <button
                    type="button"
                    className="perfil-avatar"
                    onClick={() => perfil.imageUrl && setAvatarAbierto(true)}
                    aria-label="Ver foto de perfil"
                    disabled={!perfil.imageUrl}
                >
                    <Avatar user={perfil} size={128} />
                </button>
                <div>
                    <h1>{nombre}</h1>
                    <p className="usuario-nick">@{perfil.nick}</p>
                    {esMio && (
                        <div className="perfil-acciones">
                            <button type="button" className="btn btn-primario" onClick={() => setCreando(true)}>
                                <IconoMas /> Nueva publicación
                            </button>
                            <Link to="/perfil/editar" className="btn btn-secundario">Editar perfil</Link>
                        </div>
                    )}
                </div>
            </section>

            <h2 className="subtitulo">Fotos</h2>
            <Galeria
                posts={posts}
                error={error}
                vacio={esMio ? "Aún no has publicado nada. Usa «Nueva publicación» para subir tu primera foto." : "Este usuario aún no ha publicado fotos."}
                onAbrir={setAbierta}
                accionesDe={
                    esMio
                        ? (post) => (
                              <span className="copia-gestion">
                                  <button type="button" className="btn btn-texto" onClick={() => setEditando(post)}>Editar</button>
                                  <button type="button" className="btn btn-texto btn-peligro" onClick={() => eliminar(post)}>Eliminar</button>
                              </span>
                          )
                        : null
                }
            />

            {abierta && (
                <Lightbox
                    src={abierta.imageUrl}
                    transformaciones={transformacionesDe(abierta)}
                    tipo="publicacion"
                    idTarget={abierta._id}
                    esPropia={esPropia(yo, abierta)}
                    titulo={abierta.contenido || `Foto de @${abierta.usuarioNick}`}
                    onClose={() => setAbierta(null)}
                    onGuardado={recargar}
                />
            )}
            {avatarAbierto && (
                <Lightbox
                    src={perfil.imageUrl}
                    tipo="perfil"
                    idTarget={objetivoId}
                    esPropia={esMio}
                    titulo={`Foto de perfil de @${perfil.nick}`}
                    onClose={() => setAvatarAbierto(false)}
                />
            )}
            {creando && <CrearPublicacion onClose={() => setCreando(false)} onCreada={recargar} />}
            {editando && <EditarPublicacion post={editando} onClose={() => setEditando(null)} onGuardada={recargar} />}
        </>
    );
}
