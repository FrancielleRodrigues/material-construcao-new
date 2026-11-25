// Módulo Empresa: cadastro dos dados da loja, permissões e uso no cupom / Fiscal.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { iniciar, entrar, sql } from "./ajuda.mjs";

let app;
before(async () => { app = await iniciar({ porta: 5187 }); });
after(async () => {
  await app.encerrar();
  assert.deepEqual(app.erros, [], "erros no console/página durante os testes");
});

async function logar(email = "admin@teste.com") {
  const p = await app.novaPagina(1280);
  await entrar(p, email);
  await p.getByText("Clientes cadastrados").or(p.getByText("Sem acesso")).or(p.getByText("Venda (PDV)")).first().waitFor({ timeout: 40000 });
  return p;
}
const aba = (p, nome) => p.getByRole("button", { name: nome, exact: true }).first().click();
const um = async (p, consulta) => (await sql(p, consulta))[0];

test("Empresa: preencher, validar, salvar e ver a pendência sumir; Fiscal mostra o resumo", async () => {
  const p = await logar();
  await aba(p, "Empresa");
  await p.getByTestId("empresa-incompleta").getByText(/razão social, CNPJ, endereço completo/).waitFor();

  // validações
  await p.getByRole("button", { name: "Salvar dados da empresa" }).click();
  await p.getByRole("alert").getByText("Preencha a razão social.").waitFor();
  await p.getByPlaceholder("Ex: Minha Empresa Ltda").fill("Construgestão Materiais Ltda");
  const cnpj = p.getByPlaceholder("00.000.000/0000-00");
  await cnpj.pressSequentially("1122233300018199999");
  assert.equal(await cnpj.inputValue(), "11.222.333/0001-81", "máscara e limite de 14 números");
  await cnpj.fill("");
  await cnpj.pressSequentially("112223330001");
  await p.getByRole("button", { name: "Salvar dados da empresa" }).click();
  await p.getByRole("alert").getByText("O CNPJ deve ter 14 números.").waitFor();
  await cnpj.press("End");
  await cnpj.pressSequentially("81");

  const cep = p.getByPlaceholder("00000-000", { exact: true });
  await cep.pressSequentially("291000009999");
  assert.equal(await cep.inputValue(), "29100-000");
  await p.getByPlaceholder("Rua, avenida...").fill("Rua Luciano das Neves");
  await p.getByPlaceholder("Ex: 1200").fill("2418");
  await p.getByPlaceholder("ES", { exact: true }).fill("es");
  await p.locator("label:has-text('Cidade') + input").fill("Vila Velha");
  await p.getByPlaceholder("(00) 00000-0000").pressSequentially("2733334455");
  await p.getByPlaceholder("contato@sualoja.com.br").fill("contato@loja.com.br");
  await p.getByPlaceholder("Ex: Obrigado pela preferência! Volte sempre.").fill("Volte sempre!");
  await p.getByRole("button", { name: "Salvar dados da empresa" }).click();
  await p.getByRole("status").getByText("Salvo").waitFor();
  await p.getByTestId("empresa-completa").waitFor();

  const e = await um(p, "select razao_social, cnpj, telefone, email, mensagem_cupom, endereco from empresa");
  assert.equal(e.razao_social, "Construgestão Materiais Ltda");
  assert.equal(e.cnpj, "11.222.333/0001-81");
  assert.equal(e.telefone, "(27) 3333-4455");
  assert.equal(e.mensagem_cupom, "Volte sempre!");
  assert.deepEqual({ r: e.endereco.logradouro, n: e.endereco.numero, uf: e.endereco.uf, c: e.endereco.cidade }, { r: "Rua Luciano das Neves", n: "2418", uf: "ES", c: "Vila Velha" });

  // o Fiscal passa a mostrar o emitente que veio da Empresa e leva até lá
  await aba(p, "Fiscal");
  await p.getByRole("button", { name: /Configurações/ }).click();
  await p.getByTestId("emitente-resumo").getByText(/Construgestão Materiais Ltda · CNPJ 11\.222\.333\/0001-81/).waitFor();
  await p.getByRole("button", { name: "Abrir dados da empresa" }).click();
  await p.getByTestId("empresa-completa").waitFor();
  await p.close();
});

test("Empresa: o vendedor não vê o módulo, mas o cupom sai com o cabeçalho da empresa", async () => {
  const p = await app.novaPagina(1280);
  await p.evaluate(async () => {
    await (await window.__db).exec(`update empresa set razao_social = 'Loja do Teste Ltda', nome_fantasia = 'Loja do Teste', cnpj = '11.222.333/0001-81'`);
  });
  await entrar(p, "vendedor@teste.com");
  await p.getByRole("button", { name: "Venda (PDV)", exact: true }).first().waitFor({ timeout: 40000 });
  assert.equal(await p.getByRole("button", { name: "Empresa", exact: true }).count(), 0, "vendedor sem acesso ao módulo");
  await p.getByRole("button", { name: "Venda (PDV)", exact: true }).first().click();
  await p.getByRole("button", { name: /Iniciar venda/i }).click();
  await p.getByRole("button", { name: /Continuar sem identificar/i }).click();
  await p.getByPlaceholder(/Bipe ou digite o código/i).fill("7891000100016");
  await p.keyboard.press("Enter");
  await p.locator("main select").selectOption("dinheiro");
  await p.getByRole("button", { name: "Finalizar venda" }).click();
  const texto = await p.getByTestId("cupom-papel").first().innerText();
  assert.match(texto, /LOJA DO TESTE/);
  assert.match(texto, /CNPJ: 11\.222\.333\/0001-81/);
  await p.close();
});

test("Empresa: quem só visualiza vê os dados travados, sem botão de salvar", async () => {
  const p = await app.novaPagina(1280);
  await p.evaluate(async () => {
    const db = await window.__db;
    await db.exec(`update papeis set permissoes = permissoes || '{"empresa":"visualizar"}'::jsonb where id = 'caixa';
                   update empresa set razao_social = 'Somente Leitura Ltda';`);
  });
  await entrar(p, "caixa@teste.com");
  await p.getByRole("button", { name: "Empresa", exact: true }).first().waitFor({ timeout: 40000 });
  await aba(p, "Empresa");
  assert.equal(await p.getByPlaceholder("Ex: Minha Empresa Ltda").inputValue(), "Somente Leitura Ltda");
  assert.equal(await p.getByPlaceholder("Ex: Minha Empresa Ltda").isDisabled(), true);
  assert.equal(await p.getByRole("button", { name: "Salvar dados da empresa" }).count(), 0);
  await p.getByText(/só quem tem permissão de editar o módulo Empresa/).waitFor();
  await p.close();
});
