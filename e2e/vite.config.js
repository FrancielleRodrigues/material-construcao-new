import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Igual ao vite.config.js do app, mas trocando src/lib/supabase.js pelo backend falso.
export default defineConfig({
  root: raiz,
  plugins: [react(), tailwindcss()],
  resolve: { alias: [{ find: /^.*\/lib\/supabase$/, replacement: path.join(raiz, "e2e/supabaseFalso.js") }] },
  optimizeDeps: { exclude: ["@electric-sql/pglite"] },
});
