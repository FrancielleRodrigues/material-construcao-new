-- CPF (11) ou CNPJ (14): o banco confere o tamanho do documento, não só a tela.
-- NOT VALID: vale para toda gravação nova ou alterada, sem reprovar cadastros antigos já existentes
-- (quem editar um cadastro antigo com documento fora do padrão precisa corrigi-lo).
alter table public.clientes
  add constraint clientes_documento_tamanho check (length(regexp_replace(documento, '\D', '', 'g')) in (11, 14)) not valid;
alter table public.fornecedores
  add constraint fornecedores_documento_tamanho check (length(regexp_replace(documento, '\D', '', 'g')) in (11, 14)) not valid;
