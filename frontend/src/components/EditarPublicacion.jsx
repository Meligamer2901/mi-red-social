import { useState } from "react";
import { api, mensajeError } from "../api";
import Modal from "./Modal";

// Editar el texto de una publicacion propia.
export default function EditarPublicacion({ post, onClose, onGuardada }) {
    const [contenido, setContenido] = useState(post.contenido || "");
    const [error, setError] = useState("");
    const [ocupado, setOcupado] = useState(false);

    const guardar = async (e) => {
        e.preventDefault();
        setOcupado(true);
        const { data } = await api(`/actualizar/publicacion/${post._id}`, { method: "PUT", body: { contenido } });
        setOcupado(false);
        if (data.status === "success") {
            onGuardada();
            onClose();
        } else {
            setError(mensajeError(data, "No se pudieron guardar los cambios."));
        }
    };

    return (
        <Modal titulo="Editar publicación" onClose={onClose}>
            <form onSubmit={guardar} className="formulario">
                <label className="campo">
                    <span>Descripción</span>
                    <textarea rows={4} value={contenido} onChange={(e) => setContenido(e.target.value)} required />
                </label>
                {error && <p className="texto-error" role="alert">{error}</p>}
                <div className="formulario-acciones">
                    <button type="button" className="btn btn-texto" onClick={onClose}>Cancelar</button>
                    <button type="submit" className="btn btn-primario" disabled={ocupado}>Guardar cambios</button>
                </div>
            </form>
        </Modal>
    );
}
