import { API_URL } from "./config";

// Cliente HTTP minimo para el backend. El backend espera el JWT tal cual en la
// cabecera "Authorization" (sin prefijo "Bearer").
//   api("/listar/publicacion")
//   api("/login/user", { method: "POST", body: {...}, auth: false })
//   api("/upload/user", { method: "PUT", form: formData })
export async function api(path, { method = "GET", body, form, auth = true } = {}) {
    const headers = {};
    if (auth) {
        const token = localStorage.getItem("token");
        if (token) headers.Authorization = token;
    }
    let payload;
    if (form) {
        payload = form;
    } else if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        payload = JSON.stringify(body);
    }

    try {
        const resp = await fetch(`${API_URL}${path}`, { method, headers, body: payload });
        let data = {};
        try {
            data = await resp.json();
        } catch {
            /* respuesta sin JSON */
        }
        return { ok: resp.ok, status: resp.status, data };
    } catch (err) {
        console.error(err);
        return { ok: false, status: 0, data: { message: "No se pudo conectar con el servidor." } };
    }
}

// Mensaje de error legible a partir de la respuesta del backend.
export const mensajeError = (data, porDefecto = "Ocurrió un error.") =>
    data?.message || data?.mensaje || porDefecto;
