import { useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api, mensajeError } from "../api";
import { useAuth } from "../auth";
import Recaptcha from "../components/Recaptcha";
import GoogleButton from "../components/GoogleButton";
import HojaContactos from "../components/HojaContactos";

export default function Login() {
    const { autenticado, iniciarSesion } = useAuth();
    const navigate = useNavigate();
    const captcha = useRef(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [ocupado, setOcupado] = useState(false);

    if (autenticado) return <Navigate to="/" replace />;

    const enviar = async (e) => {
        e.preventDefault();
        const captchaToken = captcha.current?.token();
        if (!captchaToken) return setError("Marca la casilla «No soy un robot» para continuar.");

        setOcupado(true);
        setError("");
        const { data } = await api("/login/user", { method: "POST", auth: false, body: { email, password, captchaToken } });
        setOcupado(false);
        if (data.status === "success") {
            iniciarSesion(data.token, data.user);
            navigate("/");
        } else {
            setError(mensajeError(data, "No se pudo iniciar sesión."));
            captcha.current?.reset();
        }
    };

    const conGoogle = async (credential) => {
        setError("");
        const { data } = await api("/login/google", { method: "POST", auth: false, body: { token: credential } });
        if (data.status === "success") {
            iniciarSesion(data.token, data.user);
            navigate("/");
        } else {
            setError(mensajeError(data, "No se pudo iniciar sesión con Google."));
        }
    };

    return (
        <div className="acceso">
            <section className="acceso-portada" aria-hidden="true">
                <p className="acceso-marca">mi red social</p>
                <HojaContactos />
                <p className="acceso-lema">Guarda tus fotos. Mira cómo se revelan en cuatro versiones.</p>
            </section>

            <section className="acceso-panel">
                <form className="formulario acceso-form" onSubmit={enviar}>
                    <h1>Iniciar sesión</h1>

                    <label className="campo">
                        <span>Correo electrónico</span>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
                    </label>
                    <label className="campo">
                        <span>Contraseña</span>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
                    </label>

                    <Recaptcha ref={captcha} />

                    {error && <p className="texto-error" role="alert">{error}</p>}
                    <button type="submit" className="btn btn-primario btn-ancho" disabled={ocupado}>
                        {ocupado ? "Entrando…" : "Entrar"}
                    </button>

                    <div className="separador"><span>o</span></div>
                    <GoogleButton onCredential={conGoogle} />

                    <p className="acceso-cambio">
                        ¿Aún no tienes cuenta? <Link to="/registro">Crear cuenta</Link>
                    </p>
                </form>
            </section>
        </div>
    );
}
