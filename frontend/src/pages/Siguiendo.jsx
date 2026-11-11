import FeedVista from "./FeedVista";

export default function Siguiendo() {
    return (
        <FeedVista
            ruta="/listar/siguiendo"
            titulo="Siguiendo"
            subtitulo="Fotos de las personas que sigues."
            vacio="Todavía no hay fotos aquí. Entra al feed global y sigue a alguien para verlas."
        />
    );
}
