import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // GitHub Pages serve o site numa subpasta (/nome-do-repositorio/); o workflow define VITE_BASE.
  base: process.env.VITE_BASE || "/",
  plugins: [react(), tailwindcss()],
});
