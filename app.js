// Configuracion de la URL base del Backend (ver config.js)
const API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_URL) || "http://localhost:4000/api";

document.addEventListener("DOMContentLoaded", () => {
    cargarHeaderUsuario();

    // 1. Manejo del Login
    const formLogin = document.getElementById("form-login");
    if (formLogin) {
        formLogin.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            // CAPTURAR EL TOKEN DE RECAPTCHA
            const captchaToken = typeof grecaptcha !== "undefined" ? grecaptcha.getResponse() : "";

            // VERIFICAR QUE EL USUARIO MARCARA LA CASILLA ANTES DE ENVIAR
            if (!captchaToken) {
                document.getElementById("mensaje-error").innerText = "Por favor marca la casilla 'No soy un robot'.";
                return;
            }

            try {
                const resp = await fetch(`${API_URL}/login/user`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password, captchaToken })
                });

                const data = await resp.json();

                if (data.status === "success") {
                    localStorage.setItem("token", data.token);
                    localStorage.setItem("user", JSON.stringify(data.user));
                    window.location.href = "index.html";
                } else {
                    document.getElementById("mensaje-error").innerText = data.message || data.mensaje || "Error de inicio de sesion";
                    if (typeof grecaptcha !== "undefined") grecaptcha.reset();
                }
            } catch (err) {
                console.error(err);
                document.getElementById("mensaje-error").innerText = "Error en el servidor";
                if (typeof grecaptcha !== "undefined") grecaptcha.reset();
            }
        });
    }

    // 2. Manejo del Registro
    const formRegistro = document.getElementById("form-registro");
    if (formRegistro) {
        formRegistro.addEventListener("submit", async (e) => {
            e.preventDefault();

            const mensajeDiv = document.getElementById("mensaje-error");
            mensajeDiv.style.color = "#333";
            mensajeDiv.innerText = "Registrando usuario...";

            // CAPTURAR EL TOKEN DE RECAPTCHA (tambien requerido al registrarse)
            const captchaToken = typeof grecaptcha !== "undefined" ? grecaptcha.getResponse() : "";
            if (!captchaToken) {
                mensajeDiv.style.color = "red";
                mensajeDiv.innerText = "Por favor marca la casilla 'No soy un robot'.";
                return;
            }

            const email = document.getElementById("reg-email").value;
            const password = document.getElementById("reg-password").value;

            const bodyData = {
                name: document.getElementById("reg-name").value,
                surname: document.getElementById("reg-surname").value,
                nick: document.getElementById("reg-nick").value,
                email: email,
                password: password,
                captchaToken
            };

            try {
                // Paso 1: Registrar usuario en el backend
                const respReg = await fetch(`${API_URL}/registrar/user`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(bodyData)
                });

                const dataReg = await respReg.json();

                if (dataReg.status !== "success") {
                    mensajeDiv.style.color = "red";
                    mensajeDiv.innerText = dataReg.message || "Error al registrar usuario.";
                    if (typeof grecaptcha !== "undefined") grecaptcha.reset();
                    return;
                }

                const fileInput = document.getElementById("reg-file");

                // Paso 2: Verificar si adjunto foto de perfil
                if (fileInput.files.length > 0) {
                    mensajeDiv.innerText = "Usuario creado. Subiendo foto de perfil...";

                    // Login automatico (sin captcha, ya se verifico en el registro)
                    const respLogin = await fetch(`${API_URL}/login/user`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email, password, captchaToken })
                    });

                    const dataLogin = await respLogin.json();

                    if (dataLogin.status === "success") {
                        const token = dataLogin.token;

                        const formData = new FormData();
                        formData.append("file0", fileInput.files[0]);

                        const respUpload = await fetch(`${API_URL}/upload/user`, {
                            method: "PUT",
                            headers: { "Authorization": token },
                            body: formData
                        });

                        const dataUpload = await respUpload.json();

                        if (dataUpload.status === "success") {
                            localStorage.setItem("token", token);
                            localStorage.setItem("user", JSON.stringify(dataUpload.user));
                            window.location.href = "index.html";
                            return;
                        }
                    }
                }

                window.location.href = "login.html";

            } catch (err) {
                console.error(err);
                mensajeDiv.style.color = "red";
                mensajeDiv.innerText = "Error de conexion con el servidor.";
            }
        });
    }

    // 3. Cargar Vista de Perfil
    if (document.getElementById("detalle-perfil")) {
        cargarPerfil();
    }

    // 4. Cargar y Actualizar Formulario de Edicion de Perfil
    const formEditPerfil = document.getElementById("form-editar-perfil");
    if (formEditPerfil) {
        const userLocal = JSON.parse(localStorage.getItem("user") || "{}");
        if (userLocal) {
            document.getElementById("edit-user-name").value = userLocal.name || "";
            document.getElementById("edit-user-surname").value = userLocal.surname || "";
            document.getElementById("edit-user-nick").value = userLocal.nick || "";
            document.getElementById("edit-user-email").value = userLocal.email || "";
        }

        formEditPerfil.addEventListener("submit", async (e) => {
            e.preventDefault();
            const token = localStorage.getItem("token");

            const userToUpdate = {
                name: document.getElementById("edit-user-name").value,
                surname: document.getElementById("edit-user-surname").value,
                nick: document.getElementById("edit-user-nick").value,
                email: document.getElementById("edit-user-email").value
            };

            const pwd = document.getElementById("edit-user-password").value;
            if (pwd) userToUpdate.password = pwd;

            try {
                const resp = await fetch(`${API_URL}/actualizar/user`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": token
                    },
                    body: JSON.stringify(userToUpdate)
                });

                const data = await resp.json();
                if (data.status === "success") {
                    localStorage.setItem("user", JSON.stringify(data.user));
                    window.location.href = "perfil.html";
                }
            } catch (err) {
                console.error(err);
            }
        });

        // Subir Imagen / Avatar
        const formAvatar = document.getElementById("form-subir-avatar");
        formAvatar.addEventListener("submit", async (e) => {
            e.preventDefault();
            const token = localStorage.getItem("token");
            const fileInput = document.getElementById("avatar-file");

            if (!fileInput.files[0]) return;

            const formData = new FormData();
            formData.append("file0", fileInput.files[0]);

            try {
                const resp = await fetch(`${API_URL}/upload/user`, {
                    method: "PUT",
                    headers: { "Authorization": token },
                    body: formData
                });

                const data = await resp.json();
                if (data.status === "success") {
                    localStorage.setItem("user", JSON.stringify(data.user));
                    window.location.href = "perfil.html";
                }
            } catch (err) {
                console.error(err);
            }
        });
    }
});

