// Substitui src/lib/supabase.js nos testes e2e: o app roda no navegador falando com um
// Postgres de verdade (PGlite) que recebeu a MESMA migração do Supabase, com RLS e funções.
// Implementa só o trecho da API do supabase-js que o app usa.
import { PGlite } from "@electric-sql/pglite";
// todas as migrações, em ordem de nome (as mesmas que vão para o Supabase)
const migracoes = import.meta.glob("../supabase/migrations/*.sql", { query: "?raw", import: "default", eager: true });
const migracao = Object.keys(migracoes).sort().map((k) => migracoes[k]).join("\n");
import semente from "./semente.sql?raw";

export const supabaseConfigurado = true;
export const variaveisFaltando = [];

const STUB = `
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, email_confirmed_at timestamptz);
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', ''), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.jwt(), auth.uid() to anon, authenticated;
`;

const PARSERS = { 20: (v) => Number(v), 1700: (v) => Number(v), 1082: (v) => v, 1114: (v) => v, 1184: (v) => v };
const SENHA = "senha123";
const senhas = {}; // senhas trocadas durante o teste (e-mail em minúsculas → senha)
const metadados = {}; // user_metadata de cada login (e-mail em minúsculas → objeto), ex.: { trocar_senha: true }

let emailAtual = null; // usuário logado (JWT simulado)
let uidAtual = null;
const ouvintes = new Set();
const pronto = (async () => {
  const db = new PGlite();
  await db.exec(STUB);
  await db.exec(migracao);
  await db.exec(semente);
  // logins confirmados dos usuários de teste (o gatilho liga cada um ao seu cadastro)
  await db.exec(`insert into auth.users (email, email_confirmed_at)
    select email, now() from public.usuarios`);
  return db;
})();
window.__db = pronto; // para os testes inspecionarem o banco
window.__fake = {
  emailsEnviados: [],
  falharAcesso: "", // texto: faz a "função" definir-acesso falhar (para testar a mensagem de erro)
  // Simula o clique no link do e-mail: o Supabase abre uma sessão e avisa PASSWORD_RECOVERY.
  async clicarLinkRecuperacao(email) {
    const db = await pronto;
    let r = await db.query("select id from auth.users where lower(email) = lower($1)", [email]);
    if (!r.rows.length) r = await db.query("insert into auth.users (email, email_confirmed_at) values ($1, now()) returning id", [email]);
    emailAtual = email;
    uidAtual = r.rows[0].id;
    const sessao = { user: { id: uidAtual, email } };
    ouvintes.forEach((cb) => cb("PASSWORD_RECOVERY", sessao));
    ouvintes.forEach((cb) => cb("SIGNED_IN", sessao));
  },
};

// usuário da sessão, como o Supabase devolve (inclui o user_metadata)
function usuarioAtual() {
  return { id: uidAtual, email: emailAtual, user_metadata: metadados[emailAtual.toLowerCase()] || {} };
}

const q = (s) => `"${String(s).replace(/"/g, '""')}"`;

async function executar(sql, params = []) {
  const db = await pronto;
  const claims = JSON.stringify(emailAtual ? { email: emailAtual, sub: uidAtual, role: "authenticated" } : {});
  await db.exec(`reset role; select set_config('request.jwt.claims', '${claims.replace(/'/g, "''")}', false); set role ${emailAtual ? "authenticated" : "anon"};`);
  try {
    return await db.query(sql, params, { parsers: PARSERS });
  } finally {
    await db.exec("reset role;");
  }
}

function paraErro(e) {
  return { message: e.message, code: e.code, details: e.detail || null, hint: e.hint || null };
}

class Consulta {
  constructor(tabela) {
    this.tabela = tabela; this.op = "select"; this.dados = null; this.filtros = []; this.ordem = null;
    this.faixa = null; this.retorna = false; this.formato = "lista";
  }
  select() { this.retorna = true; return this; }
  insert(d) { this.op = "insert"; this.dados = d; return this; }
  update(d) { this.op = "update"; this.dados = d; return this; }
  delete() { this.op = "delete"; return this; }
  eq(col, val) { this.filtros.push([col, val]); return this; }
  order(col, { ascending = true } = {}) { this.ordem = [col, ascending]; return this; }
  range(a, b) { this.faixa = [a, b]; return this; }
  single() { this.formato = "single"; return this; }
  maybeSingle() { this.formato = "maybe"; return this; }

