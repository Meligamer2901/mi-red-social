import { createContext, useContext, useState, useCallback } from "react";

// Contexto de sesion: guarda token y usuario en localStorage (mismas claves
// que usaba el frontend anterior: "token" y "user").
const AuthContext = createContext(null);

const leerUsuario = () => {
    try {
        return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        return null;
    }
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(leerUsuario);

    const iniciarSesion = useCallback((token, usuario) => {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(usuario));
        setUser(usuario);
    }, []);

    const actualizarUsuario = useCallback((usuario) => {
        localStorage.setItem("user", JSON.stringify(usuario));
        setUser(usuario);
    }, []);

    const cerrarSesion = useCallback(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
    }, []);

    const autenticado = !!user && !!localStorage.getItem("token");

    return (
        <AuthContext.Provider value={{ user, autenticado, iniciarSesion, actualizarUsuario, cerrarSesion }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
export const idDe = (u) => String(u?.id || u?._id || "");