// Función para renderizar el widget en el Header según sesión
function cargarHeaderUsuario() {
    const headerDiv = document.getElementById("usuario-header");
    if (!headerDiv) return;

    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    const imagenRota = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

    if (token && user) {
        const imgSrc = user.imageUrl || imagenRota;
        headerDiv.innerHTML = `
            <div class="user-widget">
                <img src="${imgSrc}" alt="Avatar" onerror="this.src='${imagenRota}'">
                <a href="perfil.html">${user.nick || user.name}</a>
                <button class="btn-logout" onclick="cerrarSesion()">Cerrar Sesión</button>
            </div>
        `;
    } else {
        headerDiv.innerHTML = `
            <a href="login.html" style="color:white; margin-right:10px;">Iniciar Sesión</a>
            <a href="registro.html" style="color:white;">Registrarse</a>
        `;
    }
}

async function cargarPerfil() {
    const params = new URLSearchParams(window.location.search);
    const nickUrl = params.get("nick");
    const idUrl = params.get("id");

    const usuarioLogueado = JSON.parse(localStorage.getItem("user") || "null");

    if (!usuarioLogueado) {
        window.location.href = "login.html";
        return;
    }

    const myNick = usuarioLogueado.nick || usuarioLogueado.name;
    const myId = usuarioLogueado.id || usuarioLogueado._id;

    let esPerfilPropio = true;
    if (idUrl && String(idUrl) !== String(myId)) {
        esPerfilPropio = false;
    } else if (nickUrl && nickUrl.toLowerCase() !== myNick.toLowerCase()) {
        esPerfilPropio = false;
    }

    const secCrear = document.getElementById("seccion-crear-post");
    if (secCrear) secCrear.style.display = esPerfilPropio ? "block" : "none";

    const btnEdit = document.getElementById("btn-editar-perfil-link");
    if (btnEdit) btnEdit.style.display = esPerfilPropio ? "inline-block" : "none";

    const targetId = esPerfilPropio ? myId : idUrl;
    const targetNick = esPerfilPropio ? myNick : nickUrl;

    const nickElement = document.getElementById("perfil-nick");
    const nombreElement = document.getElementById("perfil-nombre");
    const avatarImg = document.getElementById("perfil-avatar");

    if (nickElement) nickElement.innerText = targetNick || "usuario";

    if (esPerfilPropio) {
        if (nombreElement) {
            const nombreCompleto = `${usuarioLogueado.name || ''} ${usuarioLogueado.surname || ''}`.trim();
            nombreElement.innerText = nombreCompleto || myNick;
        }
        if (avatarImg && usuarioLogueado.imageUrl) {
            avatarImg.src = usuarioLogueado.imageUrl;
        }
    } else if (idUrl) {
        try {
            const token = localStorage.getItem("token");
            const resp = await fetch(`${API_URL}/profile/user/${idUrl}`, {
                headers: { "Authorization": token }
            });
            const data = await resp.json();
            if (data.status === "success" && data.user) {
                const u = data.user;
                if (nombreElement) nombreElement.innerText = `${u.name || ''} ${u.surname || ''}`.trim() || u.nick;
                if (nickElement) nickElement.innerText = u.nick;
                if (avatarImg && u.imageUrl) avatarImg.src = u.imageUrl;
            }
        } catch (err) {
            console.error("Error al obtener perfil ajeno:", err);
        }
    }

    cargarPublicacionesUsuario(targetId, esPerfilPropio);
}

