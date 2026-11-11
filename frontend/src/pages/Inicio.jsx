import FeedVista from "./FeedVista";

export default function Inicio() {
    return (
        <FeedVista
            ruta="/listar/publicacion"
            titulo="Feed global"
            subtitulo="Las fotos más recientes de toda la comunidad."
            vacio="Aún no hay fotos. Sube la primera desde tu perfil."
        />
    );
}
