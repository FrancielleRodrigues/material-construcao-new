import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DOMParser } from "@xmldom/xmldom";
import { lerNfe, conferirNota, montarPayload } from "./nfe.js";

const xml = readFileSync(new URL("../../../e2e/fixtures/nfe-votoran.xml", import.meta.url), "utf8");
const ler = (texto = xml) => lerNfe(texto, DOMParser);

test("lê fornecedor, cabeçalho, itens e parcelas", () => {
  const r = ler();
  assert.equal(r.ok, true);
  const n = r.nota;
  assert.equal(n.chave, "32261145678912000133550010000012341000012345");
  assert.equal(n.numero, "1234");
  assert.equal(n.serie, "1");
  assert.equal(n.emissao, "2026-11-20");
  assert.equal(n.fornecedor.documento, "45678912000133");
  assert.equal(n.fornecedor.nome, "Votoran Distribuidora de Materiais Ltda");
  assert.equal(n.fornecedor.telefone, "(27) 3333-4455");
  assert.deepEqual(n.fornecedor.endereco, { cep: "29100-000", logradouro: "Rod. do Sol", numero: "500", complemento: "", bairro: "Distrito Industrial", cidade: "Vila Velha", uf: "ES" });
  assert.equal(n.destinatario, "11222333000181");
  assert.equal(n.itens.length, 2);
  assert.deepEqual(n.parcelas, [
    { numero: "001", vencimento: "2026-12-20", valor: 1593 },
    { numero: "002", vencimento: "2027-01-19", valor: 1593 },
  ]);
  assert.equal(n.totalNota, 3186);
  assert.deepEqual(n.avisos, []);
});

test("itens: código de barras só quando é GTIN de verdade e custo inclui frete e IPI", () => {
  const [cimento, rejunte] = ler().nota.itens;
  assert.equal(cimento.codigoBarras, "7891000100016");
  assert.equal(cimento.codigo, "CIM50");
  assert.equal(cimento.unidade, "sc");
  assert.equal(cimento.quantidade, 100);
  assert.equal(cimento.custoUnitario, 31); // sem frete/IPI próprios
  assert.equal(rejunte.codigoBarras, "", '"SEM GTIN" não é código de barras');
  // 80,00 + frete 2,00 + IPI 4,00 = 86,00 por 20 unidades
  assert.equal(rejunte.custoTotal, 86);
  assert.equal(rejunte.custoUnitario, 4.3);
});

test("o custo dos itens fecha com o total da nota, mesmo com frete só no total", () => {
  const semFreteNoItem = xml.replace("<vFrete>2.00</vFrete><indTot>1</indTot>", "<indTot>1</indTot>");
  const n = ler(semFreteNoItem).nota;
  assert.equal(Math.round(n.itens.reduce((s, i) => s + i.custoTotal, 0) * 100) / 100, 3186);
  // o frete de 2,00 foi rateado pelos dois itens, proporcional ao valor
  assert.ok(n.itens[0].custoTotal > 3100);
});

test("recusa o que não é NF-e utilizável", () => {
  assert.match(ler("").erro, /vazio/);
  assert.match(ler("não é xml").erro, /XML válido|NF-e/);
  assert.match(ler("<html><body>oi</body></html>").erro, /não parece ser/);
  assert.match(ler('<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "b">]><x/>').erro, /DTD/);
  assert.match(ler(xml.replace("<mod>55</mod>", "<mod>65</mod>")).erro, /modelo 55/);
  assert.match(ler(xml.replace("<cStat>100</cStat>", "<cStat>101</cStat>")).erro, /não está autorizada/);
  assert.match(ler(xml.replace(/<CNPJ>45678912000133<\/CNPJ>/, "")).erro, /CNPJ\/CPF/);
  assert.match(ler(xml.replace(/<det[\s\S]*<\/det>/, "")).erro, /sem itens|não tem itens/);
  assert.match(ler(xml.replace("Id=\"NFe32261145678912000133550010000012341000012345\"", "Id=\"NFe123\"")).erro, /chave/i);
});

test("sem protocolo de autorização vira aviso (não erro); nota de entrada também avisa", () => {
  const semProt = ler(xml.replace(/<protNFe[\s\S]*<\/protNFe>/, ""));
  assert.equal(semProt.ok, true);
  assert.match(semProt.nota.avisos[0], /protocolo/);
  assert.match(ler(xml.replace("<tpNF>1</tpNF>", "<tpNF>0</tpNF>")).nota.avisos[0], /ENTRADA/);
});

