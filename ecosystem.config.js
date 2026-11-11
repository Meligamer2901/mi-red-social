// Configuracion de PM2 para correr la app como servicio en la instancia EC2
// (se mantiene viva, reinicia sola si falla, y arranca de nuevo tras un
// reinicio del servidor si se usa "pm2 startup" + "pm2 save").
//
// Uso en la instancia:
//   pm2 start ecosystem.config.js
//   pm2 save
//   pm2 startup   (sigue las instrucciones que imprime para systemd)

module.exports = {
    apps: [
        {
            name: "mi-red-social",
            script: "index.js",
            cwd: __dirname,
            instances: 1,
            exec_mode: "fork",
            env: {
                NODE_ENV: "production"
            },
            max_memory_restart: "500M",
            out_file: "logs/out.log",
            error_file: "logs/error.log",
            time: true
        }
    ]
};
