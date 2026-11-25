-- Dados que o comprovante/cupom de venda precisa mostrar:
--  * endereço e telefone da empresa (como no cabeçalho de um DANFE NFC-e);
--  * hora da venda (o campo `data` guarda só o dia). Vendas antigas ficam sem hora (null).
alter table public.empresa_fiscal add column endereco jsonb not null default '{}'::jsonb;
alter table public.empresa_fiscal add column telefone text not null default '';

alter table public.vendas add column criada_em timestamptz;
alter table public.vendas alter column criada_em set default now();
