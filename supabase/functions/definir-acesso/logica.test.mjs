// Testa as regras da função "definir-acesso" (permissão, validação, criar x redefinir) com clientes
// simulados do Supabase. Rodar: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { tratar } from "./logica.ts";

const SENHA = "Provisoria-Teste-1";

function montar({ logado = "uid-admin", tokenValido = true, usuarios, papeis, authUsers = [], erroUsuarios = false, erroCriar = null } = {}) {
  const chamadas = { criar: [], atualizar: [], listar: 0 };
  const dadosUsuarios = usuarios ?? [
    { id: 1, email: "admin@x.com", auth_id: "uid-admin", ativo: true, papel_id: "admin" },
    { id: 2, email: "Joana@Teste.com", auth_id: null, ativo: true, papel_id: "vendedor" },
    { id: 3, email: "maria@teste.com", auth_id: "uid-maria", ativo: true, papel_id: "vendedor" },
  ];
  const dadosPapeis = papeis ?? [
    { id: "admin", permissoes: { usuarios: "editar" } },
    { id: "vendedor", permissoes: { usuarios: "nenhum" } },
    { id: "gerente", permissoes: { usuarios: "visualizar" } },
  ];
  // construtor mínimo de consulta: select().eq().maybeSingle() ou await direto
  const consulta = (linhas, comErro = false) => {
    let filtradas = linhas;
    const b = {
      select: () => b,
      eq: (col, val) => { filtradas = filtradas.filter((l) => l[col] === val); return b; },
      maybeSingle: async () => ({ data: filtradas[0] ?? null, error: null }),
      then: (ok, falha) => Promise.resolve(comErro ? { data: null, error: { message: "boom" } } : { data: filtradas, error: null }).then(ok, falha),
    };
    return b;
  };
  const ambiente = {
    criarChamador: () => ({
      auth: { getUser: async () => (tokenValido && logado ? { data: { user: { id: logado } }, error: null } : { data: { user: null }, error: { message: "invalid" } }) },
      from: (t) => consulta(t === "usuarios" ? dadosUsuarios.map((u) => ({ ativo: u.ativo, papel_id: u.papel_id, auth_id: u.auth_id })) : dadosPapeis),
    }),
    criarAdmin: () => ({
      from: () => consulta(dadosUsuarios, erroUsuarios),
      auth: {
        admin: {
          listUsers: async () => { chamadas.listar++; return { data: { users: authUsers }, error: null }; },
          updateUserById: async (id, attrs) => { chamadas.atualizar.push({ id, attrs }); return { data: {}, error: null }; },
          createUser: async (attrs) => { chamadas.criar.push(attrs); return erroCriar ? { data: null, error: { message: erroCriar } } : { data: { user: { id: "novo" } }, error: null }; },
        },
      },
    }),
  };
  return { ambiente, chamadas };
}

const pedido = (corpo, { metodo = "POST", auth = "Bearer token" } = {}) =>
  new Request("http://funcao/definir-acesso", {
    method: metodo,
    headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) },
    body: metodo === "POST" ? JSON.stringify(corpo) : undefined,
  });

test("CORS: o navegador consegue chamar (OPTIONS) e outros métodos são recusados", async () => {
  const { ambiente } = montar();
  const op = await tratar(pedido(null, { metodo: "OPTIONS" }), ambiente);
  assert.equal(op.status, 200);
  assert.match(op.headers.get("Access-Control-Allow-Headers"), /authorization/);
  assert.equal((await tratar(pedido(null, { metodo: "GET" }), ambiente)).status, 405);
});

test("sem login ou com sessão inválida: 401 e nada é criado", async () => {
  const sem = montar();
  assert.equal((await tratar(pedido({ email: "joana@teste.com", senha: SENHA }, { auth: "" }), sem.ambiente)).status, 401);
  const invalido = montar({ tokenValido: false });
  assert.equal((await tratar(pedido({ email: "joana@teste.com", senha: SENHA }), invalido.ambiente)).status, 401);
  for (const m of [sem, invalido]) assert.deepEqual([m.chamadas.criar.length, m.chamadas.atualizar.length], [0, 0]);
});

test("quem não é usuário ativo ou não edita Usuários leva 403 e nada é criado", async () => {
  const cenarios = {
    "usuário inativo": montar({ usuarios: [{ id: 1, email: "a@x.com", auth_id: "uid-admin", ativo: false, papel_id: "admin" }] }),
    "sem cadastro": montar({ logado: "uid-fantasma" }),
    "papel sem permissão": montar({ logado: "uid-maria" }),
    "só visualiza": montar({
      usuarios: [{ id: 1, email: "g@x.com", auth_id: "uid-admin", ativo: true, papel_id: "gerente" }],
    }),
  };
  for (const [nome, m] of Object.entries(cenarios)) {
    const r = await tratar(pedido({ email: "joana@teste.com", senha: SENHA }), m.ambiente);
    assert.equal(r.status, 403, nome);
    assert.deepEqual([m.chamadas.criar.length, m.chamadas.atualizar.length], [0, 0], nome);
  }
});