const produtos = [
  { id: 1, nome: "Cimento CP-II 50kg", codigoBarras: "7891000100016", sku: "" },
  { id: 2, nome: "Rejunte Flexível CINZA 1kg", codigoBarras: "", sku: "" },
  { id: 3, nome: "Outro", codigoBarras: "", sku: "rej1kg" },
];

test("conferir: casa por código de barras, depois SKU = código do fornecedor, depois nome", () => {
  const nota = ler().nota;
  const c = conferirNota(nota, { produtos, fornecedores: [{ id: 9, documento: "45.678.912/0001-33" }] });
  assert.equal(c.fornecedorExistente.id, 9);
  assert.deepEqual(c.itens.map((i) => [i.produtoId, i.casou]), [[1, "código de barras"], [3, "SKU"]]);
  const porNome = conferirNota(nota, { produtos: [produtos[0], produtos[1]] });
  assert.deepEqual(porNome.itens.map((i) => [i.produtoId, i.casou]), [[1, "código de barras"], [2, "nome"]]);
  const nada = conferirNota(nota, { produtos: [] });
  assert.deepEqual(nada.itens.map((i) => i.produtoId), [null, null]);
  assert.equal(nada.fornecedorExistente, null);
});

test("conferir: avisa quando o destinatário não é o CNPJ da empresa", () => {
  const nota = ler().nota;
  assert.equal(conferirNota(nota, { cnpjEmpresa: "11.222.333/0001-81" }).avisos.length, 0);
  assert.match(conferirNota(nota, { cnpjEmpresa: "99.999.999/0001-99" }).avisos[0], /destinatário/);
  assert.equal(conferirNota(nota, { cnpjEmpresa: "" }).avisos.length, 0, "empresa sem CNPJ cadastrado não gera aviso");
});

test("payload: produto existente vai por id; novo vai com dados e preço informado", () => {
  const c = conferirNota(ler().nota, { produtos: [produtos[0]] });
  const p = montarPayload(c, { atualizarCusto: false, categoria: "acabamento", ajustes: { 2: { preco: "9.9" } } });
  assert.equal(p.chave, c.chave);
  assert.equal(p.atualizar_custo, false);
  assert.deepEqual(p.itens[0], { nome: "Cimento CP-II 50kg", quantidade: 100, preco_unitario: 31, produto_id: 1 });
  // o código do fornecedor (REJ1KG) NÃO vira SKU: o SKU é da loja e, em branco, o banco gera
  assert.deepEqual(p.itens[1].novo_produto, { nome: "Rejunte flexível cinza 1kg", unidade: "un", categoria: "acabamento", preco: 9.9, codigo_barras: null, sku: null });
  const comCodigos = montarPayload(c, { ajustes: { 2: { preco: "9.9", sku: " REJ-LOJA ", codigoBarras: "7890000000001" } } });
  assert.equal(comCodigos.itens[1].novo_produto.sku, "REJ-LOJA");
  assert.equal(comCodigos.itens[1].novo_produto.codigo_barras, "7890000000001");
  assert.equal(montarPayload(c, { jaPago: true }).ja_pago, true);
  assert.equal(p.itens[1].produto_id, null);
  assert.equal(p.parcelas.length, 2);
  // o usuário pode trocar a associação
  const trocado = montarPayload(c, { ajustes: { 2: { produtoId: 2 } } });
  assert.equal(trocado.itens[1].produto_id, 2);
  assert.equal(trocado.itens[1].novo_produto, undefined);
});

test("linhas repetidas do mesmo produto são juntas numa só (quantidade e custo somados)", () => {
  const dup = readFileSync(new URL("../../../e2e/fixtures/nfe-balcao-duplicado.xml", import.meta.url), "utf8");
  const r = lerNfe(dup, DOMParser);
  assert.equal(r.ok, true);
  const n = r.nota;
  assert.equal(n.itens.length, 3, "4 linhas na nota, 3 produtos");
  const rejunte = n.itens[0];
  assert.equal(rejunte.codigo, "1207");
  assert.equal(rejunte.quantidade, 2);
  assert.equal(rejunte.custoTotal, 40.5);
  assert.equal(rejunte.custoUnitario, 20.25);
  assert.deepEqual(rejunte.linhasNota, [1, 2]);
  assert.deepEqual(n.itens.map((i) => i.n), [1, 2, 3], "numeração segue a lista agrupada");
  assert.equal(Math.round(n.itens.reduce((s, i) => s + i.custoTotal, 0) * 100) / 100, 71.1, "continua fechando com o total da nota");
  assert.equal(n.totalNota, 71.1);
  assert.deepEqual(n.parcelas, [], "sem duplicatas (venda de balcão)");
  assert.equal(n.itens[0].codigoBarras, "", "SEM GTIN não é código de barras");
});
