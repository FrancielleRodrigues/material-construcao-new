import { spawn } from "node:child_process";
import { chromium } from "playwright-core";

// `toque`: simula aparelho de toque (celular); sem ele é computador com mouse (a câmera de leitura não aparece).
// `camera`: arquivo .mjpeg que a câmera falsa do Chromium vai "filmar" (para testar a leitura de códigos).
export async function iniciar({ porta = 5199, camera = null, toque = false } = {}) {
  const servidor = spawn("npx", ["vite", "--config", "e2e/vite.config.js", "--port", String(porta), "--strictPort"], { stdio: "ignore", detached: true });
  const url = `http://localhost:${porta}`;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(url)).ok) break; } catch { /* aguardando */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  const argsCamera = camera
    ? ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${camera}`]
    : [];
  const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium", args: argsCamera });
  const erros = [];
  async function novaPagina(largura = 1280) {
    const contexto = await navegador.newContext({ viewport: { width: largura, height: 900 }, permissions: camera ? ["camera"] : [], hasTouch: toque, isMobile: toque });
    const pagina = await contexto.newPage();
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

// Executa SQL (vários comandos) como superusuário no banco de teste da página.
export const exec = (pagina, texto) =>
  pagina.evaluate(async (t) => { await (await window.__db).exec(t); }, texto);
