// No computador (mouse) não há câmera: só o leitor de código de barras USB (que digita como teclado).
// No celular/tablet (toque) aparece o botão "Escanear" (ver camera.test.mjs).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { iniciar, entrar } from "./ajuda.mjs";

let app;
before(async () => { app = await iniciar({ porta: 5183 }); });
after(async () => {
  await app.encerrar();
  assert.deepEqual(app.erros, [], "erros no console/página durante os testes");
});

test("Computador: cadastro e PDV não oferecem a câmera; o campo aceita o código digitado pelo leitor", async () => {
  const p = await app.novaPagina(1280);
  await entrar(p, "admin@teste.com");
  await p.getByText("Clientes cadastrados").waitFor({ timeout: 40000 });
  await p.getByRole("button", { name: "Produtos", exact: true }).first().click();
  await p.getByRole("button", { name: /Novo|Nova/ }).first().click();
  const campo = p.getByPlaceholder("Digite ou escaneie");
  await campo.waitFor();
  assert.equal(await p.getByRole("button", { name: /câmera/ }).count(), 0);
  await p.getByText("passe o leitor de código de barras").waitFor();
  await campo.fill("7891000100011"); // o leitor USB "digita" o código
  assert.equal(await campo.inputValue(), "7891000100011");
  await p.keyboard.press("Escape");

  await p.getByRole("button", { name: "Venda (PDV)", exact: true }).first().click();
  await p.getByRole("button", { name: /Iniciar venda/ }).click();
  await p.getByRole("button", { name: "Continuar sem identificar cliente" }).click();
  await p.getByPlaceholder("Bipe ou digite o código de barras ou SKU").waitFor();
  assert.equal(await p.getByRole("button", { name: /câmera/ }).count(), 0);
  await p.close();
});
