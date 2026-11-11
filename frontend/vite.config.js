import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Frontend en React. En desarrollo corre en http://localhost:5173 y llama al
// backend Express (por defecto http://localhost:4000/api, ver src/config.js).
export default defineConfig({
    plugins: [react()],
    server: { port: 5173 }
});
