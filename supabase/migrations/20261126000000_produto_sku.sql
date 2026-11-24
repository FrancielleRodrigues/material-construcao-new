-- SKU do produto: segundo código para localizar o produto (além do código de barras).
-- Os dois são opcionais no banco; o cadastro exige pelo menos um. Cada código é único e um
-- código não pode ser, ao mesmo tempo, SKU de um produto e código de barras de outro
-- (a busca do PDV não ficaria ambígua).

alter table public.produtos add column sku text;

create unique index produtos_sku_uniq on public.produtos (upper(btrim(sku))) where sku is not null and btrim(sku) <> '';

create or replace function private.produto_codigos_unicos() returns trigger
language plpgsql set search_path = public, pg_catalog as $$
begin
  if new.sku is not null and btrim(new.sku) <> '' and exists (
    select 1 from public.produtos p where p.id <> new.id and upper(btrim(p.codigo_barras)) = upper(btrim(new.sku))
  ) then
    raise exception 'O SKU "%" já é o código de barras de outro produto.', new.sku using errcode = '23505';
  end if;
  if new.codigo_barras is not null and btrim(new.codigo_barras) <> '' and exists (
    select 1 from public.produtos p where p.id <> new.id and upper(btrim(p.sku)) = upper(btrim(new.codigo_barras))
  ) then
    raise exception 'O código de barras "%" já é o SKU de outro produto.', new.codigo_barras using errcode = '23505';
  end if;
  return new;
end $$;

create trigger produtos_codigos_unicos before insert or update of sku, codigo_barras on public.produtos
  for each row execute function private.produto_codigos_unicos();

revoke all on function private.produto_codigos_unicos() from public, anon, authenticated;
