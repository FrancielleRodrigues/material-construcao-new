// Criar usuário pelo sistema: o login nasce junto (senha provisória), a pessoa troca a senha no
// primeiro acesso e o administrador pode redefinir a senha de quem esqueceu.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { iniciar, entrar, sql } from "./ajuda.mjs";

let app;
before(async () => { app = await iniciar({ porta: 5183 }); });
after(async () => {
  await app.encerrar();
  assert.deepEqual(app.erros, [], "erros no console/página durante os testes");
});

async function logar(email = "admin@teste.com", senha = "senha123") {
  const p = await app.novaPagina(1280);
  await entrar(p, email, senha);
  await p.getByText("Clientes cadastrados").waitFor({ timeout: 40000 });
  return p;
}
const aba = (p, nome) => p.getByRole("button", { name: nome, exact: true }).first().click();
const um = async (p, consulta) => (await sql(p, consulta))[0];
async function sairDoSistema(p) {
  // botão do usuário no rodapé do menu lateral (o único que mostra nome e papel juntos)
  await p.locator("aside button").filter({ hasText: /Administrador|Vendedor|Gerente|Caixa/ }).last().click();
  await p.getByRole("button", { name: "Sair" }).click();
  await p.getByRole("button", { name: "Entrar" }).waitFor();
}
async function novoUsuario(p, { nome, email, papel = "Vendedor" }) {
  await aba(p, "Usuários");
  await p.getByRole("button", { name: /Novo usuário/ }).click();
  await p.getByPlaceholder("Nome completo").fill(nome);
  await p.getByPlaceholder("usuario@empresa.com").fill(email);
  await p.locator("select").first().selectOption({ label: papel });
}

test("Novo usuário: cria o cadastro e o login, mostra a senha uma vez e exige trocá-la no primeiro acesso", async () => {
  const p = await logar();
  await novoUsuario(p, { nome: "Joana Nova", email: "joana@teste.com" });
  const senha = await p.getByLabel("Senha provisória").inputValue();
  assert.match(senha, /^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/, "já vem uma senha provisória gerada");
  await p.getByRole("button", { name: "Salvar" }).click();

  await p.getByRole("heading", { name: "Acesso criado" }).waitFor({ timeout: 15000 });
  assert.equal(await p.getByTestId("acesso-email").innerText(), "joana@teste.com");
  assert.equal(await p.getByTestId("acesso-senha").innerText(), senha);
  await p.getByText("Esta senha não será mostrada de novo.").waitFor();
  await p.getByRole("button", { name: "Fechar", exact: true }).last().click();
  assert.deepEqual(await um(p, "select papel_id, auth_id is not null as tem_login from usuarios where email = 'joana@teste.com'"), { papel_id: "vendedor", tem_login: true });

  // primeiro acesso: entra com a provisória e é obrigada a criar a própria senha
  await sairDoSistema(p);
  await entrar(p, "joana@teste.com", senha);
  await p.getByRole("heading", { name: "Crie a sua senha" }).waitFor();
  const campos = p.locator('input[type="password"]');
  await campos.nth(0).fill("curta");
  await campos.nth(1).fill("curta");
  await p.getByRole("button", { name: "Salvar e entrar" }).click();
  await p.getByRole("alert").getByText("Use pelo menos 12 caracteres.").waitFor();
  await campos.nth(0).fill("minha-senha-bem-longa-1");
  await campos.nth(1).fill("outra-coisa-diferente-2");
  await p.getByRole("button", { name: "Salvar e entrar" }).click();
  await p.getByRole("alert").getByText("As duas senhas não são iguais.").waitFor();
  await campos.nth(1).fill("minha-senha-bem-longa-1");
  await p.getByRole("button", { name: "Salvar e entrar" }).click();
  await p.getByRole("button", { name: "Venda (PDV)", exact: true }).first().waitFor({ timeout: 30000 }); // entrou, como vendedora
  assert.equal(await p.getByRole("button", { name: "Usuários", exact: true }).count(), 0, "vendedora não vê Usuários");

  // depois disso: a provisória não vale mais e a nova entra direto, sem pedir troca de novo
  await sairDoSistema(p);
  await entrar(p, "joana@teste.com", senha);
  await p.getByRole("alert").getByText("E-mail ou senha incorretos.").waitFor();
  await p.locator('input[type="password"]').fill("minha-senha-bem-longa-1");
  await p.getByRole("button", { name: "Entrar" }).click();
  await p.getByRole("button", { name: "Venda (PDV)", exact: true }).first().waitFor({ timeout: 30000 });
  assert.equal(await p.getByRole("heading", { name: "Crie a sua senha" }).count(), 0);
  await p.close();
});

