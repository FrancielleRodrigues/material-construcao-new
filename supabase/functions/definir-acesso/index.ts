// Edge Function "definir-acesso": cria (ou redefine) o LOGIN de um usuário já cadastrado em Usuários,
// com uma senha provisória que a pessoa é obrigada a trocar no primeiro acesso. Regras e segurança em
// logica.ts. Aqui só ligamos aos clientes do Supabase (a chave de administrador é injetada pelo Supabase
// na função e NUNCA vai para o navegador).
import { createClient } from "npm:@supabase/supabase-js@2";
import { tratar } from "./logica.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const servico = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const semSessao = { persistSession: false, autoRefreshToken: false };

Deno.serve((req: Request) =>
  tratar(req, {
    criarChamador: (cabecalho) => createClient(url, anon, { global: { headers: { Authorization: cabecalho } }, auth: semSessao }),
    criarAdmin: () => createClient(url, servico, { auth: semSessao }),
  })
);
