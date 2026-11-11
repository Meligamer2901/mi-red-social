import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { idDe } from "./auth";

// Carga una lista de publicaciones del backend. "ruta" es p. ej. "/listar/publicacion".
export function usePublicaciones(ruta, filtro) {
    const [posts, setPosts] = useState(null); // null = cargando
    const [error, setError] = useState("");

    const recargar = useCallback(async () => {
        const { data } = await api(ruta);
        if (data.status === "success" && Array.isArray(data.consulta)) {
            setPosts(filtro ? data.consulta.filter(filtro) : data.consulta);
            setError("");
        } else {
            setPosts([]);
            setError(data.message || data.mensaje || "No se pudieron cargar las publicaciones.");
        }
    }, [ruta, filtro]);

    useEffect(() => {
        recargar();
    }, [recargar]);

    return { posts, error, recargar };
}

// Id del propietario de una publicacion (el backend lo envia como id o como objeto).
export const propietarioDe = (post) => {
    const u = post.usuario;
    return typeof u === "object" && u !== null ? String(u._id || u.id || "") : String(u || "");
};

export const esPropia = (usuario, post) => {
    const mio = idDe(usuario);
    return mio !== "" && mio === propietarioDe(post);
};

// "Me gusta" recordados en este navegador (el backend solo guarda el contador).
const claveLikes = (usuario) => `likes_${idDe(usuario)}`;
export const leerLikes = (usuario) => {
    try {
        return new Set(JSON.parse(localStorage.getItem(claveLikes(usuario)) || "[]"));
    } catch {
        return new Set();
    }
};
export const guardarLikes = (usuario, set) => localStorage.setItem(claveLikes(usuario), JSON.stringify([...set]));

export const FILTROS = [
    { id: "normal", nombre: "Normal" },
    { id: "grayscale", nombre: "Blanco y negro" },
    { id: "sepia", nombre: "Sepia" },
    { id: "invert", nombre: "Negativo" },
    { id: "blur", nombre: "Desenfoque" },
    { id: "bright", nombre: "Brillo" },
    { id: "contrast", nombre: "Contraste" },
    { id: "warm", nombre: "Cálido" },
    { id: "cool", nombre: "Frío" },
    { id: "hue", nombre: "Psicodélico" }
];

export const transformacionesDe = (post) => ({
    thumbnail: post.thumbnailUrl || null,
    grayscale: post.grayscaleUrl || null,
    sepia: post.sepiaUrl || null
});
