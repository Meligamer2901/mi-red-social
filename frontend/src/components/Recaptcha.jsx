import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { RECAPTCHA_SITE_KEY } from "../config";

// reCAPTCHA v2 ("No soy un robot") cargado de forma explicita desde React.
// El padre usa la ref: ref.current.token() devuelve la respuesta ("" si no se marco)
// y ref.current.reset() reinicia la casilla.
let promesaScript = null;
function cargarRecaptcha() {
    if (promesaScript) return promesaScript;
    promesaScript = new Promise((resolve, reject) => {
        window.__recaptchaListo = () => window.grecaptcha.ready(() => resolve(window.grecaptcha));
        const s = document.createElement("script");
        s.src = "https://www.google.com/recaptcha/api.js?onload=__recaptchaListo&render=explicit";
        s.async = true;
        s.defer = true;
        s.onerror = () => {
            promesaScript = null;
            reject(new Error("No se pudo cargar reCAPTCHA"));
        };
        document.head.appendChild(s);
    });
    return promesaScript;
}

const Recaptcha = forwardRef(function Recaptcha(_props, ref) {
    const caja = useRef(null);
    const widgetId = useRef(null);

    useEffect(() => {
        let cancelado = false;
        cargarRecaptcha()
            .then((g) => {
                if (cancelado || !caja.current || widgetId.current !== null) return;
                widgetId.current = g.render(caja.current, { sitekey: RECAPTCHA_SITE_KEY });
            })
            .catch(console.error);
        return () => {
            cancelado = true;
        };
    }, []);

    useImperativeHandle(ref, () => ({
        token: () => (window.grecaptcha && widgetId.current !== null ? window.grecaptcha.getResponse(widgetId.current) : ""),
        reset: () => window.grecaptcha && widgetId.current !== null && window.grecaptcha.reset(widgetId.current)
    }));

    return <div ref={caja} className="recaptcha" />;
});

export default Recaptcha;