  sql() {
    const params = [];
    const p = (v) => { params.push(v !== null && typeof v === "object" ? JSON.stringify(v) : v); return `$${params.length}`; };
    const onde = this.filtros.length ? " where " + this.filtros.map(([c, v]) => `${q(c)} = ${p(v)}`).join(" and ") : "";
    const ret = this.retorna ? " returning *" : "";
    let sql;
    if (this.op === "select") {
      sql = `select * from ${q(this.tabela)}${onde}`;
      if (this.ordem) sql += ` order by ${q(this.ordem[0])} ${this.ordem[1] ? "asc" : "desc"}`;
      if (this.faixa) sql += ` limit ${this.faixa[1] - this.faixa[0] + 1} offset ${this.faixa[0]}`;
    } else if (this.op === "insert") {
      const cols = Object.keys(this.dados);
      sql = `insert into ${q(this.tabela)} (${cols.map(q).join(", ")}) values (${cols.map((c) => `${p(this.dados[c])}`).join(", ")})${ret}`;
    } else if (this.op === "update") {
      const cols = Object.keys(this.dados);
      sql = `update ${q(this.tabela)} set ${cols.map((c) => `${q(c)} = ${p(this.dados[c])}`).join(", ")}${onde}${ret}`;
    } else {
      sql = `delete from ${q(this.tabela)}${onde}${ret}`;
    }
    return { sql, params };
  }

  async executar() {
    try {
      const { sql, params } = this.sql();
      const r = await executar(sql, params);
      let data = this.op === "select" || this.retorna ? r.rows : null;
      if (this.formato === "single") {
        if (!data || data.length !== 1) return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" } };
        data = data[0];
      } else if (this.formato === "maybe") {
        data = data && data.length ? data[0] : null;
      }
      return { data, error: null };
    } catch (e) {
      return { data: null, error: paraErro(e) };
    }
  }
  then(ok, falha) { return this.executar().then(ok, falha); }
}

// Chamada de função (rpc). Funções que devolvem várias linhas aceitam .range(), como no PostgREST;
// funções que devolvem um valor (ou nada) respondem com o valor.
class ConsultaRpc {
  constructor(nome, args) {
    this.nome = nome;
    this.args = args;
    this.faixa = null;
  }

  range(a, b) {
    this.faixa = [a, b];
    return this;
  }

  async executar() {
    try {
      const chaves = Object.keys(this.args);
      const ehObjeto = (v) => v !== null && typeof v === "object";
      const params = chaves.map((c) => (ehObjeto(this.args[c]) ? JSON.stringify(this.args[c]) : this.args[c]));
      const lista = chaves.map((c, i) => `${q(c)} => $${i + 1}${ehObjeto(this.args[c]) ? "::jsonb" : ""}`).join(", ");
      const db = await pronto;
      const meta = await db.query("select proretset from pg_proc where proname = $1 limit 1", [this.nome]);
      const devolveLinhas = Boolean(meta.rows[0]?.proretset);
      const chamada = `${q(this.nome)}(${lista})`;
      let sql = devolveLinhas ? `select * from ${chamada}` : `select ${chamada} as r`;
      if (devolveLinhas && this.faixa) sql += ` limit ${this.faixa[1] - this.faixa[0] + 1} offset ${this.faixa[0]}`;
      const r = await executar(sql, params);
      return { data: devolveLinhas ? r.rows : (r.rows[0]?.r ?? null), error: null };
    } catch (e) {
      return { data: null, error: paraErro(e) };
    }
  }

  then(ok, falha) {
    return this.executar().then(ok, falha);
  }
}

