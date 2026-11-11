import { useEffect, useState } from "react";
import { api, mensajeError } from "../api";
import { useAuth } from "../auth";
import { FILTROS } from "../posts";
import { IconoCerrar } from "./Icons";

// "Mesa de luz": foto a resolucion completa junto a sus transformaciones
// automaticas (miniatura, blanco y negro, sepia). El dueno de la foto ademas
// puede aplicar uno de 10 filtros, guardarlo en el servidor y analizar rostros.
//
// props: src (resolucion completa), transformaciones, tipo ("publicacion" | "perfil"),
//        idTarget (id de la publicacion o del usuario), esPropia, titulo, onClose, onGuardado
export default function Lightbox({ src, transformaciones, tipo, idTarget, esPropia, titulo, onClose, onGuardado }) {
    const { user, actualizarUsuario } = useAuth();
    const [mostrada, setMostrada] = useState(src);
    const [version, setVersion] = useState("original");
    const [filtro, setFiltro] = useState("normal");
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState("");
    const [analisis, setAnalisis] = useState(null); // null | "cargando" | {error} | {total, detalles}

    useEffect(() => {
        const previo = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const alTeclear = (e) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", alTeclear);
        return () => {
            document.body.style.overflow = previo;
            document.removeEventListener("keydown", alTeclear);
        };
    }, [onClose]);

    const versiones = [
        { id: "original", nombre: "Original", url: src },
        transformaciones?.thumbnail && { id: "thumbnail", nombre: "Miniatura", url: transformaciones.thumbnail },
        transformaciones?.grayscale && { id: "grayscale", nombre: "Blanco y negro", url: transformaciones.grayscale },
        transformaciones?.sepia && { id: "sepia", nombre: "Sepia", url: transformaciones.sepia }
    ].filter(Boolean);

    const elegirVersion = (v) => {
        setVersion(v.id);
        setMostrada(v.url);
        setFiltro("normal");
    };

    const elegirFiltro = (id) => {
        // Los filtros manuales siempre se aplican sobre la foto original.
        setFiltro(id);
        setVersion("original");
        setMostrada(src);
    };

    const guardarFiltro = async () => {
        setGuardando(true);
        setMensaje("");
        const { ok, data } = await api("/imagen/transformar", {
            method: "POST",
            body: { filtro, tipo, idTarget }
        });
        setGuardando(false);
        if (ok && data.status === "success") {
            if (tipo === "perfil") {
                actualizarUsuario({ ...user, image: data.nuevaImagen, imageUrl: data.nuevaImagenUrl });
            }
            onGuardado?.();
            onClose();
        } else {
            setMensaje(mensajeError(data, "No se pudo guardar el filtro."));
        }
    };

    const analizarRostro = async () => {
        setAnalisis("cargando");
        const { data } = await api("/analizar-rostro", { method: "POST", body: { tipo, idTarget } });
        if (data.status === "success") {
            if (data.imagenPrevisualizacion) {
                setMostrada(data.imagenPrevisualizacion);
                setFiltro("normal");
            }
            setAnalisis({ total: data.totalRostros, detalles: data.detalles || [] });
        } else {
            setAnalisis({ error: mensajeError(data, "No se pudo analizar la imagen.") });
        }
    };

    return (
        <div className="mesa" role="dialog" aria-modal="true" aria-label={titulo || "Foto completa"}>
            <button type="button" className="mesa-cerrar btn-icono" onClick={onClose} aria-label="Cerrar">
                <IconoCerrar />
            </button>

            <div className="mesa-escenario" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
                <img className={`f-${filtro}`} src={mostrada} alt={titulo || "Foto a resolución completa"} />
            </div>

            <aside className="mesa-panel">
                {titulo && <p className="mesa-titulo">{titulo}</p>}

                <section>
                    <h3>Versiones</h3>
                    <div className="tira">
                        {versiones.map((v) => (
                            <button
                                key={v.id}
                                type="button"
                                className={`tira-cuadro ${version === v.id && filtro === "normal" ? "activo" : ""}`}
                                onClick={() => elegirVersion(v)}
                                aria-pressed={version === v.id}
                            >
                                <img src={v.url} alt="" loading="lazy" />
                                <span>{v.nombre}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {esPropia && (
                    <section>
                        <h3>Filtros</h3>
                        <div className="filtros">
                            {FILTROS.map((f) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    className={`filtro ${filtro === f.id && f.id !== "normal" ? "activo" : ""}`}
                                    onClick={() => elegirFiltro(f.id)}
                                    aria-pressed={filtro === f.id && f.id !== "normal"}
                                >
                                    <img className={`f-${f.id}`} src={transformaciones?.thumbnail || src} alt="" />
                                    <span>{f.nombre}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                <section>
                    <h3>Reconocimiento facial</h3>
                    <button type="button" className="btn btn-secundario" onClick={analizarRostro} disabled={analisis === "cargando"}>
                        {analisis === "cargando" ? "Analizando…" : "Analizar rostros"}
                    </button>
                    {analisis && analisis !== "cargando" && (
                        <div className="analisis" role="status">
                            {analisis.error && <p className="texto-error">{analisis.error}</p>}
                            {!analisis.error && analisis.total === 0 && <p>No se detectó ningún rostro.</p>}
                            {!analisis.error && analisis.total > 0 && (
                                <>
                                    <p>
                                        {analisis.total === 1 ? "1 rostro detectado" : `${analisis.total} rostros detectados`}
                                    </p>
                                    <ul>
                                        {analisis.detalles.map((r) => (
                                            <li key={r.id}>
                                                <strong>Rostro {r.id}</strong>
                                                <span>Edad estimada: {r.edadEstimada}</span>
                                                <span>Género: {r.generoEstimado} ({r.generoProbabilidad})</span>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>
                    )}
                </section>

                {esPropia ? (
                    <div className="mesa-acciones">
                        {mensaje && <p className="texto-error" role="alert">{mensaje}</p>}
                        <button type="button" className="btn btn-primario" onClick={guardarFiltro} disabled={guardando || filtro === "normal"}>
                            {guardando ? "Guardando…" : "Guardar filtro"}
                        </button>
                    </div>
                ) : (
                    <p className="mesa-nota">Solo el autor puede aplicar filtros a esta foto.</p>
                )}
            </aside>
        </div>
    );
}

