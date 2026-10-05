import { spawn } from "node:child_process";
import { chromium } from "playwright-core";

export async function iniciar({ porta = 5199 } = {}) {
  const servidor = spawn("npx", ["vite", "--config", "e2e/vite.config.js", "--port", String(porta), "--strictPort"], { stdio: "ignore", detached: true });
  const url = `http://localhost:${porta}`;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(url)).ok) break; } catch { /* aguardando */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
  const erros = [];
  async function novaPagina(largura = 1280) {
    const pagina = await navegador.newPage({ viewport: { width: largura, height: 900 } });
    pagina.on("pageerror", (e) => erros.push(`pageerror: ${e.message}`));
    pagina.on("console", (m) => m.type() === "error" && !/404|favicon|Falha ao consultar o CEP|Failed to load resource/.test(m.text()) && erros.push(`console: ${m.text()}`));
    await pagina.goto(url);
    return pagina;
  }
  async function encerrar() {
    await navegador.close();
    try { process.kill(-servidor.pid); } catch { /* já saiu */ }
  }
  return { novaPagina, erros, encerrar };
}

export async function entrar(pagina, email, senha = "senha123") {
  await pagina.getByPlaceholder("voce@empresa.com.br").fill(email);
  await pagina.locator('input[type="password"]').fill(senha);
  await pagina.getByRole("button", { name: "Entrar" }).click();
}

export const sql = (pagina, consulta, params = []) =>
  pagina.evaluate(async ([c, p]) => (await (await window.__db).query(c, p)).rows, [consulta, params]);
