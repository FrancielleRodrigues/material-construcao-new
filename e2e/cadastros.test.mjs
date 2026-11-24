// Máscaras automáticas (CPF/CNPJ, telefone, CEP), limites de tamanho e ponto de referência do cliente.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { iniciar, entrar, sql } from "./ajuda.mjs";

let app;
before(async () => { app = await iniciar({ porta: 5190 }); });
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
const novo = (p) => p.getByRole("button", { name: /Novo|Nova/ }).first().click();

test("Cliente: máscara e limite de CPF/CNPJ e telefone, validação de tamanho e ponto de referência", async () => {
  const p = await logar();
  await aba(p, "Clientes");
  await novo(p);
  const doc = p.getByPlaceholder("000.000.000-00");
  const tel = p.getByPlaceholder("(00) 00000-0000");

  await p.getByPlaceholder("Ex: Construtora Horizonte Ltda").fill("Maria da Obra");
  await doc.pressSequentially("12345678");
  assert.equal(await doc.inputValue(), "123.456.78");
  await doc.fill("");
  await doc.pressSequentially("123456789012345678"); // digita demais
  assert.equal(await doc.inputValue(), "123.456.789-01", "CPF corta em 11 números");
  await doc.fill("");
  await doc.pressSequentially("1234567890"); // 10 números: incompleto
  await tel.pressSequentially("27999990000999");
  assert.equal(await tel.inputValue(), "(27) 99999-0000", "telefone corta em 11 números");
  await p.getByRole("button", { name: "Continuar" }).click();
  await p.getByText("O CPF deve ter 11 números.").waitFor();

  // trocar para pessoa jurídica reaplica a máscara de CNPJ nos mesmos números
  await p.getByRole("button", { name: "Pessoa jurídica" }).click();
  const cnpj = p.getByPlaceholder("00.000.000/0000-00");
  assert.equal(await cnpj.inputValue(), "12.345.678/90");
  await cnpj.fill("");
  await cnpj.pressSequentially("98765432000199");
  assert.equal(await cnpj.inputValue(), "98.765.432/0001-99");
  await tel.fill("");
  await tel.pressSequentially("273333");
  assert.equal(await tel.inputValue(), "(27) 3333");
  await p.getByRole("button", { name: "Continuar" }).click();
  await p.getByText("O telefone deve ter DDD + 8 ou 9 números.").waitFor();
  await tel.fill("");
  await tel.pressSequentially("2733334455");
  assert.equal(await tel.inputValue(), "(27) 3333-4455");
  await p.getByRole("button", { name: "Continuar" }).click(); // etapa fiscal
  await p.getByRole("button", { name: "Continuar" }).click(); // etapa endereço

  const cep = p.getByPlaceholder("00000-000");
  await cep.pressSequentially("291000009999");
  assert.equal(await cep.inputValue(), "29100-000", "CEP corta em 8 números");
  await p.getByPlaceholder("Ex: 1200").fill("55");
  await p.getByPlaceholder("Preenchido automaticamente pelo CEP").first().fill("Rua do Teste");
  await p.getByPlaceholder("Ex: ao lado da padaria Pão Quente, portão azul").fill("Em frente à praça, portão azul");
  await p.getByRole("button", { name: "Salvar cliente" }).click();
  await p.locator("main").getByText("Maria da Obra").first().waitFor({ timeout: 15000 });

  const c = (await sql(p, "select tipo, documento, telefone, endereco from clientes where nome = 'Maria da Obra'"))[0];
  assert.equal(c.tipo, "PJ");
  assert.equal(c.documento, "98.765.432/0001-99");
  assert.equal(c.telefone, "(27) 3333-4455");
  assert.equal(c.endereco.referencia, "Em frente à praça, portão azul");

  // editar: o ponto de referência volta preenchido
  await p.locator("main tr").filter({ hasText: "Maria da Obra" }).locator("button").first().click();
  await p.getByRole("button", { name: "Continuar" }).click();
  await p.getByRole("button", { name: "Continuar" }).click();
  assert.equal(await p.getByPlaceholder("Ex: ao lado da padaria Pão Quente, portão azul").inputValue(), "Em frente à praça, portão azul");
  await p.close();
});

test("Fornecedor, PDV e Fiscal: mesma máscara e limite", async () => {
  const p = await logar();
  await aba(p, "Fornecedores");
  await novo(p);
  const cnpj = p.getByPlaceholder("00.000.000/0000-00");
  await cnpj.pressSequentially("1122233300018199");
  assert.equal(await cnpj.inputValue(), "11.222.333/0001-81");
  await p.getByRole("button", { name: "Pessoa física" }).click();
  assert.equal(await p.getByPlaceholder("000.000.000-00").inputValue(), "112.223.330-00");
  await p.getByPlaceholder("(00) 00000-0000").pressSequentially("27999");
  assert.equal(await p.getByPlaceholder("(00) 00000-0000").inputValue(), "(27) 999");
  await p.keyboard.press("Escape");

  await aba(p, "Venda (PDV)");
  await p.getByRole("button", { name: /Iniciar venda/i }).click();
  const docPdv = p.getByPlaceholder(/Digite o CPF/i);
  await docPdv.pressSequentially("12345678901");
  assert.equal(await docPdv.inputValue(), "123.456.789-01");
  await docPdv.pressSequentially("2");
  assert.equal(await docPdv.inputValue(), "12.345.678/9012", "passou de 11 números: vira CNPJ");
  await docPdv.pressSequentially("34999");
  assert.equal(await docPdv.inputValue(), "12.345.678/9012-34", "CNPJ corta em 14 números");
  await p.close();
});
