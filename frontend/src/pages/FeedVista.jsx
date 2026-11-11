import { useState } from "react";
import { useAuth } from "../auth";
import { usePublicaciones, esPropia, transformacionesDe } from "../posts";
import Galeria from "../components/Galeria";
import Lightbox from "../components/Lightbox";
import UserModal from "../components/UserModal";

// Vista de feed reutilizada por "Global" y "Siguiendo".
export default function FeedVista({ ruta, titulo, subtitulo, vacio }) {
    const { user } = useAuth();
    const { posts, error, recargar } = usePublicaciones(ruta);
    const [abierta, setAbierta] = useState(null);
    const [nickAbierto, setNickAbierto] = useState(null);

    return (
        <>
            <header className="encabezado">
                <h1>{titulo}</h1>
                <p>{subtitulo}</p>
            </header>

            <Galeria posts={posts} error={error} vacio={vacio} onAbrir={setAbierta} onVerUsuario={setNickAbierto} />

            {abierta && (
                <Lightbox
                    src={abierta.imageUrl}
                    transformaciones={transformacionesDe(abierta)}
                    tipo="publicacion"
                    idTarget={abierta._id}
                    esPropia={esPropia(user, abierta)}
                    titulo={`@${abierta.usuarioNick}${abierta.contenido ? ` · ${abierta.contenido}` : ""}`}
                    onClose={() => setAbierta(null)}
                    onGuardado={recargar}
                />
            )}
            {nickAbierto && (
                <UserModal nick={nickAbierto} onClose={() => setNickAbierto(null)} onCambioSeguimiento={recargar} />
            )}
        </>
    );
}