function cerrarSesion() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
}


// MÓDULO DE PUBLICACIONES

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("listado-articulos")) {
        cargarFeedPrincipal();
    }

    const formCrearPost = document.getElementById("form-crear-post");
    if (formCrearPost) {
        formCrearPost.addEventListener("submit", crearPublicacion);
    }

    const formEditarPost = document.getElementById("form-editar-post");
    if (formEditarPost) {
        formEditarPost.addEventListener("submit", guardarEdicionPost);
    }

    if (document.getElementById("listado-siguiendo")) {
        cargarFeedSeguidos();
    }
});

// Construye el HTML de una tarjeta de publicacion para el feed.
// Usa SIEMPRE thumbnailUrl (la miniatura generada automaticamente al subir
// la foto) para la miniatura del feed; el modal de edicion recibe la imagen
// a resolucion completa (imageUrl) y las 3 transformaciones automaticas.
function tarjetaPublicacionHTML(post) {
    const tieneImagen = !!post.thumbnailUrl;
    const transformaciones = JSON.stringify({
        thumbnail: post.thumbnailUrl || null,
        grayscale: post.grayscaleUrl || null,
        sepia: post.sepiaUrl || null
    }).replace(/"/g, "&quot;");

    return `
        <div class="card-articulo">
            <div class="user-widget" onclick="verPerfilUsuario('${post.usuarioNick}')" style="margin-bottom: 12px; cursor: pointer;">
                <span><strong>@${post.usuarioNick}</strong></span>
            </div>

            ${tieneImagen ? `<img src="${post.thumbnailUrl}" onclick='abrirModalFiltro("${post.imageUrl}", "publicacion", "${post._id}", "${post.usuario}", ${transformaciones})' style="max-width:400px; border-radius:8px; margin-bottom:10px; cursor:pointer;">` : ''}
            <p style="font-size: 1rem; margin-bottom: 10px;">${post.contenido}</p>

            <div>
                <button class="btn-ver" onclick="darLike('${post._id}', this)">
                    <img src="imagenes/recursos/corazonLike.png" alt="Like" style="width: 15px; height: 15px;">
                    (<span class="like-count">${post.likes || 0}</span>)
                </button>
            </div>
        </div>
    `;
}

async function cargarFeedPrincipal() {
    const contenedor = document.getElementById("listado-articulos");
    if (!contenedor) return;

    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    try {
        const resp = await fetch(`${API_URL}/listar/publicacion`, {
            headers: { "Authorization": token }
        });
        const data = await resp.json();

        if (data.status === "success" && data.consulta) {
            contenedor.innerHTML = data.consulta.map(tarjetaPublicacionHTML).join("");
        } else {
            contenedor.innerHTML = "<p>Aun no hay publicaciones.</p>";
        }
    } catch (err) {
        console.error("Error al cargar publicaciones:", err);
    }
}

async function darLike(postId, btnElement) {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const likeSpan = btnElement.querySelector(".like-count");
    const esLiked = btnElement.classList.contains("liked");

    try {
        const resp = await fetch(`${API_URL}/likes/publicacion`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token
            },
            body: JSON.stringify({ id: postId, decrement: esLiked })
        });

        const data = await resp.json();

        if (data.status === "success") {
            likeSpan.innerText = data.publicacion.likes;
            btnElement.classList.toggle("liked");
            btnElement.style.backgroundColor = esLiked ? "#0095f6" : "#ed4956";
        }
    } catch (err) {
        console.error("Error al procesar el like:", err);
    }
}

