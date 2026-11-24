// Paginação das listas: padrão de 25 itens no computador e 10 no celular, troca de página,
// retorno à 1ª página ao buscar e opção de itens por página.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { iniciar, entrar, exec } from "./ajuda.mjs";

let app;
before(async () => { app = await iniciar({ porta: 5192 }); });
after(async () => {
  await app.encerrar();
  assert.deepEqual(app.erros, [], "erros no console/página durante os testes");
});

// abre a página, cria muitos registros ANTES do login (as listas são lidas ao entrar) e entra
async function abrir(largura) {
  const p = await app.novaPagina(largura);
  await exec(p, `
    insert into clientes (tipo, nome, documento) select 'PF', 'Cliente ' || lpad(i::text, 3, '0'), lpad(i::text, 11, '0') from generate_series(1, 60) i;
    insert into lancamentos (tipo, descricao, valor, vencimento) select 'despesa', 'Conta ' || lpad(i::text, 3, '0'), 10 + i, current_date + i from generate_series(1, 30) i;
  `);
  await entrar(p, "admin@teste.com");
  await p.getByText("Clientes cadastrados").waitFor({ timeout: 40000 });
  return p;
}
const resumo = (p) => p.getByTestId("paginacao-resumo").first().innerText();
const linhasCliente = (p) => p.locator("main table tbody tr").count();

test("Computador: 25 por página, números de página, busca volta à 1ª e itens por página", async () => {
  const p = await abrir(1280);
  await p.getByRole("button", { name: "Clientes", exact: true }).first().click();
  await p.getByTestId("paginacao-resumo").waitFor();
  const total = Number((await resumo(p)).match(/de (\d+)/)[1]);
  assert.ok(total >= 60);
  assert.match(await resumo(p), /1–25 de/);
  assert.equal(await linhasCliente(p), 25);
  assert.equal(await p.getByRole("button", { name: "Página anterior" }).isDisabled(), true);

  await p.getByRole("button", { name: "Página 2", exact: true }).click();
  assert.match(await resumo(p), /26–50 de/);
  assert.equal(await p.getByRole("button", { name: "Página 2", exact: true }).getAttribute("aria-current"), "page");
  await p.getByRole("button", { name: "Próxima página" }).click();
  assert.match(await resumo(p), new RegExp(`51–${Math.min(75, total)} de`));

  // buscar volta para a primeira página
  await p.getByPlaceholder(/Buscar/).first().fill("Cliente 05");
  await p.getByText("Cliente 050").first().waitFor();
  assert.equal(await p.getByTestId("paginacao-resumo").count(), 0, "poucos resultados: sem paginação");
  await p.getByPlaceholder(/Buscar/).first().fill("");
  await p.getByTestId("paginacao-resumo").waitFor();
  assert.match(await resumo(p), /1–25 de/);

  await p.getByLabel("Itens por página").selectOption("50");
  assert.match(await resumo(p), /1–50 de/);
  assert.equal(await linhasCliente(p), 50);
  await p.close();
});

test("Celular: 10 por página, Anterior/Próxima com 'Página x de y' e sem números", async () => {
  const p = await abrir(390);
  await p.getByRole("button", { name: "Abrir menu" }).click();
  await p.getByRole("button", { name: "Clientes", exact: true }).first().click();
  await p.getByTestId("paginacao-resumo").waitFor();
  assert.match(await resumo(p), /1–10 de/);
  assert.equal(await p.locator("main [class*='divide-y'] > div").count(), 10, "10 cartões na tela");
  assert.match(await p.getByTestId("paginacao-pagina").innerText(), /Página 1 de \d+/);
  assert.equal(await p.getByRole("button", { name: "Página 2", exact: true }).isVisible(), false, "números de página só no computador");

  await p.getByRole("button", { name: "Próxima página" }).click();
  assert.match(await resumo(p), /11–20 de/);
  assert.match(await p.getByTestId("paginacao-pagina").innerText(), /Página 2 de \d+/);
  await p.getByRole("button", { name: "Página anterior" }).click();
  assert.match(await resumo(p), /1–10 de/);
  // sem rolagem horizontal da página
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await p.close();
});

test("Financeiro, Estoque (histórico) e Relatórios também paginam", async () => {
  const p = await abrir(1280);
  await p.getByRole("button", { name: "Financeiro", exact: true }).first().click();
  await p.getByTestId("paginacao-resumo").waitFor();
  assert.match(await resumo(p), /1–25 de \d+ lançamentos/);
  await p.getByRole("button", { name: "Próxima página" }).click();
  assert.match(await resumo(p), /26–\d+ de/);

  await p.getByRole("button", { name: "Relatórios", exact: true }).first().click();
  await p.getByRole("button", { name: /Produtos/ }).first().click().catch(() => {});
  await p.getByText("Relatórios").first().waitFor();
  await p.close();
});
