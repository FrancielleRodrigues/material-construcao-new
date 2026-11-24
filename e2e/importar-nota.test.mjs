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
  assert.equal(await p.getByLabel("SKU do item 2").inputValue(), "", "o código do fornecedor não vira SKU");
  await p.getByLabel("SKU do item 2").fill("REJ-CINZA");
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
    await um(p, "select estoque::float e, preco::float pr, custo::float c, sku, categoria from produtos where sku = 'REJ-CINZA'"),
    { e: 20, pr: 9.9, c: 4.3, sku: "REJ-CINZA", categoria: "cimento" }
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

test("Compras: nota de balcão com linhas repetidas e sem duplicatas (SKU gerado, já paga)", async () => {
  const p = await logar();
  await aba(p, "Compras");
  await p.getByRole("button", { name: /Importar XML da nota/ }).click();
  await p.getByTestId("arquivo-xml").setInputFiles(path.join(aqui, "fixtures/nfe-balcao-duplicado.xml"));
  await p.getByText("Itens (3)").waitFor();
  await p.getByTestId("item-nota-1").getByText("Juntei as linhas 1 e 2 da nota").waitFor();
  await p.getByText("A nota não traz duplicatas").waitFor();
  await p.getByText("Será cadastrado como novo fornecedor").waitFor();
  await p.getByRole("checkbox", { name: "Já foi paga (compra à vista)" }).check();
  for (const n of [1, 2, 3]) await p.getByLabel(`Preço de venda do item ${n}`).fill("50");
  await p.getByRole("button", { name: "Importar e dar entrada" }).click();
  await p.getByRole("button", { name: "Importar e dar entrada" }).waitFor({ state: "detached", timeout: 15000 });

  const prods = await sql(p, "select nome, estoque::float e, sku, codigo_barras from produtos where nome like 'REJUNTE RESINADO%' or nome like 'VEDA TUDO%' or nome like 'ESG ANEL%' order by nome");
  assert.deepEqual(prods.map((x) => [x.nome, x.e, x.codigo_barras]), [["ESG ANEL 100MM", 2, null], ["REJUNTE RESINADO BEGE 1KG", 2, null], ["VEDA TUDO 100G", 1, null]]);
  assert.ok(prods.every((x) => /^P\d{5}$/.test(x.sku)), "SKU gerado pelo sistema, não o código do fornecedor");
  assert.deepEqual(await um(p, "select pago, valor::float v from lancamentos where descricao = 'NF-e nº 304'"), { pago: true, v: 71.1 });
  assert.equal((await um(p, "select tipo from fornecedores where documento = '11.222.333/0001-81'")).tipo, "PJ");
  await p.close();
});

test("Compras: segunda nota do mesmo fornecedor com o mesmo produto só soma no estoque (vínculo pelo código dele)", async () => {
  const p = await logar();
  await aba(p, "Compras");
  const enviar = async (arquivo) => {
    await p.getByRole("button", { name: /Importar XML da nota/ }).click();
    await p.getByTestId("arquivo-xml").setInputFiles(path.join(aqui, "fixtures", arquivo));
  };

  // 1ª nota: o item 2 (código REJ1KG do fornecedor) é cadastrado como produto novo
  await enviar("nfe-votoran.xml");
  await p.getByTestId("item-nota-2").getByLabel("Preço de venda do item 2").fill("9.90");
  await p.getByRole("button", { name: "Importar e dar entrada" }).click();
  await p.getByRole("button", { name: "Importar e dar entrada" }).waitFor({ state: "detached", timeout: 15000 });
  const produtosDepois1 = (await um(p, "select count(*)::int n from produtos")).n;
  assert.equal((await um(p, "select count(*)::int n from produtos_codigo_fornecedor")).n, 2, "guardou os dois códigos do fornecedor");

  // 2ª nota, outro nome na nota: reconhece pelo código do fornecedor, sem pedir preço nem cadastrar de novo
  await enviar("nfe-votoran-2.xml");
  const item = p.getByTestId("item-nota-1");
  await item.getByText("Associado automaticamente por código do fornecedor (já importado antes)").waitFor();
  assert.equal(await item.getByLabel("Preço de venda do item 1").count(), 0, "não pede preço: o produto já existe");
  assert.equal(await p.getByRole("button", { name: "Importar e dar entrada" }).isDisabled(), false);
  await p.getByRole("button", { name: "Importar e dar entrada" }).click();
  await p.getByRole("button", { name: "Importar e dar entrada" }).waitFor({ state: "detached", timeout: 15000 });

  assert.equal((await um(p, "select count(*)::int n from produtos")).n, produtosDepois1, "nenhum produto novo");
  assert.deepEqual(
    await um(p, "select estoque::float e, custo::float c from produtos where sku = 'REJ-CINZA' or nome = 'Rejunte flexível cinza 1kg'"),
    { e: 30, c: 4.5 },
    "20 da 1ª nota + 10 da 2ª; custo atualizado com 45,00/10"
  );
  await p.close();
});