async function cargarPublicacionesUsuario(usuarioId, esPerfilPropio) {
    const contenedor = document.getElementById("mis-publicaciones");
    if (!contenedor) return;

    const token = localStorage.getItem("token");

    try {
        const resp = await fetch(`${API_URL}/listar/publicacion`, {
            headers: { "Authorization": token }
        });
        const data = await resp.json();

        if (data.status === "success" && data.consulta) {
            const misPosts = data.consulta.filter((post) => String(post.usuario) === String(usuarioId));

            if (misPosts.length === 0) {
                contenedor.innerHTML = "<p>No hay publicaciones aún.</p>";
                return;
            }

            contenedor.innerHTML = misPosts.map((post) => {
                const tieneImagen = !!post.thumbnailUrl;
                const transformaciones = JSON.stringify({
                    thumbnail: post.thumbnailUrl || null,
                    grayscale: post.grayscaleUrl || null,
                    sepia: post.sepiaUrl || null
                }).replace(/"/g, "&quot;");

                return `
                    <div class="card-articulo">
                        ${tieneImagen ? `<img src="${post.thumbnailUrl}" onclick='abrirModalFiltro("${post.imageUrl}", "publicacion", "${post._id}", "${post.usuario}", ${transformaciones})' style="max-width:400px; max-height:200px; border-radius:8px; margin:10px 0; cursor: pointer;">` : ''}
                        <p>${post.contenido}</p>

                        ${esPerfilPropio ? `
                            <div class="acciones-card" style="margin-top: 10px;">
                                <button class="btn-editar" onclick="abrirModalEditar('${post._id}', \`${post.contenido}\`)">Editar</button>
                                <button class="btn-eliminar" onclick="eliminarPublicacion('${post._id}')">Eliminar</button>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join("");
        }
    } catch (err) {
        console.error("Error al cargar publicaciones del usuario:", err);
    }
}

async function crearPublicacion(e) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const userLocal = JSON.parse(localStorage.getItem("user") || "{}");

    const contenido = document.getElementById("post-contenido").value;
    const fileInput = document.getElementById("post-file");

    const userId = userLocal.id || userLocal._id;

    try {
        const resp = await fetch(`${API_URL}/crear/publicacion`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token
            },
            body: JSON.stringify({
                usuario: userId,
                usuarioNick: userLocal.nick || userLocal.name,
                contenido: contenido
            })
        });

        const data = await resp.json();

        if (data.status === "success") {
            const postId = data.articulo._id;

            // Subir imagen opcional. El backend genera automaticamente la
            // miniatura + version en blanco y negro + sepia, y corre el
            // reconocimiento facial (face-api.js) sobre la foto.
            if (fileInput && fileInput.files.length > 0) {
                const formData = new FormData();
                formData.append("file0", fileInput.files[0]);

                await fetch(`${API_URL}/subir-imagen/${postId}`, {
                    method: "POST",
                    headers: { "Authorization": token },
                    body: formData
                });
            }

            cerrarModalCrear();
            location.reload();
        }
    } catch (err) {
        console.error("Error al crear publicación:", err);
    }
}

