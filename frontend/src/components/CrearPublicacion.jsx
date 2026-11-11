import { useState, useEffect } from "react";
import { api, mensajeError } from "../api";
import { useAuth, idDe } from "../auth";
import Modal from "./Modal";

// Crear publicacion: texto + foto opcional. Al subir la foto el backend genera
// solo la miniatura, la version en blanco y negro y la sepia, y analiza rostros.
export default function CrearPublicacion({ onClose, onCreada }) {
    const { user } = useAuth();
    const [contenido, setContenido] = useState("");
    const [archivo, setArchivo] = useState(null);
    const [vista, setVista] = useState("");
    const [estado, setEstado] = useState("");
    const [error, setError] = useState("");
    const [ocupado, setOcupado] = useState(false);

    useEffect(() => {
        if (!archivo) return setVista("");
        const url = URL.createObjectURL(archivo);
        setVista(url);
        return () => URL.revokeObjectURL(url);
    }, [archivo]);

    const enviar = async (e) => {
        e.preventDefault();
        setOcupado(true);
        setError("");
        setEstado("Publicando…");

        const { data } = await api("/crear/publicacion", {
            method: "POST",
            body: { usuario: idDe(user), usuarioNick: user.nick || user.name, contenido }
        });
        if (data.status !== "success") {
            setError(mensajeError(data, "No se pudo crear la publicación."));
            setOcupado(false);
            setEstado("");
            return;
        }

        if (archivo) {
            setEstado("Procesando la foto: miniatura, blanco y negro, sepia y rostros…");
            const form = new FormData();
            form.append("file0", archivo);
            const subida = await api(`/subir-imagen/${data.articulo._id}`, { method: "POST", form });
            if (!subida.ok) {
                setError(mensajeError(subida.data, "La publicación se creó, pero la foto no se pudo subir."));
                setOcupado(false);
                setEstado("");
                onCreada();
                return;
            }
        }
        onCreada();
        onClose();
    };

    return (
        <Modal titulo="Nueva publicación" onClose={ocupado ? () => {} : onClose}>
            <form onSubmit={enviar} className="formulario">
                <label className="campo">
                    <span>Descripción</span>
                    <textarea rows={3} value={contenido} onChange={(e) => setContenido(e.target.value)} placeholder="¿Qué quieres contar de esta foto?" required />
                </label>

                <label className="campo">
                    <span>Foto (opcional)</span>
                    <input type="file" accept="image/png, image/jpeg, image/jpg, image/gif" onChange={(e) => setArchivo(e.target.files[0] || null)} />
                </label>
                {vista && <img className="vista-previa" src={vista} alt="Vista previa de la foto elegida" />}

                {estado && <p className="estado" role="status">{estado}</p>}
                {error && <p className="texto-error" role="alert">{error}</p>}

                <div className="formulario-acciones">
                    <button type="button" className="btn btn-texto" onClick={onClose} disabled={ocupado}>Cancelar</button>
                    <button type="submit" className="btn btn-primario" disabled={ocupado}>Publicar</button>
                </div>
            </form>
        </Modal>
    );
}
