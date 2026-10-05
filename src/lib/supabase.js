import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigurado = Boolean(url && chave);

// A chave "publishable" pode ficar no navegador: quem protege os dados é o RLS do banco.
// NUNCA coloque aqui a chave "secret"/"service_role".
export const supabase = supabaseConfigurado ? createClient(url, chave) : null;
