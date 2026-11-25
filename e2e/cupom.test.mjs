// Cupom de venda no formato de DANFE NFC-e (bobina de 80 mm), mas sempre SEM validade fiscal.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { iniciar, entrar, exec } from "./ajuda.mjs";

let app;
before(async () => { app = await iniciar({ porta: 5189 }); });
after(async () => {
  await app.encerrar();
  assert.deepEqual(app.erros, [], "erros no console/página durante os testes");
});

async function vender(email) {
  const p = await app.novaPagina(1280);
  // empresa configurada e um SKU no produto, antes do login (as listas são lidas ao entrar)
  await exec(p, `
    update empresa_fiscal set razao_social = 'Construgestao Materiais Ltda', nome_fantasia = 'Construgestao',
      cnpj = '11.222.333/0001-81', telefone = '(27) 3333-4455',
      endereco = '{"logradouro":"Rua Luciano das Neves","numero":"2418","bairro":"Divino Espirito Santo","cidade":"Vila Velha","uf":"ES"}'::jsonb;
    update produtos set sku = 'CIM-50' where id = 1;`);
  await entrar(p, email);
  await p.getByText("Clientes cadastrados").or(p.getByText("Venda (PDV)")).first().waitFor({ timeout: 40000 });
  await p.getByRole("button", { name: "Venda (PDV)", exact: true }).first().click();
  await p.getByRole("button", { name: /Iniciar venda/i }).click();
  await p.getByPlaceholder(/Digite o CPF/i).pressSequentially("12345678900");
  await p.getByRole("button", { name: "Continuar", exact: true }).click();
  await p.getByPlaceholder(/Bipe ou digite o código/i).fill("7891000100016");
  await p.keyboard.press("Enter");
  await p.getByRole("button", { name: "Aumentar" }).click(); // 2 × 34,90 = 69,80
  await p.getByRole("button", { name: "%", exact: true }).click();
  await p.locator('main input[placeholder="0"]').fill("10"); // 10% → 62,82
  await p.locator("main select").selectOption("dinheiro");
  await p.getByRole("button", { name: "Finalizar venda" }).click();
  await p.getByTestId("cupom-papel").first().waitFor({ timeout: 15000 });
  return p;
}

test("Cupom: layout do DANFE NFC-e com empresa, itens, totais, consumidor e aviso de que não tem validade fiscal", async () => {
  const p = await vender("vendedor@teste.com"); // vendedor não vê o módulo Fiscal, mas o cupom mostra a empresa
  const papel = p.getByTestId("cupom-papel").first();
  const texto = await papel.innerText();

  assert.match(texto, /SEM VALIDADE FISCAL/);
  assert.match(texto, /CONSTRUGESTAO/);
  assert.match(texto, /CNPJ: 11\.222\.333\/0001-81/);
  assert.match(texto, /Rua Luciano das Neves, 2418 - Divino Espirito Santo, Vila Velha - ES/);
  assert.match(texto, /Tel\.: \(27\) 3333-4455/);
  assert.match(texto, /COMPROVANTE DE VENDA/);
  assert.match(texto, /Rascunho de NFC-e: não emitido na SEFAZ/);
  assert.match(texto, /CIM-50 Cimento CP-II 50kg/, "código do produto + descrição");
  assert.match(texto, /2 SC x R\$\s?34,90/);
  assert.match(texto, /QTD\. TOTAL DE ITENS\s+2/);
  assert.match(texto, /VALOR TOTAL R\$\s+69,80/);
  assert.match(texto, /DESCONTO R\$ \(10%\)\s+-6,98/);
  assert.match(texto, /VALOR A PAGAR R\$\s+62,82/);
  assert.match(texto, /DINHEIRO\s+62,82/);
  assert.match(texto, /Venda nº 1002 · Rascunho NFC-e 1 Série 1/);
  assert.match(texto, /Emissão \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/, "data e hora da venda");
  assert.match(texto, /CONSUMIDOR CPF: 123\.456\.789-00/);
  assert.match(texto, /Chave de acesso: não emitida/);
  assert.match(texto, /NÃO substitui a nota fiscal/);
  assert.match(texto, /Operador: Marcos Vendas/);
  // nunca se apresenta como nota válida: nada de DANFE, protocolo ou QR Code de verdade
  assert.doesNotMatch(texto, /DOCUMENTO AUXILIAR DA NOTA FISCAL/i);
  assert.equal(await papel.locator("img, canvas, svg").count(), 0, "sem QR Code falso");
  await p.screenshot({ path: process.env.CUPOM_PNG || "/tmp/cupom-tela.png" });
  await p.close();
});

test("Cupom: ao imprimir some o sistema e sobra só o cupom em largura de bobina", async () => {
  const p = await vender("admin@teste.com");
  await p.emulateMedia({ media: "print" });
  assert.equal(await p.locator("#root").isVisible(), false, "o sistema não sai na impressão");
  const impressao = p.locator(".so-impressao");
  assert.equal(await impressao.isVisible(), true);
  assert.match(await impressao.innerText(), /SEM VALIDADE FISCAL/);
  const largura = await impressao.evaluate((el) => el.getBoundingClientRect().width);
  assert.ok(largura > 250 && largura < 320, `largura de bobina (74 mm ≈ 280 px), veio ${largura}`);
  await p.emulateMedia({ media: "screen" });
  assert.equal(await impressao.isVisible(), false, "na tela a cópia de impressão fica escondida");
  await p.close();
});

test("Fiscal: o endereço da empresa pode ser preenchido e é salvo", async () => {
  const p = await app.novaPagina(1280);
  await entrar(p, "admin@teste.com");
  await p.getByText("Clientes cadastrados").waitFor({ timeout: 40000 });
  await p.getByRole("button", { name: "Fiscal", exact: true }).first().click();
  await p.getByRole("button", { name: /Configuração|Config/ }).first().click();
  await p.getByPlaceholder("Número da IE").first().waitFor();
  await p.getByPlaceholder("Preenchido pelo CEP").first().fill("Av. do Teste");
  await p.getByPlaceholder("Ex: 1200").first().fill("77");
  await p.getByRole("button", { name: /Salvar/ }).first().click();
  await p.waitForFunction(async () => (await (await window.__db).query("select endereco->>'logradouro' l, endereco->>'numero' n from empresa_fiscal")).rows[0].l === "Av. do Teste");
  await p.close();
});
