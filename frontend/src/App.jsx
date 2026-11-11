import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./auth";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import Inicio from "./pages/Inicio";
import Siguiendo from "./pages/Siguiendo";
import Perfil from "./pages/Perfil";
import EditarPerfil from "./pages/EditarPerfil";

// Rutas privadas: exigen sesion iniciada (el feed es solo para usuarios autenticados).
function Privada() {
    const { autenticado } = useAuth();
    if (!autenticado) return <Navigate to="/login" replace />;
    return (
        <>
            <Navbar />
            <main className="contenido">
                <Outlet />
            </main>
        </>
    );
}

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            <Route element={<Privada />}>
                <Route path="/" element={<Inicio />} />
                <Route path="/siguiendo" element={<Siguiendo />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/perfil/:id" element={<Perfil />} />
                <Route path="/perfil/editar" element={<EditarPerfil />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
