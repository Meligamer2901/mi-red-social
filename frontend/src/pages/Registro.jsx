import { useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api, mensajeError } from "../api";
import { useAuth } from "../auth";
import Recaptcha from "../components/Recaptcha";
import HojaContactos from "../components/HojaContactos";

export default function Registro() {
    const { autenticado, iniciarSesion } = useAuth();
    const navigate = useNavigate();
    const captcha = useRef(null);
    const [form, setForm] = useState({ name: "", surname: "", nick: "", email: "", password: "" });
    const [foto, setFoto] = useState(null);
    const [estado, setEstado] = useState("");
    const [error, setError] = useState("");
    const [ocupado, setOcupado] = useState(false);

    if (autenticado) return <Navigate to="/" replace />;

    const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

    const enviar = async (e) => {
        e.preventDefault();
        const captchaToken = captcha.current?.token();
        if (!captchaToken) return setError("Marca la casilla «No soy un robot» para continuar.");

        setOcupado(true);
        setError("");
        setEstado("Creando tu cuenta…");

        // Paso 1: registrar
        const reg = await api("/registrar/user", { method: "POST", auth: false, body: { ...form, captchaToken } });
        if (reg.data.status !== "success") {
            setError(mensajeError(reg.data, "No se pudo crear la cuenta."));
            setEstado("");
            setOcupado(false);
            captcha.current?.reset();
            return;
        }

        // Paso 2 (opcional): si eligio foto de perfil, iniciar sesion y subirla
        if (foto) {
            setEstado("Cuenta creada. Subiendo tu foto de perfil…");
            const login = await api("/login/user", {
                method: "POST",
                auth: false,
                body: { email: form.email, password: form.password, captchaToken }
            });
            if (login.data.status === "success") {
                localStorage.setItem("token", login.data.token);
                const datos = new FormData();
                datos.append("file0", foto);
                const subida = await api("/upload/user", { method: "PUT", form: datos });
                if (subida.data.status === "success") {
                    iniciarSesion(login.data.token, subida.data.user);
                    navigate("/");
                    return;
                }
                localStorage.removeItem("token");
            }
        }
        navigate("/login");
    };

    return (
        <div className="acceso">
            <section className="acceso-portada" aria-hidden="true">
                <p className="acceso-marca">mi red social</p>
                <HojaContactos />
                <p className="acceso-lema">Cada foto que subes se transforma sola: miniatura, blanco y negro y sepia.</p>
            </section>

            <section className="acceso-panel">
                <form className="formulario acceso-form" onSubmit={enviar}>
                    <h1>Crear cuenta</h1>

                    <div className="fila">
                        <label className="campo">
                            <span>Nombre</span>
                            <input value={form.name} onChange={cambiar("name")} autoComplete="given-name" required />
                        </label>
                        <label className="campo">
                            <span>Apellidos</span>
                            <input value={form.surname} onChange={cambiar("surname")} autoComplete="family-name" />
                        </label>
                    </div>
                    <label className="campo">
                        <span>Nombre de usuario</span>
                        <input value={form.nick} onChange={cambiar("nick")} autoComplete="username" required />
                    </label>
                    <label className="campo">
                        <span>Correo electrónico</span>
                        <input type="email" value={form.email} onChange={cambiar("email")} autoComplete="email" required />
                    </label>
                    <label className="campo">
                        <span>Contraseña</span>
                        <input type="password" value={form.password} onChange={cambiar("password")} autoComplete="new-password" required />
                    </label>
                    <label className="campo">
                        <span>Foto de perfil (opcional)</span>
                        <input type="file" accept="image/png, image/jpeg, image/jpg, image/gif" onChange={(e) => setFoto(e.target.files[0] || null)} />
                    </label>

                    <Recaptcha ref={captcha} />

                    {estado && <p className="estado" role="status">{estado}</p>}
                    {error && <p className="texto-error" role="alert">{error}</p>}
                    <button type="submit" className="btn btn-primario btn-ancho" disabled={ocupado}>
                        {ocupado ? "Creando cuenta…" : "Crear cuenta"}
                    </button>

                    <p className="acceso-cambio">
                        ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
                    </p>
                </form>
            </section>
        </div>
    );
}
