// Importação do XML da NF-e de compra: conferência na tela e gravação atômica no banco.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { iniciar, entrar, sql } from "./ajuda.mjs";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const XML = path.join(aqui, "fixtures/nfe-votoran.xml");
let app;
before(async () => { app = await iniciar({ porta: 5194 }); });
after(async () => {
  await app.encerrar();
  assert.deepEqual(app.erros, [], "erros no console/página durante os testes");
});

async function logar(email = "admin@teste.com") {
  const p = await app.novaPagina();
  await entrar(p, email);
  await p.getByText("Clientes cadastrados").or(p.getByText("Sem acesso")).waitFor({ timeout: 40000 });
  return p;
}
const aba = (p, nome) => p.getByRole("button", { name: nome, exact: true }).first().click();
const um = async (p, consulta) => (await sql(p, consulta))[0];

test("Compras: importa o XML, confere os itens, grava tudo e não deixa importar de novo", async () => {
  const p = await logar();
  await aba(p, "Compras");
  const fornecedoresAntes = (await um(p, "select count(*)::int n from fornecedores")).n;
  const estoqueAntes = (await um(p, "select estoque::float e from produtos where nome = 'Cimento CP-II 50kg'")).e;

  await p.getByRole("button", { name: /Importar XML da nota/ }).click();
  await p.getByTestId("arquivo-xml").setInputFiles(XML);

  await p.getByText("Já cadastrado: Votoran Distribuidora de Materiais").waitFor();
  await p.getByTestId("item-nota-1").getByText("Associado automaticamente por código de barras").waitFor();
  await p.getByText("Parcela 1/2").waitFor();
  await p.getByText("Parcela 2/2").waitFor();
  // item 2 é produto novo: sem preço de venda não dá para importar
  const importar = p.getByRole("button", { name: "Importar e dar entrada" });
  assert.equal(await importar.isDisabled(), true);
  await p.getByText('Informe o preço de venda de "Rejunte flexível cinza 1kg".').waitFor();

  // sugere o preço pela margem: custo 4,30 + 30% = 5,59
  await p.getByRole("button", { name: "Sugerir preços" }).click();
  assert.equal(await p.getByLabel("Preço de venda do item 2").inputValue(), "5.59");
  await p.getByLabel("Preço de venda do item 2").fill("9.90");
  assert.equal(await importar.isDisabled(), false);
  await importar.click();

  await p.getByRole("button", { name: "Importar e dar entrada" }).waitFor({ state: "detached", timeout: 15000 });
  await p.locator("main").getByText("NF-e 1234").first().waitFor();

  assert.equal((await um(p, "select count(*)::int n from fornecedores")).n, fornecedoresAntes, "fornecedor já existia");
  assert.deepEqual(
    await um(p, "select status, numero_nota, chave_acesso from pedidos_compra where numero_nota = '1234'"),
    { status: "recebido", numero_nota: "1234", chave_acesso: "32261145678912000133550010000012341000012345" }
  );
  assert.equal((await um(p, "select estoque::float e from produtos where nome = 'Cimento CP-II 50kg'")).e, estoqueAntes + 100);
  assert.deepEqual(
    await um(p, "select estoque::float e, preco::float pr, custo::float c, sku, categoria from produtos where sku = 'REJ1KG'"),
    { e: 20, pr: 9.9, c: 4.3, sku: "REJ1KG", categoria: "cimento" }
  );
  assert.equal((await um(p, "select custo::float c from produtos where nome = 'Cimento CP-II 50kg'")).c, 31);
  assert.deepEqual(
    await sql(p, "select descricao, valor::float v, vencimento::text d from lancamentos where descricao like 'NF-e nº 1234%' order by vencimento"),
    [
      { descricao: "NF-e nº 1234 - parcela 1/2", v: 1593, d: "2026-12-20" },
      { descricao: "NF-e nº 1234 - parcela 2/2", v: 1593, d: "2027-01-19" },
    ]
  );
  assert.equal((await um(p, "select count(*)::int n from movimentacoes where observacao like 'NF-e nº 1234%'")).n, 2);

  // a mesma nota de novo: a conferência já avisa
  await p.getByRole("button", { name: /Importar XML da nota/ }).click();
  await p.getByTestId("arquivo-xml").setInputFiles(XML);
  await p.getByRole("alert").getByText(/Esta nota já foi importada \(pedido nº \d+\)/).waitFor();
  assert.equal(await p.getByRole("button", { name: "Importar e dar entrada" }).isDisabled(), true);
  await p.close();
});

test("Compras: arquivo que não é NF-e dá aviso claro; quem só visualiza não vê o botão", async () => {
  const p = await logar();
  await aba(p, "Compras");
  await p.getByRole("button", { name: /Importar XML da nota/ }).click();
  await p.getByTestId("arquivo-xml").setInputFiles({ name: "x.xml", mimeType: "text/xml", buffer: Buffer.from("<html><body>oi</body></html>") });
  await p.getByRole("alert").getByText("Este arquivo não parece ser o XML de uma NF-e.").waitFor();
  await p.getByTestId("arquivo-xml").setInputFiles({ name: "y.xml", mimeType: "text/xml", buffer: Buffer.from('<?xml version="1.0"?><!DOCTYPE a [<!ENTITY b "c">]><a/>') });
  await p.getByRole("alert").getByText(/DTD/).waitFor();
  assert.equal(await p.getByRole("button", { name: "Importar e dar entrada" }).isDisabled(), true);
  await p.close();

  const c = await logar("caixa@teste.com"); // Compras só para visualizar
  await aba(c, "Compras");
  await c.getByText("Pedidos pendentes").waitFor();
  assert.equal(await c.getByRole("button", { name: /Importar XML da nota/ }).count(), 0);
  await c.close();
});
