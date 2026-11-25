// Quem só tem acesso para visualizar não vê botões de incluir, alterar, excluir nem de ações
// (marcar como pago, registrar recebimento etc.). O perfil "Caixa" do teste só visualiza Clientes,
// Fornecedores, Compras, Produtos, Estoque, Entregas e Fiscal, mas edita Financeiro e Venda.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { iniciar, entrar } from "./ajuda.mjs";

let app;
before(async () => { app = await iniciar({ porta: 5182 }); });
after(async () => {
  await app.encerrar();
  assert.deepEqual(app.erros, [], "erros no console/página durante os testes");
});

async function logar(email, largura = 1280) {
  const p = await app.novaPagina(largura);
  await entrar(p, email);
  await p.getByRole("button", { name: "Venda (PDV)", exact: true }).first().waitFor({ timeout: 40000 });
  return p;
}
const aba = (p, nome) => p.getByRole("button", { name: nome, exact: true }).first().click();
const quantos = (p, seletor) => p.locator(seletor).count();
// botões de ação dentro da lista da tela (ícones de lápis/lixeira têm só SVG, então contamos pelo ícone)
const icones = (p, nome) => p.locator(`main button:has(svg.lucide-${nome})`).count();

test("Só visualizar: Clientes, Fornecedores e Produtos sem Novo, editar nem excluir (computador)", async () => {
  const p = await logar("caixa@teste.com");
  for (const [nomeAba, texto] of [["Clientes", "Horizonte"], ["Fornecedores", "Votoran"], ["Produtos", "Cimento"]]) {
    await aba(p, nomeAba);
    await p.locator("main").getByText(new RegExp(texto)).first().waitFor();
    await p.getByTestId("selo-somente-leitura").waitFor();
    assert.equal(await p.getByRole("button", { name: /^\+?\s*Nov[oa]$/ }).count(), 0, `${nomeAba}: sem botão Novo`);
    assert.equal(await icones(p, "pencil"), 0, `${nomeAba}: sem lápis`);
    assert.equal(await icones(p, "trash-2"), 0, `${nomeAba}: sem lixeira`);
  }
  await p.close();
});

test("Só visualizar: Compras, Estoque, Entregas e Fiscal sem ações", async () => {
  const p = await logar("caixa@teste.com");

  await aba(p, "Compras");
  await p.locator("main").getByText(/Pedido nº 5001/).first().waitFor();
  assert.equal(await p.getByRole("button", { name: /Registrar recebimento/ }).count(), 0);
  assert.equal(await p.getByRole("button", { name: /Importar XML/ }).count(), 0);
  assert.equal(await icones(p, "pencil") + (await icones(p, "trash-2")), 0, "Compras: sem editar/excluir");

  await aba(p, "Estoque");
  await p.locator("main").getByText(/Cimento/).first().waitFor();
  assert.equal(await p.getByRole("button", { name: "Movimentar" }).count(), 0, "Estoque: sem Movimentar");
  assert.equal(await p.getByRole("button", { name: /Nova movimentação/ }).count(), 0);

  await aba(p, "Entregas");
  await p.locator("main").getByText(/Rio das Ostras|Palmeiras|Pendente|pendente/).first().waitFor();
  assert.equal(await p.getByRole("button", { name: /Sair para entrega|Confirmar entrega/ }).count(), 0);
  assert.equal(await icones(p, "pencil") + (await icones(p, "package-x")), 0, "Entregas: sem editar/cancelar");

  await aba(p, "Fiscal");
  await p.getByText(/Venda nº/).first().waitFor();
  assert.equal(await p.getByRole("button", { name: /Gerar rascunho/ }).count(), 0, "Fiscal: sem gerar rascunho");
  await p.getByRole("button", { name: /Configurações/ }).click();
  await p.getByText("Você só pode visualizar estas configurações.").waitFor();
  assert.equal(await p.getByRole("button", { name: "Salvar configurações" }).count(), 0);
  assert.equal(await p.getByRole("combobox").first().isDisabled(), true, "campos da configuração travados");
  await p.close();
});

