import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, mensajeError } from "../api";
import { useAuth } from "../auth";

export default function EditarPerfil() {
    const { user, actualizarUsuario } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: user?.name || "",
        surname: user?.surname || "",
        nick: user?.nick || "",
        email: user?.email || "",
        password: ""
    });
    const [foto, setFoto] = useState(null);
    const [errorDatos, setErrorDatos] = useState("");
    const [errorFoto, setErrorFoto] = useState("");
    const [ocupado, setOcupado] = useState(false);

    const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

    const guardarDatos = async (e) => {
        e.preventDefault();
        setOcupado(true);
        setErrorDatos("");
        const body = { name: form.name, surname: form.surname, nick: form.nick, email: form.email };
        if (form.password) body.password = form.password;
        const { data } = await api("/actualizar/user", { method: "PUT", body });
        setOcupado(false);
        if (data.status === "success") {
            actualizarUsuario(data.user);
            navigate("/perfil");
        } else {
            setErrorDatos(mensajeError(data, "No se pudieron guardar los datos."));
        }
    };

    const subirFoto = async (e) => {
        e.preventDefault();
        if (!foto) return;
        setOcupado(true);
        setErrorFoto("");
        const datos = new FormData();
        datos.append("file0", foto);
        const { data } = await api("/upload/user", { method: "PUT", form: datos });
        setOcupado(false);
        if (data.status === "success") {
            actualizarUsuario(data.user);
            navigate("/perfil");
        } else {
            setErrorFoto(mensajeError(data, "No se pudo subir la foto."));
        }
    };

    return (
        <div className="columna-angosta">
            <Link to="/perfil" className="enlace-volver">← Volver al perfil</Link>
            <h1>Editar perfil</h1>

            <form className="formulario tarjeta" onSubmit={guardarDatos}>
                <div className="fila">
                    <label className="campo">
                        <span>Nombre</span>
                        <input value={form.name} onChange={cambiar("name")} />
                    </label>
                    <label className="campo">
                        <span>Apellidos</span>
                        <input value={form.surname} onChange={cambiar("surname")} />
                    </label>
                </div>
                <label className="campo">
                    <span>Nombre de usuario</span>
                    <input value={form.nick} onChange={cambiar("nick")} />
                </label>
                <label className="campo">
                    <span>Correo electrónico</span>
                    <input type="email" value={form.email} onChange={cambiar("email")} />
                </label>
                <label className="campo">
                    <span>Nueva contraseña</span>
                    <input type="password" value={form.password} onChange={cambiar("password")} autoComplete="new-password" minLength={6} maxLength={72} placeholder="Déjala en blanco para conservar la actual" />
                </label>
                {errorDatos && <p className="texto-error" role="alert">{errorDatos}</p>}
                <div className="formulario-acciones">
                    <button type="submit" className="btn btn-primario" disabled={ocupado}>Guardar cambios</button>
                </div>
            </form>

            <form className="formulario tarjeta" onSubmit={subirFoto}>
                <h2>Foto de perfil</h2>
                <label className="campo">
                    <span>Elige una imagen</span>
                    <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files[0] || null)} required />
                </label>
                {errorFoto && <p className="texto-error" role="alert">{errorFoto}</p>}
                <div className="formulario-acciones">
                    <button type="submit" className="btn btn-secundario" disabled={ocupado || !foto}>Actualizar foto</button>
                </div>
            </form>
        </div>
    );
}
