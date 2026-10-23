-- Aviso "Function Search Path Mutable" do Supabase: fixa o search_path das funções simples
-- (as SECURITY DEFINER já nascem com `set search_path = public`).
alter function public.hoje() set search_path = pg_catalog, public;
alter function public.permissoes_validas(jsonb) set search_path = pg_catalog, public;
alter function public.trg_papel_fixo() set search_path = pg_catalog, public;