async function eliminarPublicacion(postId) {
    if (!confirm("¿Deseas eliminar esta publicación?")) return;
    const token = localStorage.getItem("token");

    try {
        const resp = await fetch(`${API_URL}/borrar/publicacion/${postId}`, {
            method: "DELETE",
            headers: { "Authorization": token }
        });

        const data = await resp.json();
        if (data.status === "success" || data.status === "Success") {
            location.reload();
        }
    } catch (err) {
        console.error("Error al eliminar publicación:", err);
    }
}

function abrirModalEditar(id, contenido) {
    document.getElementById("edit-post-id").value = id;
    document.getElementById("edit-post-contenido").value = contenido;
    const modal = document.getElementById("modal-editar-post");
    if (modal) modal.classList.remove("oculto");
}

function cerrarModalEditar() {
    const modal = document.getElementById("modal-editar-post");
    if (modal) modal.classList.add("oculto");
}

function abrirModalCrear() {
    const modal = document.getElementById("modal-crear-post");
    if (modal) modal.classList.remove("oculto");
}

function cerrarModalCrear() {
    const modal = document.getElementById("modal-crear-post");
    if (modal) modal.classList.add("oculto");
}

async function guardarEdicionPost(e) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const id = document.getElementById("edit-post-id").value;
    const contenido = document.getElementById("edit-post-contenido").value;

    try {
        const resp = await fetch(`${API_URL}/actualizar/publicacion/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token
            },
            body: JSON.stringify({ contenido })
        });

        const data = await resp.json();
        if (data.status === "success") {
            cerrarModalEditar();
            location.reload();
        }
    } catch (err) {
        console.error("Error al editar publicación:", err);
    }
}

//Barra de navegación
function actualizarBarraNavegacionInferior() {
    const container = document.getElementById("bottom-nav-container");
    if (!container) return;

    const path = window.location.pathname.toLowerCase();

    let activeTab = 0;
    if (path.includes("siguiendo.html")) {
        activeTab = 1;
    } else if (path.includes("perfil.html")) {
        activeTab = 2;
    }

    container.setAttribute("data-tab", activeTab);

    const items = container.querySelectorAll(".bottom-nav-item");
    items.forEach((item, index) => {
        item.classList.toggle("active", index === activeTab);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    actualizarBarraNavegacionInferior();
});

// Sección de followers
let targetUserId = null;

async function verPerfilUsuario(usuarioId) {
    const token = localStorage.getItem("token");
    const modal = document.getElementById("modal-perfil-usuario");

    if (!modal) return;

    try {
        const respUser = await fetch(`${API_URL}/follow/usuario-nick/${encodeURIComponent(usuarioId)}`, {
            headers: { "Authorization": token }
        });

        if (!respUser.ok) {
            document.getElementById("modal-user-nombre").innerText = usuarioId;
            document.getElementById("modal-user-nick").innerText = usuarioId;
            document.getElementById("modal-user-avatar").src = "default-avatar.png";
            document.getElementById("btn-toggle-follow").style.display = "none";

            cargarPublicacionesModalUser(usuarioId);
            modal.classList.remove("oculto");
            return;
        }

        const dataUser = await respUser.json();

        if (dataUser.status === "success" && dataUser.user) {
            const u = dataUser.user;
            targetUserId = u._id || u.id;

            document.getElementById("modal-user-nombre").innerText = `${u.name || ''} ${u.surname || ''}`.trim() || u.nick;
            document.getElementById("modal-user-nick").innerText = u.nick;

            const avatarImg = document.getElementById("modal-user-avatar");
            avatarImg.src = u.imageUrl || "default-image.png";

            const btnFollow = document.getElementById("btn-toggle-follow");
            const userLocal = JSON.parse(localStorage.getItem("user") || "{}");
            const myNick = userLocal.nick || userLocal.name;

            if (u.nick === myNick) {
                btnFollow.style.display = "none";
            } else {
                btnFollow.style.display = "inline-block";
                await actualizarEstadoBotonSeguir(targetUserId);
                btnFollow.onclick = () => toggleSeguir(targetUserId);
            }

            cargarPublicacionesModalUser(targetUserId);
            modal.classList.remove("oculto");
        }

    } catch (err) {
        console.error("Error al abrir perfil del usuario:", err);
    }
}

function cerrarPerfilUsuarioModal() {
    const modal = document.getElementById("modal-perfil-usuario");
    if (modal) modal.classList.add("oculto");
}

async function actualizarEstadoBotonSeguir(userId) {
    const token = localStorage.getItem("token");
    const btnFollow = document.getElementById("btn-toggle-follow");

    try {
        const resp = await fetch(`${API_URL}/follow/comprobar/${userId}`, {
            headers: { "Authorization": token }
        });
        const data = await resp.json();

        if (data.status === "success" && data.siguiendo) {
            btnFollow.innerText = "Dejar de seguir";
            btnFollow.style.backgroundColor = "#efefef";
            btnFollow.style.color = "#ffffff";
            btnFollow.dataset.siguiendo = "true";
        } else {
            btnFollow.innerText = "Seguir";
            btnFollow.style.backgroundColor = "#0095f6";
            btnFollow.style.color = "#ffffff";
            btnFollow.dataset.siguiendo = "false";
        }
    } catch (err) {
        console.error("Error al comprobar seguimiento:", err);
    }
}

async function toggleSeguir(userId) {
    const token = localStorage.getItem("token");
    const btnFollow = document.getElementById("btn-toggle-follow");
    const esSiguiendo = btnFollow.dataset.siguiendo === "true";

    const endpoint = esSiguiendo ? `${API_URL}/follow/dejar/${userId}` : `${API_URL}/follow/seguir/${userId}`;
    const metodo = esSiguiendo ? "DELETE" : "POST";

    try {
        const resp = await fetch(endpoint, {
            method: metodo,
            headers: { "Authorization": token }
        });
        const data = await resp.json();

        if (data.status === "success") {
            await actualizarEstadoBotonSeguir(userId);
            if (document.getElementById("listado-siguiendo")) {
                cargarFeedSeguidos();
            }
        }
    } catch (err) {
        console.error("Error al alternar seguimiento:", err);
    }
}

async function cargarPublicacionesModalUser(usuarioId) {
    const contenedor = document.getElementById("modal-user-posts");
    if (!contenedor) return;

    const token = localStorage.getItem("token");

    try {
        const resp = await fetch(`${API_URL}/listar/publicacion`, {
            headers: { "Authorization": token }
        });
        const data = await resp.json();

        if (data.status === "success" && data.consulta) {
            const posts = data.consulta.filter((p) => String(p.usuario) === String(usuarioId));

            if (posts.length === 0) {
                contenedor.innerHTML = "<p style='color:#737373;'>Este usuario no tiene publicaciones.</p>";
                return;
            }

            contenedor.innerHTML = posts.map((post) => `
                <div class="card-articulo" style="padding: 0.8rem; margin-bottom: 0.8rem;">
                    ${post.thumbnailUrl ? `<img src="${post.thumbnailUrl}" style="width:100%; border-radius:6px;">` : ''}
                    <p style="margin: 0 0 5px 0;">${post.contenido}</p>
                </div>
            `).join("");
        }
    } catch (err) {
        console.error("Error al cargar posts del modal:", err);
    }
}

async function cargarFeedSeguidos() {
    const contenedor = document.getElementById("listado-siguiendo");
    if (!contenedor) return;

    const token = localStorage.getItem("token");
    if (!token) {
        contenedor.innerHTML = "<p>Inicia sesión para ver publicaciones de personas que sigues.</p>";
        return;
    }

    try {
        const resp = await fetch(`${API_URL}/listar/siguiendo`, {
            headers: { "Authorization": token }
        });
        const data = await resp.json();

        if (data.status === "success" && data.consulta) {
            if (data.consulta.length === 0) {
                contenedor.innerHTML = "<p>Aún no sigues a nadie o tus seguidos no tienen publicaciones.</p>";
                return;
            }
            contenedor.innerHTML = data.consulta.map(tarjetaPublicacionHTML).join("");
        }
    } catch (err) {
        console.error("Error al cargar feed de seguidos:", err);
    }
}

//Google Login
window.onload = function () {
    if (typeof google !== "undefined" && window.APP_CONFIG) {
        google.accounts.id.initialize({
            client_id: window.APP_CONFIG.GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse
        });

        google.accounts.id.renderButton(
            document.getElementById("buttonDiv"),
            { theme: "outline", size: "large", text: "signin_with" }
        );
    }
};

async function handleCredentialResponse(response) {
    const googleToken = response.credential;

    try {
        const resp = await fetch(`${API_URL}/login/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: googleToken })
        });

        const data = await resp.json();

        if (data.status === "success") {
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            window.location.href = "index.html";
        }
    } catch (err) {
        console.error("Error en login con Google:", err);
    }
}

