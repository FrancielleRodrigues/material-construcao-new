// Substitui src/lib/supabase.js nos testes e2e: o app roda no navegador falando com um
// Postgres de verdade (PGlite) que recebeu a MESMA migração do Supabase, com RLS e funções.
// Implementa só o trecho da API do supabase-js que o app usa.
import { PGlite } from "@electric-sql/pglite";
import migracao from "../supabase/migrations/20261005000000_schema_inicial.sql?raw";
import semente from "./semente.sql?raw";

export const supabaseConfigurado = true;

const STUB = `
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.jwt() to anon, authenticated;
`;

const PARSERS = { 20: (v) => Number(v), 1700: (v) => Number(v), 1082: (v) => v, 1114: (v) => v, 1184: (v) => v };
const SENHA = "senha123";

let emailAtual = null; // usuário logado (JWT simulado)
const ouvintes = new Set();
const pronto = (async () => {
  const db = new PGlite();
  await db.exec(STUB);
  await db.exec(migracao);
  await db.exec(semente);
  return db;
})();
window.__db = pronto; // para os testes inspecionarem o banco

const q = (s) => `"${String(s).replace(/"/g, '""')}"`;

async function executar(sql, params = []) {
  const db = await pronto;
  const claims = JSON.stringify(emailAtual ? { email: emailAtual, role: "authenticated" } : {});
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

export const supabase = {
  from: (tabela) => new Consulta(tabela),

  async rpc(nome, args = {}) {
    try {
      const chaves = Object.keys(args);
      const params = chaves.map((c) => (args[c] !== null && typeof args[c] === "object" ? JSON.stringify(args[c]) : args[c]));
      const lista = chaves.map((c, i) => `${q(c)} => $${i + 1}${args[c] !== null && typeof args[c] === "object" ? "::jsonb" : ""}`).join(", ");
      const r = await executar(`select ${q(nome)}(${lista}) as r`, params);
      return { data: r.rows[0]?.r ?? null, error: null };
    } catch (e) {
      return { data: null, error: paraErro(e) };
    }
  },

  auth: {
    async getSession() {
      return { data: { session: emailAtual ? { user: { id: emailAtual, email: emailAtual } } : null } };
    },
    onAuthStateChange(cb) {
      ouvintes.add(cb);
      return { data: { subscription: { unsubscribe: () => ouvintes.delete(cb) } } };
    },
    async signInWithPassword({ email, password }) {
      await pronto;
      if (password !== SENHA) return { error: { message: "Invalid login credentials" } };
      emailAtual = email;
      ouvintes.forEach((cb) => cb("SIGNED_IN", { user: { id: email, email } }));
      return { error: null };
    },
    async signOut() {
      emailAtual = null;
      ouvintes.forEach((cb) => cb("SIGNED_OUT", null));
      return { error: null };
    },
  },
};
