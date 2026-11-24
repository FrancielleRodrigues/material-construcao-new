// Utilidades compartilhadas pelos testes do banco: cria um Postgres local (PGlite) com as
// migrações e simula o login do Supabase (JWT com sub = auth.uid()).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";

const dir = path.dirname(fileURLToPath(import.meta.url));
const pasta = path.join(dir, "../migrations");
const migracoes = fs.readdirSync(pasta).filter((f) => f.endsWith(".sql")).sort()
  .map((f) => fs.readFileSync(path.join(pasta, f), "utf8")).join("\n");

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

export async function criarBanco() {
  const db = new PGlite();
  await db.exec(STUB);
  await db.exec(migracoes);
  const q = async (sql, params) => (await db.query(sql, params)).rows;
  async function comJwt(claims, fn, role = "authenticated") {
    await db.exec(`reset role; select set_config('request.jwt.claims', '${JSON.stringify(claims).replace(/'/g, "''")}', false); set role ${role};`);
    try { return await fn(); } finally { await db.exec("reset role;"); }
  }
  async function como(email, fn, role = "authenticated") {
    const r = await db.query("select id from auth.users where lower(email) = lower($1)", [email]);
    const sub = r.rows[0]?.id ?? "00000000-0000-0000-0000-00000000dead";
    return comJwt({ email, sub, role: "authenticated" }, fn, role);
  }
  const erro = async (promessa, trecho) => {
    await assert.rejects(promessa, (e) => (trecho ? new RegExp(trecho, "i").test(e.message) : true), `esperava erro${trecho ? ` /${trecho}/` : ""}`);
  };
  return { db, q, como, comJwt, erro };
}