test("Quem edita continua vendo tudo: Financeiro do Caixa tem os botões e não tem o selo", async () => {
  const p = await logar("caixa@teste.com");
  await aba(p, "Financeiro");
  await p.locator("main tr").first().waitFor();
  assert.equal(await p.getByTestId("selo-somente-leitura").count(), 0);
  assert.ok(await icones(p, "pencil") > 0, "tem editar");
  assert.ok(await icones(p, "trash-2") > 0, "tem excluir");
  assert.ok(await p.getByRole("button", { name: "Marcar como pago" }).count() > 0, "tem marcar como pago");

  // e o admin continua com tudo nas telas que o Caixa só visualiza
  const a = await logar("admin@teste.com");
  await aba(a, "Clientes");
  await a.locator("main").getByText(/Horizonte/).first().waitFor();
  assert.ok(await icones(a, "pencil") > 0 && await icones(a, "trash-2") > 0);
  assert.equal(await a.getByTestId("selo-somente-leitura").count(), 0);
  await a.close();
  await p.close();
});

test("Só visualizar no celular: cartões sem botões de editar/excluir e com o selo", async () => {
  const p = await app.novaPagina(390);
  await entrar(p, "caixa@teste.com");
  await p.getByRole("button", { name: "Abrir menu" }).waitFor({ timeout: 40000 });
  await p.getByRole("button", { name: "Abrir menu" }).click();
  await aba(p, "Clientes");
  await p.locator("main p:visible", { hasText: /Horizonte/ }).first().waitFor(); // o cartão do celular (a tabela fica escondida)
  await p.getByTestId("selo-somente-leitura").waitFor();
  assert.equal(await icones(p, "pencil"), 0);
  assert.equal(await icones(p, "trash-2"), 0);
  // quem edita (admin) vê os botões no celular
  const a = await app.novaPagina(390);
  await entrar(a, "admin@teste.com");
  await a.getByRole("button", { name: "Abrir menu" }).waitFor({ timeout: 40000 });
  await a.getByRole("button", { name: "Abrir menu" }).click();
  await aba(a, "Clientes");
  await a.locator("main p:visible", { hasText: /Horizonte/ }).first().waitFor();
  assert.ok(await icones(a, "pencil") > 0);
  await a.close();
  await p.close();
});

test("PDV só para consulta: avisa em vez de oferecer 'Iniciar venda'", async () => {
  const p = await app.novaPagina(1280);
  await p.evaluate(async () => {
    await (await window.__db).exec(`update papeis set permissoes = permissoes || '{"venda":"visualizar"}'::jsonb where id = 'caixa'`);
  });
  await entrar(p, "caixa@teste.com");
  await p.getByRole("button", { name: "Venda (PDV)", exact: true }).first().click();
  await p.getByText(/Seu perfil só pode visualizar a Venda/).waitFor();
  assert.equal(await p.getByRole("button", { name: /Iniciar venda/ }).count(), 0);
  await p.close();
});

test("Início: os atalhos 'Novo...' só aparecem para o que a pessoa pode editar", async () => {
  const p = await app.novaPagina(1280);
  await p.evaluate(async () => {
    await (await window.__db).exec(`update papeis set permissoes = permissoes || '{"venda":"editar","financeiro":"editar"}'::jsonb where id = 'caixa'`);
  });
  await entrar(p, "caixa@teste.com");
  await p.getByText("Ações rápidas").waitFor();
  const rotulos = await p.locator("main button").allInnerTexts();
  assert.ok(rotulos.some((t) => /Nova venda/.test(t)));
  assert.ok(rotulos.some((t) => /Novo lançamento/.test(t)));
  for (const proibido of [/Novo cliente/, /Novo fornecedor/, /Novo pedido/, /Novo produto/, /Movimentar estoque/]) {
    assert.ok(!rotulos.some((t) => proibido.test(t)), `não deve ter ${proibido}`);
  }
  await p.close();
});