test("valida e-mail e tamanho da senha (12 a 72)", async () => {
  const { ambiente, chamadas } = montar();
  for (const corpo of [{ email: "sem-arroba", senha: SENHA }, { email: "", senha: SENHA }, {}]) {
    assert.equal((await tratar(pedido(corpo), ambiente)).status, 400);
  }
  const curta = await tratar(pedido({ email: "joana@teste.com", senha: "curta123" }), ambiente);
  assert.equal(curta.status, 400);
  assert.match((await curta.json()).erro, /12 a 72/);
  assert.equal((await tratar(pedido({ email: "joana@teste.com", senha: "x".repeat(73) }), ambiente)).status, 400);
  assert.equal((await tratar(new Request("http://f/", { method: "POST", headers: { Authorization: "Bearer t" }, body: "{não é json" }), ambiente)).status, 400);
  assert.deepEqual([chamadas.criar.length, chamadas.atualizar.length], [0, 0]);
});

test("só cria login para e-mail já cadastrado em Usuários", async () => {
  const { ambiente, chamadas } = montar();
  const r = await tratar(pedido({ email: "estranho@teste.com", senha: SENHA }), ambiente);
  assert.equal(r.status, 404);
  assert.match((await r.json()).erro, /não está cadastrado em Usuários/);
  assert.equal(chamadas.criar.length, 0);
});

test("cria o login com e-mail confirmado, senha provisória e a marca trocar_senha (e-mail sem diferenciar maiúsculas)", async () => {
  const { ambiente, chamadas } = montar();
  const r = await tratar(pedido({ email: "  JOANA@teste.COM ", senha: SENHA }), ambiente);
  assert.equal(r.status, 200);
  const texto = await r.text();
  assert.deepEqual(JSON.parse(texto), { ok: true, criado: true });
  assert.ok(!texto.includes(SENHA), "a senha nunca volta na resposta");
  assert.deepEqual(chamadas.criar, [{ email: "joana@teste.com", password: SENHA, email_confirm: true, user_metadata: { trocar_senha: true } }]);
  assert.equal(chamadas.atualizar.length, 0);
});

test("quem já tem login só tem a senha redefinida (por auth_id ou achado no Auth)", async () => {
  const porVinculo = montar();
  const r1 = await tratar(pedido({ email: "maria@teste.com", senha: SENHA }), porVinculo.ambiente);
  assert.deepEqual(await r1.json(), { ok: true, criado: false });
  assert.deepEqual(porVinculo.chamadas.atualizar, [{ id: "uid-maria", attrs: { password: SENHA, email_confirm: true, user_metadata: { trocar_senha: true } } }]);
  assert.equal(porVinculo.chamadas.criar.length, 0);
  assert.equal(porVinculo.chamadas.listar, 0, "com auth_id não precisa listar o Auth");

  // cadastro sem auth_id, mas o login já existe (e-mail ainda não confirmado, por exemplo)
  const porBusca = montar({ authUsers: [{ id: "uid-joana", email: "JOANA@teste.com" }] });
  const r2 = await tratar(pedido({ email: "joana@teste.com", senha: SENHA }), porBusca.ambiente);
  assert.deepEqual(await r2.json(), { ok: true, criado: false });
  assert.equal(porBusca.chamadas.atualizar[0].id, "uid-joana");
  assert.equal(porBusca.chamadas.criar.length, 0);
});

test("erros do Auth viram mensagem em português e a senha não vai para o log", async () => {
  const logs = [];
  const original = console.error;
  console.error = (...a) => logs.push(a.join(" "));
  try {
    const fraca = montar({ erroCriar: "Password is known to be weak and easy to guess" });
    const r = await tratar(pedido({ email: "joana@teste.com", senha: SENHA }), fraca.ambiente);
    assert.equal(r.status, 400);
    assert.match((await r.json()).erro, /fraca ou já apareceu em vazamentos/);
    const outra = montar({ erroCriar: "database exploded" });
    const r2 = await tratar(pedido({ email: "joana@teste.com", senha: SENHA }), outra.ambiente);
    assert.match((await r2.json()).erro, /Não foi possível definir o acesso/);
    const semLista = montar({ erroUsuarios: true });
    assert.equal((await tratar(pedido({ email: "joana@teste.com", senha: SENHA }), semLista.ambiente)).status, 500);
  } finally {
    console.error = original;
  }
  assert.ok(logs.length >= 2);
  assert.ok(logs.every((l) => !l.includes(SENHA)), "nenhum log contém a senha");
});
