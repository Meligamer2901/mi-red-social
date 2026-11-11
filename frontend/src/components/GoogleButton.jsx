import { useEffect, useRef } from "react";
import { GOOGLE_CLIENT_ID } from "../config";

// Boton oficial de Google Identity Services. Al elegir una cuenta, entrega el
// "credential" (ID token) al padre, que lo envia al backend (/login/google).
let promesaScript = null;
function cargarGoogle() {
    if (window.google?.accounts?.id) return Promise.resolve(window.google);
    if (promesaScript) return promesaScript;
    promesaScript = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client";
        s.async = true;
        s.defer = true;
        s.onload = () => resolve(window.google);
        s.onerror = () => {
            promesaScript = null;
            reject(new Error("No se pudo cargar Google Login"));
        };
        document.head.appendChild(s);
    });
    return promesaScript;
}

export default function GoogleButton({ onCredential }) {
    const caja = useRef(null);
    const alCredencial = useRef(onCredential);
    alCredencial.current = onCredential;

    useEffect(() => {
        let cancelado = false;
        cargarGoogle()
            .then((google) => {
                if (cancelado || !caja.current) return;
                google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: (resp) => alCredencial.current(resp.credential)
                });
                caja.current.innerHTML = "";
                google.accounts.id.renderButton(caja.current, {
                    theme: "outline",
                    size: "large",
                    text: "signin_with",
                    shape: "pill",
                    width: 300
                });
            })
            .catch(console.error);
        return () => {
            cancelado = true;
        };
    }, []);

    return <div ref={caja} className="google-boton" />;
}