//Transformaciones de imagenes
let imagenEdicionActual = {
    srcOriginal: "",
    filtroSeleccionado: "normal",
    tipo: "", // 'publicacion' o 'perfil'
    idTarget: "", // ID de la publicación o ID del usuario propietario
    esPropio: false,
    transformaciones: null // { thumbnail, grayscale, sepia } generadas automaticamente al subir
};

// Abrir Modal de edicion. "urlOriginal" es la imagen A RESOLUCION COMPLETA
// (no la miniatura del feed). "transformaciones" trae las URLs de las 3
// transformaciones automaticas (miniatura/B&N/sepia) para mostrarlas en una
// galeria de solo lectura dentro del mismo modal.
function abrirModalFiltro(urlOriginal, tipo, idTarget, idPropietario, transformaciones) {
    const usuarioLogueado = JSON.parse(localStorage.getItem("user") || "{}");

    const myId = String(usuarioLogueado.id || usuarioLogueado._id || "").trim();
    const myNick = String(usuarioLogueado.nick || usuarioLogueado.usuario || "").trim().toLowerCase();

    let ownerStr = "";
    if (typeof idPropietario === "object" && idPropietario !== null) {
        ownerStr = String(idPropietario._id || idPropietario.id || "").trim();
    } else {
        ownerStr = String(idPropietario || "").trim();
    }
    const ownerLower = ownerStr.toLowerCase();

    let esPropio = false;
    if (myId !== "" && myId === ownerStr) {
        esPropio = true;
    } else if (myNick !== "" && myNick === ownerLower) {
        esPropio = true;
    } else if (tipo === "perfil" && (ownerStr === "" || ownerStr === "undefined" || ownerStr === "null")) {
        esPropio = true;
    }

    imagenEdicionActual = {
        srcOriginal: urlOriginal,
        filtroSeleccionado: "normal",
        tipo: tipo,
        idTarget: idTarget,
        esPropio: esPropio,
        transformaciones: transformaciones || null
    };

    const imgPreview = document.getElementById("img-preview");
    imgPreview.src = urlOriginal;
    imgPreview.className = "f-normal";

    const btnGuardar = document.getElementById("btn-guardar-filtro");
    const txtLectura = document.getElementById("txt-modo-lectura");

    if (esPropio) {
        btnGuardar.style.display = "inline-block";
        txtLectura.style.display = "none";
    } else {
        btnGuardar.style.display = "none";
        txtLectura.style.display = "inline-block";
    }

    renderGaleriaTransformaciones(transformaciones);

    document.getElementById("modal-filtro").style.display = "flex";
}

