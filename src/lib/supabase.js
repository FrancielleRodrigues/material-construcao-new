import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigurado = Boolean(url && chave);

// Nomes (nunca valores) das variáveis que não chegaram ao site. Ajuda a achar erro de digitação.
export const variaveisFaltando = [
  ...(url ? [] : ["VITE_SUPABASE_URL"]),
  ...(chave ? [] : ["VITE_SUPABASE_PUBLISHABLE_KEY"]),
];

// A chave "publishable" pode ficar no navegador: quem protege os dados é o RLS do banco.
// NUNCA coloque aqui a chave "secret"/"service_role".
export const supabase = supabaseConfigurado ? createClient(url, chave) : null;