// Imita a Edge Function "definir-acesso" (supabase/functions/definir-acesso/index.ts) com as mesmas
// regras: só quem está logado, ativo e com "usuarios: editar" cria/redefine o login de alguém já
// cadastrado em Usuários, com senha provisória (12 a 72 caracteres) e a marca trocar_senha.
async function definirAcesso(corpo) {
  if (window.__fake.falharAcesso) return { data: null, error: { message: "Edge Function returned a non-2xx status code", context: { json: async () => ({ erro: window.__fake.falharAcesso }), status: 500 } } };
  const falha = (erro, status) => ({ data: null, error: { message: "Edge Function returned a non-2xx status code", context: { json: async () => ({ erro }), status } } });
  if (!emailAtual) return falha("Faça login para continuar.", 401);
  const db = await pronto;
  const eu = (await db.query("select u.ativo, p.permissoes->>'usuarios' as nivel from usuarios u join papeis p on p.id = u.papel_id where u.auth_id = $1", [uidAtual])).rows[0];
  if (!eu?.ativo) return falha("Seu usuário não tem acesso ao sistema.", 403);
  if (eu.nivel !== "editar") return falha("Você não tem permissão para gerenciar usuários.", 403);
  const email = String(corpo?.email ?? "").trim().toLowerCase();
  const senha = String(corpo?.senha ?? "");
  if (!/^\S+@\S+\.\S+$/.test(email)) return falha("E-mail inválido.", 400);
  if (senha.length < 12 || senha.length > 72) return falha("A senha provisória deve ter de 12 a 72 caracteres.", 400);
  const alvo = (await db.query("select id from usuarios where lower(btrim(email)) = $1", [email])).rows[0];
  if (!alvo) return falha("Esse e-mail não está cadastrado em Usuários. Cadastre a pessoa primeiro.", 404);
  const existente = (await db.query("select id from auth.users where lower(email) = $1", [email])).rows[0];
  if (existente) {
    await db.query("update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = $1", [existente.id]);
  } else {
    await db.query("insert into auth.users (email, email_confirmed_at) values ($1, now())", [email]);
  }
  senhas[email] = senha;
  metadados[email] = { ...metadados[email], trocar_senha: true };
  return { data: { ok: true, criado: !existente }, error: null };
}

export const supabase = {
  from: (tabela) => new Consulta(tabela),

  functions: {
    async invoke(nome, { body } = {}) {
      if (nome !== "definir-acesso") return { data: null, error: { message: "Requested function was not found", context: { json: async () => ({}), status: 404 } } };
      return definirAcesso(body);
    },
  },

  rpc: (nome, args = {}) => new ConsultaRpc(nome, args),

  auth: {
    async getSession() {
      return { data: { session: emailAtual ? { user: usuarioAtual() } : null } };
    },
    onAuthStateChange(cb) {
      ouvintes.add(cb);
      return { data: { subscription: { unsubscribe: () => ouvintes.delete(cb) } } };
    },
    async signInWithPassword({ email, password }) {
      await pronto;
      if (password !== (senhas[email.toLowerCase()] ?? SENHA)) return { error: { message: "Invalid login credentials" } };
      const db = await pronto;
      // e-mail sem cadastro no sistema também consegue logar (cria o login): deve cair em "Sem acesso"
      let r = await db.query("select id from auth.users where lower(email) = lower($1)", [email]);
      if (!r.rows.length) r = await db.query("insert into auth.users (email, email_confirmed_at) values ($1, now()) returning id", [email]);
      emailAtual = email;
      uidAtual = r.rows[0].id;
      ouvintes.forEach((cb) => cb("SIGNED_IN", { user: usuarioAtual() }));
      return { error: null };
    },
    // "Esqueci minha senha": guarda o pedido (o teste confere) e responde igual exista o e-mail ou não.
    async resetPasswordForEmail(email, opcoes) {
      window.__fake.emailsEnviados.push({ email, redirectTo: opcoes?.redirectTo });
      return { data: {}, error: null };
    },
    async updateUser({ password, data }) {
      if (!emailAtual) return { data: null, error: { message: "Auth session missing!", code: "session_not_found" } };
      if (password === (senhas[emailAtual.toLowerCase()] ?? SENHA)) {
        return { data: null, error: { message: "New password should be different from the old password.", code: "same_password" } };
      }
      if (password) senhas[emailAtual.toLowerCase()] = password;
      if (data) metadados[emailAtual.toLowerCase()] = { ...metadados[emailAtual.toLowerCase()], ...data };
      return { data: { user: usuarioAtual() }, error: null };
    },
    async signOut() {
      emailAtual = null;
      uidAtual = null;
      ouvintes.forEach((cb) => cb("SIGNED_OUT", null));
      return { error: null };
    },
  },
};