// Muestra (si existe el contenedor en la pagina) las 3 transformaciones
// automaticas generadas al subir la foto: miniatura, blanco y negro y sepia.
function renderGaleriaTransformaciones(transformaciones) {
    const galeria = document.getElementById("galeria-transformaciones");
    if (!galeria) return;

    if (!transformaciones || (!transformaciones.grayscale && !transformaciones.sepia)) {
        galeria.innerHTML = "";
        galeria.style.display = "none";
        return;
    }

    galeria.style.display = "block";
    galeria.innerHTML = `
        <h4 style="margin: 10px 0 6px;">Transformaciones automáticas</h4>
        <div style="display:flex; gap:10px;">
            ${transformaciones.thumbnail ? `<div style="text-align:center;"><img src="${transformaciones.thumbnail}" style="width:70px;height:70px;object-fit:cover;border-radius:6px;"><p style="font-size:0.7em;margin:2px 0;">Miniatura</p></div>` : ''}
            ${transformaciones.grayscale ? `<div style="text-align:center;"><img src="${transformaciones.grayscale}" style="width:70px;height:70px;object-fit:cover;border-radius:6px;"><p style="font-size:0.7em;margin:2px 0;">Blanco y negro</p></div>` : ''}
            ${transformaciones.sepia ? `<div style="text-align:center;"><img src="${transformaciones.sepia}" style="width:70px;height:70px;object-fit:cover;border-radius:6px;"><p style="font-size:0.7em;margin:2px 0;">Sepia</p></div>` : ''}
        </div>
    `;
}

