import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import Avatar from "./Avatar";
import { IconoGlobal, IconoSiguiendo, IconoPerfil } from "./Icons";

// En pantallas anchas la navegacion va arriba; en moviles pasa a una barra inferior.
export default function Navbar() {
    const { user, cerrarSesion } = useAuth();
    const navigate = useNavigate();

    const salir = () => {
        cerrarSesion();
        navigate("/login");
    };

    return (
        <header className="barra">
            <NavLink to="/" className="marca">mi red social<span className="marca-punto" aria-hidden="true" /></NavLink>

            <nav className="nav" aria-label="Principal">
                <NavLink to="/" end className="nav-link"><IconoGlobal /><span>Global</span></NavLink>
                <NavLink to="/siguiendo" className="nav-link"><IconoSiguiendo /><span>Siguiendo</span></NavLink>
                <NavLink to="/perfil" end className="nav-link"><IconoPerfil /><span>Mi perfil</span></NavLink>
            </nav>

            <div className="barra-usuario">
                <Avatar user={user} size={32} />
                <span className="barra-nick">@{user?.nick || user?.name}</span>
                <button type="button" className="btn btn-texto" onClick={salir}>Cerrar sesión</button>
            </div>
        </header>
    );
}