test("Novo usuário: senha curta e e-mail repetido não deixam nada pela metade", async () => {
  const p = await logar();
  const antes = (await um(p, "select count(*)::int n from usuarios")).n;
  const loginsAntes = (await um(p, "select count(*)::int n from auth.users")).n;
  await novoUsuario(p, { nome: "Sem Senha", email: "semsenha@teste.com" });
  await p.getByLabel("Senha provisória").fill("curta123");
  await p.getByRole("button", { name: "Salvar" }).click();
  await p.getByText("A senha provisória precisa ter pelo menos 12 caracteres.").waitFor();
  assert.equal((await um(p, "select count(*)::int n from usuarios")).n, antes, "nada foi salvo");

  await p.getByPlaceholder("usuario@empresa.com").fill("vendedor@teste.com"); // já existe
  await p.getByLabel("Senha provisória").fill("senha-provisoria-1");
  await p.getByRole("button", { name: "Salvar" }).click();
  await p.getByRole("alert").getByText("Já existe um usuário com este e-mail.").waitFor();
  assert.equal((await um(p, "select count(*)::int n from usuarios")).n, antes);
  assert.equal((await um(p, "select count(*)::int n from auth.users")).n, loginsAntes, "nenhum login criado");
  await p.close();
});

test("Se o login falhar, o cadastro fica e dá para tentar de novo pelo botão da chave", async () => {
  const p = await logar();
  await p.evaluate(() => { window.__fake.falharAcesso = "Não foi possível definir o acesso agora. Tente de novo em instantes."; });
  await novoUsuario(p, { nome: "Pedro Falha", email: "pedro@teste.com" });
  await p.getByRole("button", { name: "Salvar" }).click();
  await p.getByRole("alert").getByText(/O usuário foi cadastrado, mas o login não foi criado: Não foi possível definir o acesso agora/).waitFor();
  assert.deepEqual(await um(p, "select auth_id is not null as tem_login from usuarios where email = 'pedro@teste.com'"), { tem_login: false });
  await p.locator("main").getByText("Pedro Falha").waitFor(); // o cadastro está na lista

  // tenta de novo com a função funcionando
  await p.evaluate(() => { window.__fake.falharAcesso = ""; });
  await p.getByRole("button", { name: "Definir senha de Pedro Falha" }).click();
  await p.getByRole("button", { name: "Definir senha", exact: true }).click();
  await p.getByRole("heading", { name: "Acesso criado" }).waitFor();
  assert.equal((await um(p, "select auth_id is not null as tem_login from usuarios where email = 'pedro@teste.com'")).tem_login, true);
  await p.close();
});

test("Definir senha de quem esqueceu: troca a senha, invalida a antiga e exige nova troca", async () => {
  const p = await logar();
  await aba(p, "Usuários");
  await p.getByRole("button", { name: "Definir senha de Renata Caixa" }).click();
  await p.getByLabel("Senha provisória").fill("senha");
  await p.getByRole("button", { name: "Definir senha", exact: true }).click();
  await p.getByRole("alert").getByText("Use pelo menos 12 caracteres.").waitFor();
  await p.getByLabel("Senha provisória").fill("Provisoria-Renata-9");
  await p.getByRole("button", { name: "Definir senha", exact: true }).click();
  await p.getByRole("heading", { name: "Senha redefinida" }).waitFor();
  await p.getByTestId("acesso-senha").getByText("Provisoria-Renata-9").waitFor();
  await p.getByRole("button", { name: "Fechar", exact: true }).last().click();

  await sairDoSistema(p);
  await entrar(p, "caixa@teste.com", "senha123"); // a antiga
  await p.getByRole("alert").getByText("E-mail ou senha incorretos.").waitFor();
  await p.locator('input[type="password"]').fill("Provisoria-Renata-9");
  await p.getByRole("button", { name: "Entrar" }).click();
  await p.getByRole("heading", { name: "Crie a sua senha" }).waitFor();
  await p.close();
});

test("Quem não edita Usuários não vê o botão da chave", async () => {
  const p = await logar("caixa@teste.com");
  assert.equal(await p.getByRole("button", { name: "Usuários", exact: true }).count(), 0);
  await p.close();
});

test("Login: o olho mostra e oculta a senha digitada", async () => {
  const p = await app.novaPagina();
  await p.getByRole("button", { name: "Entrar" }).waitFor();
  const campo = p.locator("form input").nth(1);
  await campo.fill("segredo-123");
  assert.equal(await campo.getAttribute("type"), "password");
  await p.getByRole("button", { name: "Mostrar senha" }).click();
  assert.equal(await campo.getAttribute("type"), "text");
  assert.equal(await campo.inputValue(), "segredo-123");
  await p.getByRole("button", { name: "Ocultar senha" }).click();
  assert.equal(await campo.getAttribute("type"), "password");
  await p.close();
});