function cerrarModalFiltro() {
    document.getElementById("modal-filtro").style.display = "none";
}

function seleccionarFiltro(nombreFiltro, btnElement) {
    imagenEdicionActual.filtroSeleccionado = nombreFiltro;

    const imgPreview = document.getElementById("img-preview");
    imgPreview.className = `f-${nombreFiltro}`;

    document.querySelectorAll(".btn-filtro").forEach((b) => b.classList.remove("active"));
    btnElement.classList.add("active");
}

// Enviar la transformación manual al backend (solo imágenes propias).
// Ademas de las 3 transformaciones automaticas, el usuario puede elegir
// entre 9 filtros adicionales sobre SU PROPIA foto/avatar.
async function guardarFiltroEnServidor() {
    if (!imagenEdicionActual.esPropio) return;

    try {
        const token = localStorage.getItem("token");
        const resp = await fetch(`${API_URL}/imagen/transformar`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token
            },
            body: JSON.stringify({
                filtro: imagenEdicionActual.filtroSeleccionado,
                tipo: imagenEdicionActual.tipo,
                idTarget: imagenEdicionActual.idTarget
            })
        });

        const data = await resp.json();

        if (resp.ok && data.status === "success") {
            if (imagenEdicionActual.tipo === "perfil") {
                const user = JSON.parse(localStorage.getItem("user") || "{}");
                user.image = data.nuevaImagen;
                user.imageUrl = data.nuevaImagenUrl;
                localStorage.setItem("user", JSON.stringify(user));
            }

            cerrarModalFiltro();
            location.reload();
        }
    } catch (err) {
        console.error("Error al guardar filtro:", err);
    }
}

// Detección facial manual bajo demanda (ademas del analisis automatico que
// ya corre al subir la foto).
async function ejecutarAnalisisFacial() {
    if (!imagenEdicionActual || !imagenEdicionActual.idTarget) return;

    const panelInfo = document.getElementById("panel-reconocimiento");
    const contenedorAnalisis = document.getElementById("contenido-analisis");
    const imgPreview = document.getElementById("img-preview");

    panelInfo.style.display = "block";
    contenedorAnalisis.innerHTML = "<p>Analizando imagen...</p>";

    try {
        const resp = await fetch(`${API_URL}/analizar-rostro`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": localStorage.getItem("token")
            },
            body: JSON.stringify({
                tipo: imagenEdicionActual.tipo,
                idTarget: imagenEdicionActual.idTarget
            })
        });

        const data = await resp.json();

        if (data.status === "success") {
            imgPreview.src = data.imagenPrevisualizacion;
            imgPreview.className = "";

            if (data.totalRostros === 0) {
                contenedorAnalisis.innerHTML = "<p style='color: orange;'>No se detectó ningún rostro.</p>";
            } else {
                let html = `<p><strong>Rostros detectados:</strong> ${data.totalRostros}</p>`;
                data.detalles.forEach((r) => {
                    html += `
                        <div style="background: white; border: 1px solid #e0e0e0; padding: 10px; margin-bottom: 8px; border-radius: 6px;">
                            <p style="margin: 0; font-weight: bold;">Rostro #${r.id}</p>
                            <p style="margin: 4px 0;"><strong>Edad estimada:</strong> ${r.edadEstimada}</p>
                            <p style="margin: 4px 0;"><strong>Género:</strong> ${r.generoEstimado} (${r.generoProbabilidad})</p>
                        </div>
                    `;
                });
                contenedorAnalisis.innerHTML = html;
            }
        } else {
            contenedorAnalisis.innerHTML = `<p style='color: red;'>${data.mensaje}</p>`;
        }

    } catch (err) {
        console.error("Error al analizar rostro:", err);
        contenedorAnalisis.innerHTML = "<p style='color: red;'>Error de conexión al analizar la imagen.</p>";
    }
}
