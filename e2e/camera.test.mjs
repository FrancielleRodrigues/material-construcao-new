// SKU como segundo código de busca e leitura de código pela câmera (câmera falsa do Chromium
// "filmando" uma imagem com o código EAN-13 7891000100011, o do Cimento).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { iniciar, entrar, sql } from "./ajuda.mjs";

const aqui = path.dirname(fileURLToPath(import.meta.url));
let app;
before(async () => {
  app = await iniciar({ porta: 5197, camera: path.join(aqui, "fixtures/ean-7891000100011.mjpeg") });
});
after(async () => {
  await app.encerrar();
  assert.deepEqual(app.erros, [], "erros no console/página durante os testes");
});

async function logar() {
  const p = await app.novaPagina();
  await entrar(p, "admin@teste.com");
  await p.getByText("Clientes cadastrados").waitFor({ timeout: 40000 });
  return p;
}
const aba = (p, nome) => p.getByRole("button", { name: nome, exact: true }).first().click();
const um = async (p, consulta) => (await sql(p, consulta))[0];

test("Cadastro: exige código de barras ou SKU; aceita só SKU; SKU repetido dá aviso", async () => {
  const p = await logar();
  await aba(p, "Produtos");
  await p.getByRole("button", { name: /Novo|Nova/ }).first().click();
  await p.getByPlaceholder("Ex: Cimento CP-II 50kg").fill("Areia média m³");
  await p.getByPlaceholder("0,00").first().fill("120");
  await p.getByRole("button", { name: "Salvar" }).click();
  await p.getByText("Informe o código de barras ou o SKU").waitFor();
  assert.equal((await um(p, "select count(*)::int n from produtos where nome = 'Areia média m³'")).n, 0);

  await p.getByPlaceholder("Ex: CIM-CP2-50").fill("ARE-01");
  await p.getByRole("button", { name: "Salvar" }).click();
  await p.locator("main").getByText("Areia média m³").first().waitFor({ timeout: 15000 });
  assert.deepEqual(await um(p, "select sku, codigo_barras from produtos where nome = 'Areia média m³'"), { sku: "ARE-01", codigo_barras: null });

  await p.getByRole("button", { name: /Novo|Nova/ }).first().click();
  await p.getByPlaceholder("Ex: Cimento CP-II 50kg").fill("Areia fina");
  await p.getByPlaceholder("0,00").first().fill("100");
  await p.getByPlaceholder("Ex: CIM-CP2-50").fill("are-01");
  await p.getByRole("button", { name: "Salvar" }).click();
  await p.getByRole("alert").getByText("Já existe um produto com este SKU.").waitFor({ timeout: 15000 });
  await p.close();
});

test("Cadastro: câmera lê o código e preenche o campo; Esc fecha só a câmera", async () => {
  const p = await logar();
  await aba(p, "Produtos");
  await p.getByRole("button", { name: /Novo|Nova/ }).first().click();
  await p.getByPlaceholder("Ex: Cimento CP-II 50kg").fill("Produto da câmera");

  await p.getByRole("button", { name: "Ler código de barras com a câmera" }).click();
  await p.getByTestId("leitor-camera").waitFor();
  await p.waitForFunction(() => document.querySelector('[data-testid="leitor-camera"]') === null, null, { timeout: 30000 });
  assert.equal(await p.getByPlaceholder("Bipe ou digite o código").inputValue(), "7891000100011");

  // Esc na câmera fecha só a câmera: o formulário e o que foi digitado continuam
  await p.getByRole("button", { name: "Ler SKU com a câmera" }).click();
  await p.getByTestId("leitor-camera").waitFor();
  await p.keyboard.press("Escape");
  await p.getByTestId("leitor-camera").waitFor({ state: "detached" });
  assert.equal(await p.getByPlaceholder("Ex: Cimento CP-II 50kg").inputValue(), "Produto da câmera");
  await p.close();
});

test("PDV: acha o produto por SKU (sem diferenciar maiúsculas) e pela câmera (modo contínuo)", async () => {
  const p = await logar();
  // dá ao Cimento um EAN válido e um SKU, pelo próprio cadastro
  await aba(p, "Produtos");
  await p.locator("main tr").filter({ hasText: "Cimento CP-II 50kg" }).locator("button").first().click();
  await p.getByPlaceholder("Bipe ou digite o código").fill("7891000100011");
  await p.getByPlaceholder("Ex: CIM-CP2-50").fill("CIM-50");
  await p.getByRole("button", { name: "Salvar" }).click();
  await p.waitForFunction(async () => (await (await window.__db).query("select sku from produtos where nome = 'Cimento CP-II 50kg'")).rows[0].sku === "CIM-50");
  await aba(p, "Venda (PDV)");
  await p.getByRole("button", { name: /Iniciar venda/i }).click();
  await p.getByRole("button", { name: /Continuar sem identificar/i }).click();

  const campo = p.getByPlaceholder("Bipe ou digite o código de barras ou SKU");
  await campo.fill("cim-50");
  await p.getByRole("button", { name: "Adicionar" }).click();
  await p.locator("main").getByText("Cimento CP-II 50kg").first().waitFor();
  await campo.fill("nao-existe");
  await campo.press("Enter");
  await p.getByText('Produto não encontrado para "nao-existe".').waitFor();

  await p.getByRole("button", { name: "Ler código com a câmera" }).click();
  await p.getByTestId("leitor-camera").waitFor();
  await p.getByRole("status").getByText("1x Cimento CP-II 50kg adicionado").waitFor({ timeout: 30000 });
  // continua aberta (modo contínuo) e o mesmo código na frente da câmera não soma de novo a cada quadro
  await p.waitForTimeout(1500);
  assert.equal(await p.getByTestId("leitor-camera").count(), 1);
  await p.keyboard.press("Escape");
  await p.getByTestId("leitor-camera").waitFor({ state: "detached" });
  // 1 pelo SKU + 1 pela câmera = 2 sacos no carrinho
  await p.locator("main").getByText(/^2$/).first().waitFor();
  await p.close();
});
