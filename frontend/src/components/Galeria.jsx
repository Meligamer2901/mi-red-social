import PostCard from "./PostCard";

// Cuadricula en columnas (mamposteria) de publicaciones, con estados vacio / carga.
export default function Galeria({ posts, error, vacio, onAbrir, onVerUsuario, accionesDe }) {
    if (posts === null) return <p className="estado" role="status">Cargando fotos…</p>;
    if (error) return <p className="estado estado-error" role="alert">{error}</p>;
    if (posts.length === 0) return <p className="estado">{vacio}</p>;

    return (
        <div className="galeria">
            {posts.map((post) => (
                <PostCard
                    key={post._id}
                    post={post}
                    onAbrir={onAbrir}
                    onVerUsuario={onVerUsuario}
                    acciones={accionesDe ? accionesDe(post) : null}
                />
            ))}
        </div>
    );
}
